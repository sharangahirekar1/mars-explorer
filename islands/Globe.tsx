import type { ComponentChildren } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  ATMOSPHERE_COMPOSITION,
  CATEGORY_META,
  DATA_SOURCES,
  DEFAULT_PLACES,
  MARS_PHYSICAL,
  MARS_TIME_ZONES,
  MINERALS,
  ORGANICS,
  type MarkerCategory,
  type Place,
} from "../data/marsData.ts";

const MARS_COLOR = "/textures/mars_color.jpg";
const MARS_BUMP = "/textures/mars_bump.jpg";

const MARS_RADIUS = 5;
const ROTATE_STEP = 0.15;
const STORAGE_KEY = "mars-globe-marked-places-v2";
const MARKER_RADIUS = 0.07;
const MARKER_HOVER_RADIUS = 0.11;

function loadPlaces(): Place[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLACES.map((p) => ({ ...p }));
    const parsed = JSON.parse(raw) as Place[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_PLACES.map((p) => ({ ...p }));
    }
    return parsed
      .filter(
        (p) =>
          p &&
          typeof p.id === "string" &&
          typeof p.name === "string" &&
          typeof p.lat === "number" &&
          typeof p.lon === "number",
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        notes: typeof p.notes === "string" ? p.notes : "",
        lat: p.lat,
        lon: p.lon,
        createdAt: typeof p.createdAt === "number" ? p.createdAt : Date.now(),
        category: (p.category && p.category in CATEGORY_META
          ? p.category
          : "custom") as MarkerCategory,
        agency: p.agency,
        elevationKm: p.elevationKm,
        status: p.status,
      }));
  } catch {
    return DEFAULT_PLACES.map((p) => ({ ...p }));
  }
}

function savePlaces(places: Place[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch {
    // ignore quota / private mode
  }
}

/** Lat/lon → local position on SphereGeometry (equirectangular UVs). */
function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.cos(theta) * Math.sin(phi);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(theta) * Math.sin(phi);
  return new THREE.Vector3(x, y, z);
}

function vec3ToLatLon(pos: THREE.Vector3): { lat: number; lon: number } {
  const n = pos.clone().normalize();
  const lat = 90 - Math.acos(THREE.MathUtils.clamp(n.y, -1, 1)) * (180 / Math.PI);
  let lon = Math.atan2(n.z, -n.x) * (180 / Math.PI) - 180;
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}

function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

function newId(): string {
  return `place-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createLatLonGrid(radius: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "latLonGrid";
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x88ccee,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const equatorMat = new THREE.LineBasicMaterial({
    color: 0xffdd66,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const primeMat = new THREE.LineBasicMaterial({
    color: 0xff8866,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });

  // Latitude parallels every 15°
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts: THREE.Vector3[] = [];
    for (let lon = -180; lon <= 180; lon += 3) {
      pts.push(latLonToVec3(lat, lon, radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(
      new THREE.Line(
        geo,
        lat === 0 ? equatorMat : lineMat,
      ),
    );
  }

  // Longitude meridians every 15°
  for (let lon = -180; lon < 180; lon += 15) {
    const pts: THREE.Vector3[] = [];
    for (let lat = -90; lat <= 90; lat += 3) {
      pts.push(latLonToVec3(lat, lon, radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(
      new THREE.Line(
        geo,
        lon === 0 ? primeMat : lineMat,
      ),
    );
  }

  return group;
}

function createTimeZoneBands(radius: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "timeZones";

  for (const tz of MARS_TIME_ZONES) {
    const midLon = (tz.lonWest + tz.lonEast) / 2;
    // Vertical band as translucent ribbon of meridians
    const pts: THREE.Vector3[] = [];
    for (let lat = -88; lat <= 88; lat += 4) {
      pts.push(latLonToVec3(lat, midLon, radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(tz.color),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.userData.tzId = tz.id;
    group.add(line);

    // Soft wedge mesh between lonWest and lonEast
    const segs = 12;
    const latSteps = 24;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= latSteps; i++) {
      const lat = -90 + (180 * i) / latSteps;
      for (let j = 0; j <= segs; j++) {
        const lon = tz.lonWest + ((tz.lonEast - tz.lonWest) * j) / segs;
        const v = latLonToVec3(lat, lon, radius);
        positions.push(v.x, v.y, v.z);
      }
    }
    for (let i = 0; i < latSteps; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * (segs + 1) + j;
        const b = a + 1;
        const c = a + (segs + 1);
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const meshGeo = new THREE.BufferGeometry();
    meshGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    meshGeo.setIndex(indices);
    meshGeo.computeVertexNormals();
    const meshMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(tz.color),
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(meshGeo, meshMat));
  }

  return group;
}

/** Elevation colormap shader: samples color + bump, tints by height. */
function createMarsMaterial(
  colorMap: THREE.Texture | null,
  bumpMap: THREE.Texture | null,
  elevationBlend: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColorMap: { value: colorMap },
      uBumpMap: { value: bumpMap },
      uHasColor: { value: colorMap ? 1 : 0 },
      uHasBump: { value: bumpMap ? 1 : 0 },
      uElevationBlend: { value: elevationBlend },
      uLightDir: { value: new THREE.Vector3(0.7, 0.3, 0.5).normalize() },
      uAmbient: { value: 0.35 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uColorMap;
      uniform sampler2D uBumpMap;
      uniform float uHasColor;
      uniform float uHasBump;
      uniform float uElevationBlend;
      uniform vec3 uLightDir;
      uniform float uAmbient;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      // MOLA-style elevation ramp: deep blue → cyan → green → yellow → red → white
      vec3 elevationColor(float h) {
        vec3 c0 = vec3(0.05, 0.08, 0.35); // deep basin
        vec3 c1 = vec3(0.10, 0.35, 0.55); // low plains
        vec3 c2 = vec3(0.20, 0.55, 0.35); // mid
        vec3 c3 = vec3(0.75, 0.70, 0.25); // highlands
        vec3 c4 = vec3(0.85, 0.35, 0.12); // volcanoes
        vec3 c5 = vec3(0.95, 0.95, 0.95); // peaks / ice
        if (h < 0.2) return mix(c0, c1, h / 0.2);
        if (h < 0.4) return mix(c1, c2, (h - 0.2) / 0.2);
        if (h < 0.6) return mix(c2, c3, (h - 0.4) / 0.2);
        if (h < 0.8) return mix(c3, c4, (h - 0.6) / 0.2);
        return mix(c4, c5, (h - 0.8) / 0.2);
      }

      void main() {
        vec3 base = vec3(0.55, 0.32, 0.18);
        if (uHasColor > 0.5) {
          base = texture2D(uColorMap, vUv).rgb;
        }
        float h = 0.5;
        if (uHasBump > 0.5) {
          h = texture2D(uBumpMap, vUv).r;
        }
        vec3 elev = elevationColor(h);
        vec3 albedo = mix(base, elev, clamp(uElevationBlend, 0.0, 1.0));
        // slight true-color residual so features remain readable
        albedo = mix(albedo, base * elev * 1.4, 0.15 * uElevationBlend);

        float ndl = max(dot(normalize(vNormal), normalize(uLightDir)), 0.0);
        float light = uAmbient + (1.0 - uAmbient) * ndl;
        // Fresnel rim for thin CO2 atmosphere feel
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(viewDir, normalize(vNormal)), 0.0), 3.0);
        vec3 color = albedo * light + vec3(1.0, 0.55, 0.35) * fresnel * 0.12;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

type GlobeApi = {
  flyTo: (lat: number, lon: number) => void;
  setMarkers: (places: Place[], selectedId: string | null) => void;
  setSelected: (id: string | null) => void;
  setGridVisible: (v: boolean) => void;
  setTimeZonesVisible: (v: boolean) => void;
  setElevationBlend: (v: number) => void;
};

type AccordionId =
  | "physical"
  | "atmosphere"
  | "missions"
  | "minerals"
  | "organics"
  | "timezones"
  | "sources";

const CATEGORY_FILTERS: Array<MarkerCategory | "all"> = [
  "all",
  "mission",
  "volcano",
  "crater",
  "mineral",
  "landmark",
  "pole",
  "custom",
];

export default function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const marsGroupRef = useRef<THREE.Group | null>(null);
  const apiRef = useRef<GlobeApi | null>(null);
  const placesRef = useRef<Place[]>([]);
  const selectedIdRef = useRef<string | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showTimeZones, setShowTimeZones] = useState(false);
  const [elevationBlend, setElevationBlend] = useState(0.72);
  const [categoryFilter, setCategoryFilter] = useState<MarkerCategory | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [openAccordions, setOpenAccordions] = useState<Set<AccordionId>>(
    () => new Set(["physical", "missions"]),
  );

  useEffect(() => {
    const loaded = loadPlaces();
    setPlaces(loaded);
    placesRef.current = loaded;
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    placesRef.current = places;
    savePlaces(places);
    apiRef.current?.setMarkers(places, selectedId);
  }, [places, selectedId, hydrated]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    apiRef.current?.setSelected(selectedId);
  }, [selectedId]);

  useEffect(() => {
    apiRef.current?.setGridVisible(showGrid);
  }, [showGrid]);

  useEffect(() => {
    apiRef.current?.setTimeZonesVisible(showTimeZones);
  }, [showTimeZones]);

  useEffect(() => {
    apiRef.current?.setElevationBlend(elevationBlend);
  }, [elevationBlend]);

  // --- Three.js scene ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050208);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.6;
    controls.panSpeed = 0.6;
    controls.zoomSpeed = 0.9;
    controls.minDistance = 7;
    controls.maxDistance = 40;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.28;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    let resumeTimer: ReturnType<typeof setTimeout> | undefined;
    const onStart = () => {
      controls.autoRotate = false;
      if (resumeTimer !== undefined) clearTimeout(resumeTimer);
    };
    const onEnd = () => {
      resumeTimer = setTimeout(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = true;
      }, 3500);
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);

    const ambient = new THREE.AmbientLight(0xffccaa, 0.45);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffe0c0, 1.8);
    sun.position.set(12, 4, 8);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x6644aa, 0.25);
    fill.position.set(-8, -2, -6);
    scene.add(fill);

    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 4500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 80 + Math.random() * 140;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xffe8d0,
        size: 0.32,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8,
      }),
    );
    scene.add(stars);

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    const marsGroup = new THREE.Group();
    scene.add(marsGroup);
    marsGroupRef.current = marsGroup;

    const sphereGeo = new THREE.SphereGeometry(MARS_RADIUS, 96, 96);
    const marsMat = createMarsMaterial(null, null, 0.72);
    const mars = new THREE.Mesh(sphereGeo, marsMat);
    mars.name = "mars";
    marsGroup.add(mars);

    // Thin dusty atmosphere glow (orange-red)
    const atmosGeo = new THREE.SphereGeometry(MARS_RADIUS * 1.06, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.6);
          vec3 color = mix(vec3(0.9, 0.35, 0.12), vec3(1.0, 0.7, 0.4), fresnel);
          gl_FragColor = vec4(color, fresnel * 0.4);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    marsGroup.add(new THREE.Mesh(atmosGeo, atmosMat));

    loader.load(MARS_COLOR, (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      marsMat.uniforms.uColorMap.value = tex;
      marsMat.uniforms.uHasColor.value = 1;
    });
    loader.load(MARS_BUMP, (tex: THREE.Texture) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      marsMat.uniforms.uBumpMap.value = tex;
      marsMat.uniforms.uHasBump.value = 1;
    });

    // Grid & time zones (off by default)
    const grid = createLatLonGrid(MARS_RADIUS * 1.012);
    grid.visible = false;
    marsGroup.add(grid);

    const tzGroup = createTimeZoneBands(MARS_RADIUS * 1.018);
    tzGroup.visible = false;
    marsGroup.add(tzGroup);

    // --- Markers ---
    const markersGroup = new THREE.Group();
    marsGroup.add(markersGroup);
    const markerMeshes = new Map<string, THREE.Mesh>();
    const markerGeo = new THREE.SphereGeometry(1, 16, 16);
    const matCache = new Map<number, THREE.MeshBasicMaterial>();
    const getCatMat = (hex: number) => {
      let m = matCache.get(hex);
      if (!m) {
        m = new THREE.MeshBasicMaterial({ color: hex });
        matCache.set(hex, m);
      }
      return m;
    };
    const selectedMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ringGeo = new THREE.RingGeometry(1.6, 2.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    const disposeMarker = (mesh: THREE.Mesh) => {
      const ring = mesh.getObjectByName("ring");
      if (ring instanceof THREE.Mesh) {
        const mat = ring.material;
        if (!Array.isArray(mat) && mat !== ringMat) mat.dispose();
      }
      markersGroup.remove(mesh);
    };

    const rebuildMarkers = (list: Place[], selected: string | null) => {
      for (const [id, mesh] of markerMeshes) {
        if (!list.find((p) => p.id === id)) {
          disposeMarker(mesh);
          markerMeshes.delete(id);
        }
      }
      for (const place of list) {
        const catHex = CATEGORY_META[place.category]?.hex ?? 0xfda4af;
        let mesh = markerMeshes.get(place.id);
        if (!mesh) {
          mesh = new THREE.Mesh(markerGeo, getCatMat(catHex));
          mesh.userData.placeId = place.id;
          mesh.name = `marker-${place.id}`;
          const ring = new THREE.Mesh(ringGeo, ringMat.clone());
          ring.rotation.x = Math.PI / 2;
          ring.visible = place.id === selected;
          ring.name = "ring";
          mesh.add(ring);
          markersGroup.add(mesh);
          markerMeshes.set(place.id, mesh);
        }
        const pos = latLonToVec3(place.lat, place.lon, MARS_RADIUS * 1.025);
        mesh.position.copy(pos);
        mesh.lookAt(pos.clone().multiplyScalar(2));
        const isSel = place.id === selected;
        mesh.material = isSel ? selectedMat : getCatMat(catHex);
        mesh.scale.setScalar(isSel ? MARKER_HOVER_RADIUS : MARKER_RADIUS);
        const ring = mesh.getObjectByName("ring");
        if (ring) ring.visible = isSel;
      }
    };

    const setSelectedVisual = (id: string | null) => {
      for (const [pid, mesh] of markerMeshes) {
        const place = placesRef.current.find((p) => p.id === pid);
        const catHex = CATEGORY_META[place?.category ?? "custom"]?.hex ??
          0xfda4af;
        const isSel = pid === id;
        mesh.material = isSel ? selectedMat : getCatMat(catHex);
        mesh.scale.setScalar(isSel ? MARKER_HOVER_RADIUS : MARKER_RADIUS);
        const ring = mesh.getObjectByName("ring");
        if (ring) ring.visible = isSel;
      }
    };

    let flyActive = false;
    let flyFrom = new THREE.Vector3();
    let flyTo = new THREE.Vector3();
    let flyT = 0;
    const flyDuration = 1.1;

    const startFlyTo = (lat: number, lon: number) => {
      controls.autoRotate = false;
      if (resumeTimer !== undefined) clearTimeout(resumeTimer);
      const local = latLonToVec3(lat, lon, 1);
      marsGroup.updateMatrixWorld(true);
      const worldDir = local.clone().transformDirection(marsGroup.matrixWorld)
        .normalize();
      const dist = camera.position.length();
      const targetDist = THREE.MathUtils.clamp(dist, 9, 18);
      flyFrom.copy(camera.position);
      flyTo.copy(worldDir.multiplyScalar(targetDist));
      flyT = 0;
      flyActive = true;
      controls.target.set(0, 0, 0);
    };

    apiRef.current = {
      flyTo: startFlyTo,
      setMarkers: rebuildMarkers,
      setSelected: setSelectedVisual,
      setGridVisible: (v: boolean) => {
        grid.visible = v;
      },
      setTimeZonesVisible: (v: boolean) => {
        tzGroup.visible = v;
      },
      setElevationBlend: (v: number) => {
        marsMat.uniforms.uElevationBlend.value = v;
      },
    };
    rebuildMarkers(placesRef.current, selectedIdRef.current);
    grid.visible = false;
    tzGroup.visible = false;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const setPointerFromEvent = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onDblClick = (event: MouseEvent) => {
      setPointerFromEvent(event as unknown as PointerEvent);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(mars, false);
      if (!hits.length) return;
      const local = marsGroup.worldToLocal(hits[0].point.clone());
      const { lat, lon } = vec3ToLatLon(local);
      const place: Place = {
        id: newId(),
        name: `Custom site ${placesRef.current.filter((p) => p.category === "custom").length + 1}`,
        notes: "User-marked location. Add notes for later analysis.",
        lat,
        lon,
        createdAt: Date.now(),
        category: "custom",
      };
      container.dispatchEvent(
        new CustomEvent("globe:add-place", { detail: place }),
      );
    };

    const onClick = (event: MouseEvent) => {
      setPointerFromEvent(event as unknown as PointerEvent);
      raycaster.setFromCamera(pointer, camera);
      const markerList = Array.from(markerMeshes.values());
      const hits = raycaster.intersectObjects(markerList, false);
      if (hits.length) {
        const id = hits[0].object.userData.placeId as string;
        container.dispatchEvent(
          new CustomEvent("globe:select-place", { detail: { id } }),
        );
      }
    };

    renderer.domElement.addEventListener("dblclick", onDblClick);
    renderer.domElement.addEventListener("click", onClick);

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      // Slow dust-storm shimmer on light
      sun.intensity = 1.7 + Math.sin(clock.elapsedTime * 0.15) * 0.1;

      if (flyActive) {
        flyT += dt / flyDuration;
        const t = Math.min(flyT, 1);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        camera.position.lerpVectors(flyFrom, flyTo, e);
        camera.lookAt(0, 0, 0);
        if (t >= 1) {
          flyActive = false;
          controls.update();
        }
      } else {
        controls.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    globalThis.addEventListener("resize", onResize);

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!marsGroupRef.current) return;
      if (e.key === "ArrowLeft") {
        marsGroupRef.current.rotation.y += ROTATE_STEP;
        controls.autoRotate = false;
      } else if (e.key === "ArrowRight") {
        marsGroupRef.current.rotation.y -= ROTATE_STEP;
        controls.autoRotate = false;
      } else if (e.key === "ArrowUp") {
        marsGroupRef.current.rotation.x += ROTATE_STEP * 0.5;
        controls.autoRotate = false;
      } else if (e.key === "ArrowDown") {
        marsGroupRef.current.rotation.x -= ROTATE_STEP * 0.5;
        controls.autoRotate = false;
      }
    };
    globalThis.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      if (resumeTimer !== undefined) clearTimeout(resumeTimer);
      globalThis.removeEventListener("resize", onResize);
      globalThis.removeEventListener("keydown", onKeyDown);
      renderer.domElement.removeEventListener("dblclick", onDblClick);
      renderer.domElement.removeEventListener("click", onClick);
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      controlsRef.current = null;
      marsGroupRef.current = null;
      apiRef.current = null;
      renderer.dispose();
      sphereGeo.dispose();
      atmosGeo.dispose();
      marsMat.dispose();
      atmosMat.dispose();
      starGeo.dispose();
      (stars.material as THREE.Material).dispose();
      markerGeo.dispose();
      selectedMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      for (const m of matCache.values()) m.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onAdd = (e: Event) => {
      const place = (e as CustomEvent<Place>).detail;
      setPlaces((prev) => [...prev, place]);
      setSelectedId(place.id);
      setLeftOpen(true);
      requestAnimationFrame(() => {
        apiRef.current?.flyTo(place.lat, place.lon);
      });
    };
    const onSelect = (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      setSelectedId(id);
      const place = placesRef.current.find((p) => p.id === id);
      if (place) apiRef.current?.flyTo(place.lat, place.lon);
    };
    container.addEventListener("globe:add-place", onAdd);
    container.addEventListener("globe:select-place", onSelect);
    return () => {
      container.removeEventListener("globe:add-place", onAdd);
      container.removeEventListener("globe:select-place", onSelect);
    };
  }, []);

  const selected = places.find((p) => p.id === selectedId) ?? null;

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    return places.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q) ||
        (p.agency?.toLowerCase().includes(q) ?? false) ||
        (p.status?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [places, categoryFilter, search]);

  const missionPlaces = useMemo(
    () => places.filter((p) => p.category === "mission"),
    [places],
  );

  const selectPlace = useCallback((place: Place) => {
    setSelectedId(place.id);
    apiRef.current?.flyTo(place.lat, place.lon);
    if (controlsRef.current) controlsRef.current.autoRotate = false;
  }, []);

  const updateSelected = useCallback(
    (patch: Partial<Pick<Place, "name" | "notes" | "category">>) => {
      if (!selectedId) return;
      setPlaces((prev) =>
        prev.map((p) => (p.id === selectedId ? { ...p, ...patch } : p))
      );
    },
    [selectedId],
  );

  const deletePlace = useCallback((id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const clearCustom = useCallback(() => {
    if (!confirm("Remove all custom (user) markers? Catalog sites are kept.")) {
      return;
    }
    setPlaces((prev) => prev.filter((p) => p.category !== "custom"));
    setSelectedId(null);
  }, []);

  const restoreDefaults = useCallback(() => {
    if (!confirm("Reset markers to the full Mars catalog? Custom notes will be lost.")) {
      return;
    }
    const next = DEFAULT_PLACES.map((p) => ({ ...p, createdAt: Date.now() }));
    setPlaces(next);
    setSelectedId(null);
  }, []);

  const rotateLeft = () => {
    if (marsGroupRef.current) marsGroupRef.current.rotation.y += ROTATE_STEP;
    if (controlsRef.current) controlsRef.current.autoRotate = false;
  };
  const rotateRight = () => {
    if (marsGroupRef.current) marsGroupRef.current.rotation.y -= ROTATE_STEP;
    if (controlsRef.current) controlsRef.current.autoRotate = false;
  };
  const resetView = () => {
    if (marsGroupRef.current) marsGroupRef.current.rotation.set(0, 0, 0);
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.autoRotate = true;
    }
  };

  const toggleAccordion = (id: AccordionId) => {
    setOpenAccordions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const midPad = `${leftOpen ? "left-72 sm:left-80" : "left-0"} ${
    rightOpen ? "right-72 sm:right-80" : "right-0"
  }`;

  return (
    <div class="relative h-full w-full overflow-hidden bg-[#050208]">
      <div
        ref={containerRef}
        class="h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* Top HUD */}
      <div
        class={`pointer-events-none absolute top-0 flex flex-col items-center gap-1 p-3 sm:p-4 transition-all ${midPad}`}
      >
        <h1 class="text-lg font-semibold tracking-wide text-orange-100/95 sm:text-xl">
          Mars Explorer
        </h1>
        <p class="max-w-xl text-center text-[11px] text-white/45 sm:text-xs">
          Elevation-colored globe · Drag orbit · Scroll zoom · Double-click to
          mark · Click pins to fly
        </p>
      </div>

      {/* Overlay toggles */}
      <div
        class={`absolute top-16 z-10 flex flex-wrap items-center justify-center gap-2 px-3 transition-all ${midPad}`}
      >
        <label class="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur hover:bg-white/10">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) =>
              setShowGrid((e.target as HTMLInputElement).checked)}
            class="accent-orange-400"
          />
          Lat / Lon grid
        </label>
        <label class="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur hover:bg-white/10">
          <input
            type="checkbox"
            checked={showTimeZones}
            onChange={(e) =>
              setShowTimeZones((e.target as HTMLInputElement).checked)}
            class="accent-orange-400"
          />
          Time zones (MTZ)
        </label>
        <div class="flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur">
          <span class="whitespace-nowrap">Elevation</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(elevationBlend * 100)}
            onInput={(e) =>
              setElevationBlend(
                Number((e.target as HTMLInputElement).value) / 100,
              )}
            class="w-20 accent-orange-400 sm:w-28"
            title="Blend true color ↔ elevation colormap"
          />
        </div>
      </div>

      {/* Elevation legend */}
      <div
        class={`pointer-events-none absolute bottom-20 z-10 flex flex-col items-center gap-1 transition-all ${midPad}`}
      >
        <div
          class="h-2 w-48 rounded-full sm:w-64"
          style={{
            background:
              "linear-gradient(90deg,#0d1447,#1a598c,#338c59,#bfb340,#d9591f,#f2f2f2)",
          }}
        />
        <div class="flex w-48 justify-between text-[9px] text-white/40 sm:w-64">
          <span>Basins</span>
          <span>Plains</span>
          <span>Highlands</span>
          <span>Peaks</span>
        </div>
      </div>

      {/* Sidebar open buttons */}
      {!leftOpen && (
        <button
          type="button"
          onClick={() => setLeftOpen(true)}
          class="absolute left-3 top-3 z-20 rounded-lg border border-orange-400/25 bg-black/55 px-3 py-2 text-sm text-orange-100 backdrop-blur hover:bg-white/15"
        >
          Markers ({places.length})
        </button>
      )}
      {!rightOpen && (
        <button
          type="button"
          onClick={() => setRightOpen(true)}
          class="absolute right-3 top-3 z-20 rounded-lg border border-orange-400/25 bg-black/55 px-3 py-2 text-sm text-orange-100 backdrop-blur hover:bg-white/15"
        >
          Mars data
        </button>
      )}

      {/* LEFT: Markers */}
      <aside
        class={`absolute bottom-0 left-0 top-0 z-20 flex w-72 flex-col border-r border-orange-500/15 bg-black/75 backdrop-blur-md transition-transform duration-200 sm:w-80 ${
          leftOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 class="text-sm font-semibold text-orange-100">Markers</h2>
            <p class="text-[11px] text-white/40">
              Coordinates + notes (localStorage)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLeftOpen(false)}
            class="rounded-md px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close markers"
          >
            ✕
          </button>
        </div>

        <div class="space-y-2 border-b border-white/10 px-3 py-2">
          <input
            type="search"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search name, agency, notes…"
            class="w-full rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-orange-400/50"
          />
          <div class="flex flex-wrap gap-1">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                class={`rounded-full px-2 py-0.5 text-[10px] transition ${
                  categoryFilter === c
                    ? "bg-orange-500/30 text-orange-100 ring-1 ring-orange-400/40"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {c === "all" ? "All" : CATEGORY_META[c].label.split(" ")[0]}
              </button>
            ))}
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              onClick={restoreDefaults}
              class="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white/70 hover:bg-white/10"
            >
              Reset catalog
            </button>
            <button
              type="button"
              onClick={clearCustom}
              class="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-red-300/80 hover:bg-red-500/20"
            >
              Clear custom
            </button>
          </div>
        </div>

        <ul class="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {filteredPlaces.length === 0 && (
            <li class="px-2 py-6 text-center text-xs text-white/40">
              No markers match this filter.
            </li>
          )}
          {filteredPlaces.map((place) => {
            const active = place.id === selectedId;
            const meta = CATEGORY_META[place.category];
            return (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => selectPlace(place)}
                  class={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-orange-500/20 ring-1 ring-orange-400/40"
                      : "hover:bg-white/8"
                  }`}
                >
                  <div class="flex items-start justify-between gap-2">
                    <span
                      class={`text-sm font-medium ${
                        active ? "text-orange-100" : "text-white/90"
                      }`}
                    >
                      {place.name || "Untitled"}
                    </span>
                    <span
                      class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: `#${meta.hex.toString(16).padStart(6, "0")}` }}
                    />
                  </div>
                  <p class={`mt-0.5 text-[10px] ${meta.color}`}>
                    {meta.label}
                    {place.agency ? ` · ${place.agency}` : ""}
                  </p>
                  <p class="mt-0.5 font-mono text-[10px] text-white/35">
                    {formatCoords(place.lat, place.lon)}
                    {place.elevationKm !== undefined
                      ? ` · ${place.elevationKm > 0 ? "+" : ""}${place.elevationKm} km`
                      : ""}
                  </p>
                  {place.status && (
                    <p class="mt-0.5 text-[10px] text-sky-300/70">{place.status}</p>
                  )}
                  {place.notes && (
                    <p class="mt-1 line-clamp-2 text-[11px] leading-snug text-white/50">
                      {place.notes}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Editor */}
        <div class="border-t border-white/10 p-3">
          {selected
            ? (
              <div class="space-y-2">
                <label class="block">
                  <span class="mb-1 block text-[10px] uppercase tracking-wider text-white/40">
                    Name
                  </span>
                  <input
                    type="text"
                    value={selected.name}
                    onInput={(e) =>
                      updateSelected({
                        name: (e.target as HTMLInputElement).value,
                      })}
                    class="w-full rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm text-white outline-none focus:border-orange-400/50"
                  />
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] uppercase tracking-wider text-white/40">
                    Category
                  </span>
                  <select
                    value={selected.category}
                    onChange={(e) =>
                      updateSelected({
                        category: (e.target as HTMLSelectElement)
                          .value as MarkerCategory,
                      })}
                    class="w-full rounded-md border border-white/15 bg-black/60 px-2.5 py-1.5 text-sm text-white outline-none focus:border-orange-400/50"
                  >
                    {(Object.keys(CATEGORY_META) as MarkerCategory[]).map(
                      (c) => (
                        <option key={c} value={c}>
                          {CATEGORY_META[c].label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] uppercase tracking-wider text-white/40">
                    Notes
                  </span>
                  <textarea
                    value={selected.notes}
                    onInput={(e) =>
                      updateSelected({
                        notes: (e.target as HTMLTextAreaElement).value,
                      })}
                    rows={4}
                    class="w-full resize-none rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm text-white outline-none focus:border-orange-400/50"
                    placeholder="Coordinates notes, mission context, mineral finds…"
                  />
                </label>
                <p class="font-mono text-[10px] text-white/30">
                  {formatCoords(selected.lat, selected.lon)}
                  {selected.agency ? ` · ${selected.agency}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => deletePlace(selected.id)}
                  class="w-full rounded-md border border-red-400/20 bg-red-500/10 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                >
                  Delete marker
                </button>
              </div>
            )
            : (
              <p class="py-2 text-center text-xs text-white/40">
                Select a marker to edit notes, or double-click the globe to add
                a custom site.
              </p>
            )}
        </div>
      </aside>

      {/* RIGHT: Data panels */}
      <aside
        class={`absolute bottom-0 right-0 top-0 z-20 flex w-72 flex-col border-l border-orange-500/15 bg-black/75 backdrop-blur-md transition-transform duration-200 sm:w-80 ${
          rightOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 class="text-sm font-semibold text-orange-100">Planet data</h2>
            <p class="text-[11px] text-white/40">
              Metrics · missions · minerals · organics
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRightOpen(false)}
            class="rounded-md px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close data panel"
          >
            ✕
          </button>
        </div>

        <div class="flex-1 space-y-1 overflow-y-auto px-2 py-2">
          {/* Physical */}
          <Accordion
            title="Physical metrics"
            open={openAccordions.has("physical")}
            onToggle={() => toggleAccordion("physical")}
            badge={`${MARS_PHYSICAL.length}`}
          >
            <dl class="space-y-2">
              {MARS_PHYSICAL.map((m) => (
                <div
                  key={m.label}
                  class="rounded-md border border-white/5 bg-white/[0.03] px-2.5 py-2"
                >
                  <dt class="text-[10px] uppercase tracking-wider text-white/40">
                    {m.label}
                  </dt>
                  <dd class="mt-0.5 text-sm text-orange-50">
                    {m.value}
                    {m.unit
                      ? <span class="ml-1 text-white/50">{m.unit}</span>
                      : null}
                  </dd>
                  {m.note && (
                    <p class="mt-0.5 text-[11px] text-white/40">{m.note}</p>
                  )}
                </div>
              ))}
            </dl>
          </Accordion>

          {/* Atmosphere */}
          <Accordion
            title="Atmosphere composition"
            open={openAccordions.has("atmosphere")}
            onToggle={() => toggleAccordion("atmosphere")}
            badge="vol%"
          >
            <div class="overflow-x-auto">
              <table class="w-full text-left text-[11px]">
                <thead>
                  <tr class="text-white/40">
                    <th class="pb-1 font-medium">Gas</th>
                    <th class="pb-1 font-medium">Formula</th>
                    <th class="pb-1 font-medium text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {ATMOSPHERE_COMPOSITION.map((g) => (
                    <tr key={g.formula} class="border-t border-white/5">
                      <td class="py-1.5 text-white/80">{g.name}</td>
                      <td class="py-1.5 font-mono text-orange-200/80">
                        {g.formula}
                      </td>
                      <td class="py-1.5 text-right tabular-nums text-white/90">
                        {g.volumePct}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p class="mt-2 text-[10px] text-white/35">
              Volume mixing ratios near surface (Viking / modern average). H₂O
              highly variable.
            </p>
          </Accordion>

          {/* Missions */}
          <Accordion
            title="Exploration sites"
            open={openAccordions.has("missions")}
            onToggle={() => toggleAccordion("missions")}
            badge={`${missionPlaces.length}`}
          >
            <ul class="space-y-1.5">
              {missionPlaces.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => selectPlace(m)}
                    class="w-full rounded-md border border-white/5 bg-white/[0.03] px-2.5 py-2 text-left hover:bg-sky-500/10"
                  >
                    <div class="flex items-start justify-between gap-1">
                      <span class="text-xs font-medium text-sky-100">
                        {m.name}
                      </span>
                      {m.status && (
                        <span class="shrink-0 text-[9px] text-sky-300/70">
                          {m.status.split(" ")[0]}
                        </span>
                      )}
                    </div>
                    <p class="mt-0.5 font-mono text-[10px] text-white/35">
                      {formatCoords(m.lat, m.lon)}
                    </p>
                    {m.agency && (
                      <p class="text-[10px] text-white/45">{m.agency}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <p class="mt-2 text-[10px] leading-snug text-white/35">
              Note: Tiangong is China&apos;s Earth-orbit station — Mars surface
              asset is Tianwen-1 / Zhurong. ISRO MOM is orbital (ISSDC/PRADAN
              data).
            </p>
          </Accordion>

          {/* Minerals */}
          <Accordion
            title="Ores & minerals"
            open={openAccordions.has("minerals")}
            onToggle={() => toggleAccordion("minerals")}
            badge={`${MINERALS.length}`}
          >
            <ul class="space-y-2">
              {MINERALS.map((min) => (
                <li
                  key={min.name}
                  class="rounded-md border border-white/5 bg-white/[0.03] px-2.5 py-2"
                >
                  <p class="text-xs font-medium text-emerald-200">{min.name}</p>
                  {min.formula && (
                    <p class="font-mono text-[10px] text-emerald-100/50">
                      {min.formula}
                    </p>
                  )}
                  <p class="mt-1 text-[11px] text-orange-100/90">
                    <span class="text-white/40">Occurrence: </span>
                    {min.occurrencePct}
                  </p>
                  <p class="mt-1 text-[11px] leading-snug text-white/55">
                    {min.notes}
                  </p>
                  <p class="mt-1 text-[10px] text-white/40">
                    Sites: {min.sites.join(" · ")}
                  </p>
                  <p class="mt-0.5 text-[9px] text-white/30">
                    Source: {min.source}
                  </p>
                </li>
              ))}
            </ul>
          </Accordion>

          {/* Organics */}
          <Accordion
            title="Organics & volatiles"
            open={openAccordions.has("organics")}
            onToggle={() => toggleAccordion("organics")}
            badge={`${ORGANICS.length}`}
          >
            <div class="mb-2 overflow-x-auto">
              <table class="w-full text-left text-[10px]">
                <thead>
                  <tr class="text-white/40">
                    <th class="pb-1 pr-1 font-medium">Compound</th>
                    <th class="pb-1 pr-1 font-medium">Where</th>
                    <th class="pb-1 font-medium">Abundance</th>
                  </tr>
                </thead>
                <tbody>
                  {ORGANICS.map((o) => (
                    <tr key={o.name} class="border-t border-white/5 align-top">
                      <td class="py-1.5 pr-1">
                        <span class="text-violet-200">{o.name}</span>
                        {o.formula && (
                          <span class="mt-0.5 block font-mono text-white/35">
                            {o.formula}
                          </span>
                        )}
                      </td>
                      <td class="py-1.5 pr-1 capitalize text-white/50">
                        {o.location}
                      </td>
                      <td class="py-1.5 text-white/70">{o.abundance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul class="space-y-2">
              {ORGANICS.filter((o) =>
                ["Methane", "Thiophenes & methylthiophenes", "Chlorobenzene"]
                  .includes(o.name)
              ).map((o) => (
                <li
                  key={`detail-${o.name}`}
                  class="rounded-md border border-violet-500/15 bg-violet-500/5 px-2.5 py-2"
                >
                  <p class="text-xs font-medium text-violet-200">{o.name}</p>
                  <p class="mt-1 text-[11px] leading-snug text-white/55">
                    {o.notes}
                  </p>
                  <p class="mt-1 text-[10px] text-white/35">
                    Detection: {o.detection}
                  </p>
                  <p class="text-[9px] text-white/30">Source: {o.source}</p>
                </li>
              ))}
            </ul>
          </Accordion>

          {/* Time zones */}
          <Accordion
            title="Mars time zones (fictional MTZ)"
            open={openAccordions.has("timezones")}
            onToggle={() => toggleAccordion("timezones")}
            badge="24"
          >
            <p class="mb-2 text-[11px] leading-snug text-white/50">
              Mars has no official civil time zones. These 24{" "}
              <strong class="text-white/70">Mars Time Zones (MTZ)</strong>{" "}
              divide the planet into 15° longitude bands of mean solar time
              relative to the Airy-0 prime meridian — useful for comparing
              regional sol clocks.
            </p>
            <div class="grid grid-cols-2 gap-1">
              {MARS_TIME_ZONES.map((tz) => (
                <div
                  key={tz.id}
                  class="flex items-center gap-1.5 rounded border border-white/5 px-1.5 py-1 text-[10px]"
                >
                  <span
                    class="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: tz.color }}
                  />
                  <span class="font-mono text-white/80">{tz.name}</span>
                  <span class="ml-auto text-white/35">
                    {tz.lonWest}°…{tz.lonEast}°
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowTimeZones((v) => !v)}
              class="mt-2 w-full rounded-md border border-white/10 bg-white/5 py-1.5 text-[11px] text-white/70 hover:bg-white/10"
            >
              {showTimeZones ? "Hide" : "Show"} time-zone overlay on globe
            </button>
          </Accordion>

          {/* Sources */}
          <Accordion
            title="Data sources"
            open={openAccordions.has("sources")}
            onToggle={() => toggleAccordion("sources")}
            badge={`${DATA_SOURCES.length}`}
          >
            <ul class="space-y-2">
              {DATA_SOURCES.map((s) => (
                <li
                  key={s.agency}
                  class="rounded-md border border-white/5 bg-white/[0.03] px-2.5 py-2"
                >
                  <p class="text-xs font-medium text-orange-100">{s.agency}</p>
                  <p class="mt-0.5 text-[11px] leading-snug text-white/50">
                    {s.assets}
                  </p>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-1 inline-block text-[10px] text-sky-400/80 hover:text-sky-300"
                  >
                    {s.url.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              ))}
            </ul>
            <p class="mt-2 text-[10px] leading-snug text-white/30">
              Abundances are educational summaries of published ranges, not a
              single global assay. Always consult primary archives (PDS, ISSDC,
              ESA PSA) for research use.
            </p>
          </Accordion>
        </div>
      </aside>

      {/* Bottom orbit controls */}
      <div
        class={`absolute bottom-5 z-10 flex -translate-x-1/2 items-center gap-2 transition-all ${
          leftOpen && rightOpen
            ? "left-1/2"
            : leftOpen
            ? "left-[calc(50%+9rem)] sm:left-[calc(50%+10rem)]"
            : rightOpen
            ? "left-[calc(50%-9rem)] sm:left-[calc(50%-10rem)]"
            : "left-1/2"
        }`}
      >
        <button
          type="button"
          onClick={rotateLeft}
          class="rounded-full border border-orange-400/25 bg-black/50 px-3 py-1.5 text-xs font-medium text-orange-50 backdrop-blur transition hover:bg-orange-500/20 active:scale-95 sm:px-4 sm:text-sm"
          title="Rotate left (←)"
        >
          ← Left
        </button>
        <button
          type="button"
          onClick={resetView}
          class="rounded-full border border-orange-400/25 bg-black/50 px-3 py-1.5 text-xs font-medium text-orange-50 backdrop-blur transition hover:bg-orange-500/20 active:scale-95 sm:px-4 sm:text-sm"
          title="Reset view"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={rotateRight}
          class="rounded-full border border-orange-400/25 bg-black/50 px-3 py-1.5 text-xs font-medium text-orange-50 backdrop-blur transition hover:bg-orange-500/20 active:scale-95 sm:px-4 sm:text-sm"
          title="Rotate right (→)"
        >
          Right →
        </button>
      </div>
    </div>
  );
}

function Accordion(
  { title, open, onToggle, badge, children }: {
    title: string;
    open: boolean;
    onToggle: () => void;
    badge?: string;
    children: ComponentChildren;
  },
) {
  return (
    <div class="overflow-hidden rounded-lg border border-white/10 bg-black/30">
      <button
        type="button"
        onClick={onToggle}
        class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/5"
        aria-expanded={open}
      >
        <span class="text-xs font-semibold text-orange-100/95">{title}</span>
        <span class="flex items-center gap-2">
          {badge && (
            <span class="rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[9px] tabular-nums text-orange-200/80">
              {badge}
            </span>
          )}
          <span
            class={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </span>
      </button>
      {open && (
        <div class="border-t border-white/5 px-2.5 py-2.5">{children}</div>
      )}
    </div>
  );
}
