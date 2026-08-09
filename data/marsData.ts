/**
 * Mars reference data compiled from public mission results and agency releases:
 * NASA / JPL / USGS MOLA, ESA TGO & ExoMars, CNSA Tianwen-1, ISRO MOM (Mangalyaan),
 * UAE Hope (Emirates Mars Mission), and peer-reviewed summaries.
 *
 * Abundances are approximate crustal / measured ranges for educational analysis —
 * not a single global assay. Coordinates use planetocentric lat / east-positive lon
 * (IAU / Mars convention used by most modern missions).
 */

export type MarkerCategory =
  | "crater"
  | "volcano"
  | "mission"
  | "pole"
  | "mineral"
  | "landmark"
  | "custom";

export type Place = {
  id: string;
  name: string;
  notes: string;
  lat: number;
  lon: number;
  createdAt: number;
  category: MarkerCategory;
  agency?: string;
  elevationKm?: number;
  status?: string;
};

export type PhysicalMetric = {
  label: string;
  value: string;
  unit?: string;
  note?: string;
};

export type MineralRecord = {
  name: string;
  formula?: string;
  occurrencePct: string;
  sites: string[];
  notes: string;
  source: string;
};

export type OrganicRecord = {
  name: string;
  formula?: string;
  location: "atmosphere" | "surface" | "both";
  abundance: string;
  detection: string;
  notes: string;
  source: string;
};

export type AtmosphereGas = {
  name: string;
  formula: string;
  volumePct: number;
  notes?: string;
};

export type TimeZoneBand = {
  id: string;
  name: string;
  lonWest: number;
  lonEast: number;
  offsetSolHours: number;
  color: string;
};

// ---------------------------------------------------------------------------
// Physical metrics
// ---------------------------------------------------------------------------

export const MARS_PHYSICAL: PhysicalMetric[] = [
  {
    label: "Mean radius",
    value: "3,389.5",
    unit: "km",
    note: "IAU nominal; ~53% of Earth",
  },
  {
    label: "Equatorial radius",
    value: "3,396.2",
    unit: "km",
  },
  {
    label: "Polar radius",
    value: "3,376.2",
    unit: "km",
    note: "Oblateness ~0.00589",
  },
  {
    label: "Mass",
    value: "6.4171×10²³",
    unit: "kg",
    note: "0.107 Earth masses",
  },
  {
    label: "Surface gravity",
    value: "3.721",
    unit: "m/s²",
    note: "0.379 g",
  },
  {
    label: "Escape velocity",
    value: "5.027",
    unit: "km/s",
  },
  {
    label: "Sidereal day (sol)",
    value: "24h 37m 22.7s",
    note: "1 sol ≈ 1.0275 Earth days",
  },
  {
    label: "Orbital period",
    value: "686.98",
    unit: "Earth days",
    note: "~1.88 Earth years",
  },
  {
    label: "Axial tilt",
    value: "25.19",
    unit: "°",
    note: "Seasons similar in character to Earth",
  },
  {
    label: "Mean solar distance",
    value: "1.524",
    unit: "AU",
    note: "206.7 million km average",
  },
  {
    label: "Surface pressure",
    value: "~610",
    unit: "Pa",
    note: "0.6% of Earth's; varies with season & elevation",
  },
  {
    label: "Mean surface temp.",
    value: "−63",
    unit: "°C",
    note: "Range roughly −140°C to +30°C",
  },
  {
    label: "Moons",
    value: "Phobos, Deimos",
    note: "Captured irregular bodies",
  },
  {
    label: "North pole",
    value: "90.00°N, 0°E",
    note: "Planum Boreum residual CO₂ / H₂O ice cap",
  },
  {
    label: "South pole",
    value: "90.00°S, 0°E",
    note: "Planum Australe residual CO₂ ice cap",
  },
  {
    label: "Highest point",
    value: "Olympus Mons ~21.9 km",
    note: "Above datum (MOLA)",
  },
  {
    label: "Lowest point",
    value: "Hellas Planitia ~−8.2 km",
    note: "Below datum (MOLA)",
  },
];

export const ATMOSPHERE_COMPOSITION: AtmosphereGas[] = [
  { name: "Carbon dioxide", formula: "CO₂", volumePct: 95.32 },
  { name: "Nitrogen", formula: "N₂", volumePct: 2.7 },
  { name: "Argon", formula: "Ar", volumePct: 1.6 },
  { name: "Oxygen", formula: "O₂", volumePct: 0.13 },
  { name: "Carbon monoxide", formula: "CO", volumePct: 0.08 },
  {
    name: "Water vapor",
    formula: "H₂O",
    volumePct: 0.03,
    notes: "Highly variable; higher near poles & summer",
  },
  {
    name: "Nitric oxide",
    formula: "NO",
    volumePct: 0.01,
    notes: "Trace; upper atmosphere",
  },
  {
    name: "Neon / Krypton / Xenon",
    formula: "Ne, Kr, Xe",
    volumePct: 0.0003,
    notes: "Noble gas suite (approx. combined)",
  },
];

// ---------------------------------------------------------------------------
// Fictional Mars time zones (24 × 15° longitude bands)
// Local Mean Solar Time offset relative to prime meridian (Airy-0)
// ---------------------------------------------------------------------------

export const MARS_TIME_ZONES: TimeZoneBand[] = Array.from({ length: 24 }, (_, i) => {
  const lonWest = -180 + i * 15;
  const lonEast = lonWest + 15;
  const offset = i - 12; // hours from prime-meridian mean solar time
  const sign = offset >= 0 ? "+" : "";
  const hues = [
    "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#14b8a6",
    "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e", "#fb7185", "#fdba74", "#fde047", "#bef264",
    "#6ee7b7", "#67e8f9", "#93c5fd", "#c4b5fd", "#e9d5ff", "#fbcfe8",
  ];
  return {
    id: `mtz-${i}`,
    name: `MTZ${sign}${offset}`,
    lonWest,
    lonEast,
    offsetSolHours: offset,
    color: hues[i],
  };
});

// ---------------------------------------------------------------------------
// Default markers: poles, volcanoes, craters, missions, mineral sites
// ---------------------------------------------------------------------------

export const DEFAULT_PLACES: Place[] = [
  // Poles
  {
    id: "pole-north",
    name: "North Pole (Planum Boreum)",
    notes:
      "Geographic north pole. Residual water-ice cap with seasonal CO₂ frost. Phoenix landed nearby in Vastitas Borealis. Elevation ~−2 to −4 km near cap edge.",
    lat: 90,
    lon: 0,
    createdAt: 0,
    category: "pole",
    elevationKm: -2.5,
    status: "Geographic pole",
  },
  {
    id: "pole-south",
    name: "South Pole (Planum Australe)",
    notes:
      "Geographic south pole. Permanent residual CO₂ ice cap over layered water ice. Key climate archive for Mars obliquity cycles.",
    lat: -90,
    lon: 0,
    createdAt: 0,
    category: "pole",
    elevationKm: 3,
    status: "Geographic pole",
  },

  // Volcanoes
  {
    id: "volc-olympus",
    name: "Olympus Mons",
    notes:
      "Largest known volcano in the Solar System. Shield volcano ~600 km wide, summit caldera complex. Summit elevation ~21.9 km above MOLA datum.",
    lat: 18.65,
    lon: -133.8,
    createdAt: 0,
    category: "volcano",
    elevationKm: 21.9,
    agency: "USGS / NASA MOLA",
  },
  {
    id: "volc-ascraeus",
    name: "Ascraeus Mons",
    notes: "Northernmost of the three Tharsis Montes shield volcanoes. Summit ~18 km.",
    lat: 11.92,
    lon: -104.08,
    createdAt: 0,
    category: "volcano",
    elevationKm: 18.1,
  },
  {
    id: "volc-pavonis",
    name: "Pavonis Mons",
    notes: "Middle Tharsis Montes volcano, nearly on the equator. Summit ~14 km.",
    lat: 0.8,
    lon: -112.5,
    createdAt: 0,
    category: "volcano",
    elevationKm: 14,
  },
  {
    id: "volc-arsia",
    name: "Arsia Mons",
    notes: "Southern Tharsis Montes shield. Large caldera; possible past glacial activity on flanks.",
    lat: -8.35,
    lon: -120.5,
    createdAt: 0,
    category: "volcano",
    elevationKm: 17.7,
  },
  {
    id: "volc-elysium",
    name: "Elysium Mons",
    notes: "Primary volcano of the Elysium volcanic province. Summit ~12–14 km.",
    lat: 25.02,
    lon: 147.21,
    createdAt: 0,
    category: "volcano",
    elevationKm: 12.6,
  },
  {
    id: "volc-alba",
    name: "Alba Mons",
    notes: "Vast, low-relief volcano north of Tharsis — one of the largest volcanoes by area.",
    lat: 40.5,
    lon: -109.6,
    createdAt: 0,
    category: "volcano",
    elevationKm: 6.8,
  },

  // Craters & basins
  {
    id: "crater-hellas",
    name: "Hellas Planitia",
    notes:
      "Largest visible impact basin (~2,300 km). Deepest region on Mars (~−8.2 km). High atmospheric pressure; candidate for past water / ice processes.",
    lat: -42.4,
    lon: 70.5,
    createdAt: 0,
    category: "crater",
    elevationKm: -8.2,
  },
  {
    id: "crater-gale",
    name: "Gale Crater",
    notes:
      "155 km impact crater hosting Mount Sharp (Aeolis Mons). NASA Curiosity (MSL) landing site (2012). Clay & sulfate strata record ancient lake environments.",
    lat: -5.4,
    lon: 137.8,
    createdAt: 0,
    category: "crater",
    agency: "NASA / JPL",
    elevationKm: -4.5,
  },
  {
    id: "crater-jezero",
    name: "Jezero Crater",
    notes:
      "Ancient lake crater with river delta deposits. NASA Perseverance + Ingenuity site (2021). Carbonates, clays, and potential biosignature targets for sample return.",
    lat: 18.38,
    lon: 77.58,
    createdAt: 0,
    category: "crater",
    agency: "NASA / JPL",
    elevationKm: -2.6,
  },
  {
    id: "crater-gusev",
    name: "Gusev Crater",
    notes: "Spirit rover landing site (2004). Basaltic plains with Columbia Hills hydrothermal alteration.",
    lat: -14.57,
    lon: 175.47,
    createdAt: 0,
    category: "crater",
    agency: "NASA / JPL",
  },
  {
    id: "crater-endeavour",
    name: "Endeavour Crater",
    notes: "Opportunity explored rim segments (Cape York, Solander Point, Marathon Valley). Phyllosilicates on rim.",
    lat: -2.28,
    lon: -5.23,
    createdAt: 0,
    category: "crater",
    agency: "NASA / JPL",
  },
  {
    id: "crater-victoria",
    name: "Victoria Crater",
    notes: "~750 m crater studied in detail by Opportunity at Meridiani Planum.",
    lat: -2.05,
    lon: -5.5,
    createdAt: 0,
    category: "crater",
    agency: "NASA / JPL",
  },
  {
    id: "crater-korolev",
    name: "Korolev Crater",
    notes: "82 km polar crater filled with ~1.8 km thick water ice — cold-trap preserved.",
    lat: 72.77,
    lon: 164.58,
    createdAt: 0,
    category: "crater",
    elevationKm: -2,
  },
  {
    id: "crater-huygens",
    name: "Huygens Crater",
    notes: "Large Noachian crater (~450 km) in Terra Sabaea with layered ejecta and clay detections.",
    lat: -14,
    lon: 55.5,
    createdAt: 0,
    category: "crater",
  },
  {
    id: "crater-schiaparelli",
    name: "Schiaparelli Crater",
    notes: "~460 km crater on the edge of Terra Meridiani / Sinus Sabaeus.",
    lat: -2.7,
    lon: 16.7,
    createdAt: 0,
    category: "crater",
  },

  // Landmarks
  {
    id: "land-valles",
    name: "Valles Marineris",
    notes:
      "Solar System's grand canyon system — ~4,000 km long, up to ~7 km deep. Exposes crustal stratigraphy; sulfate & clay deposits in interior chasmata.",
    lat: -14,
    lon: -59,
    createdAt: 0,
    category: "landmark",
    elevationKm: -5,
    agency: "NASA Mariner 9 / MRO",
  },
  {
    id: "land-nili",
    name: "Nili Fossae",
    notes:
      "Fracture system rich in olivine and carbonate. High priority for past habitability and ISRU resource studies.",
    lat: 22.6,
    lon: 77.0,
    createdAt: 0,
    category: "landmark",
  },
  {
    id: "land-mawrth",
    name: "Mawrth Vallis",
    notes: "Outflow channel with thick, diverse phyllosilicate sequences — ancient wet chemistry.",
    lat: 22.3,
    lon: -16.5,
    createdAt: 0,
    category: "landmark",
  },
  {
    id: "land-airy0",
    name: "Airy-0 (Prime Meridian)",
    notes:
      "Small crater defining the Martian prime meridian (0° longitude), analogous to Greenwich.",
    lat: -5.1,
    lon: 0,
    createdAt: 0,
    category: "landmark",
    agency: "IAU",
  },

  // Active / historic exploration sites
  {
    id: "msn-perseverance",
    name: "Perseverance Rover (Jezero)",
    notes:
      "NASA Mars 2020. Landed 18 Feb 2021 in Jezero Crater. Collecting rock cores for MSR; SHERLOC/PIXL/SuperCam mineralogy & organics. Approx. 18.4447°N, 77.4508°E (Octavia E. Butler Landing).",
    lat: 18.4447,
    lon: 77.4508,
    createdAt: 0,
    category: "mission",
    agency: "NASA / JPL",
    status: "Active (surface)",
  },
  {
    id: "msn-ingenuity",
    name: "Ingenuity Helicopter",
    notes:
      "First powered aircraft on another planet. 72 flights (2021–2024) from Wright Brothers Field near Perseverance. Mission ended Jan 2024 after rotor damage at Airfield Chi region, still in Jezero.",
    lat: 18.46,
    lon: 77.43,
    createdAt: 0,
    category: "mission",
    agency: "NASA / JPL",
    status: "Mission complete (on surface)",
  },
  {
    id: "msn-curiosity",
    name: "Curiosity Rover (Gale)",
    notes:
      "NASA MSL. Landed 6 Aug 2012 at Bradbury Landing. Climbing Mount Sharp; SAM & CheMin detected organics, seasonal methane, hydrated minerals.",
    lat: -4.5895,
    lon: 137.4417,
    createdAt: 0,
    category: "mission",
    agency: "NASA / JPL",
    status: "Active (surface)",
  },
  {
    id: "msn-zhurong",
    name: "Zhurong Rover (Tianwen-1)",
    notes:
      "CNSA Tianwen-1 lander/rover. Landed 15 May 2021 in southern Utopia Planitia. Studied subsurface structure, water-related minerals, and climate. Hibernating/inactive after first Martian winter. Note: Tiangong is China's Earth-orbit space station — not a Mars asset.",
    lat: 25.066,
    lon: 109.925,
    createdAt: 0,
    category: "mission",
    agency: "CNSA",
    status: "Inactive / hibernation",
  },
  {
    id: "msn-insight",
    name: "InSight Lander",
    notes:
      "NASA geophysical lander (2018–2022) at Elysium Planitia. SEIS measured marsquakes; HP³ heat probe; revealed core size & crustal structure.",
    lat: 4.5024,
    lon: 135.6234,
    createdAt: 0,
    category: "mission",
    agency: "NASA / JPL / DLR / CNES",
    status: "Mission complete",
  },
  {
    id: "msn-opportunity",
    name: "Opportunity Rover",
    notes:
      "MER-B. Landed 25 Jan 2004 at Meridiani Planum. 14+ year traverse; hematite spherules, aqueous sulfates, Endeavour rim clays.",
    lat: -1.9462,
    lon: -5.5266,
    createdAt: 0,
    category: "mission",
    agency: "NASA / JPL",
    status: "Mission complete (2019)",
  },
  {
    id: "msn-spirit",
    name: "Spirit Rover",
    notes:
      "MER-A. Landed 4 Jan 2004 in Gusev Crater. Discovered hydrothermal silica & carbonate in Columbia Hills.",
    lat: -14.5684,
    lon: 175.4726,
    createdAt: 0,
    category: "mission",
    agency: "NASA / JPL",
    status: "Mission complete (2010)",
  },
  {
    id: "msn-phoenix",
    name: "Phoenix Lander",
    notes:
      "NASA polar lander (2008) in Vastitas Borealis. Confirmed water ice under the surface; perchlorate salts; alkaline soil chemistry.",
    lat: 68.2188,
    lon: -125.7492,
    createdAt: 0,
    category: "mission",
    agency: "NASA / UA / CSA",
    status: "Mission complete",
  },
  {
    id: "msn-viking1",
    name: "Viking 1 Lander",
    notes:
      "First successful Mars lander (1976). Chryse Planitia. Imaging, meteorology, and life-detection experiments.",
    lat: 22.27,
    lon: -47.95,
    createdAt: 0,
    category: "mission",
    agency: "NASA",
    status: "Historic",
  },
  {
    id: "msn-viking2",
    name: "Viking 2 Lander",
    notes: "1976 landing in Utopia Planitia. Frost observations; soil analyses.",
    lat: 47.64,
    lon: 134.28,
    createdAt: 0,
    category: "mission",
    agency: "NASA",
    status: "Historic",
  },
  {
    id: "msn-pathfinder",
    name: "Pathfinder / Sojourner",
    notes:
      "1997 airbag landing at Ares Vallis. First Mars rover (Sojourner); demonstrated low-cost entry/descent/landing.",
    lat: 19.13,
    lon: -33.22,
    createdAt: 0,
    category: "mission",
    agency: "NASA / JPL",
    status: "Historic",
  },
  {
    id: "msn-mom",
    name: "ISRO Mangalyaan (MOM) — Orbital",
    notes:
      "India's Mars Orbiter Mission (2013–2022). First Asian Mars orbiter; first nation to succeed on first attempt. Instruments: MCC, TIS, MSM (methane sensor), LAP, MENCA. Public science data via ISRO ISSDC / PRADAN portals (issdc.gov.in). No surface landing — orbital science only. Reference: equatorial imaging swaths & MSM methane upper limits.",
    lat: 0,
    lon: 75,
    createdAt: 0,
    category: "mission",
    agency: "ISRO",
    status: "Mission complete (orbiter)",
  },
  {
    id: "msn-tgo",
    name: "ESA Trace Gas Orbiter",
    notes:
      "ExoMars TGO (2016–). High-resolution atmosphere spectroscopy; NOMAD & ACS set tight upper limits on methane. CaSSIS surface imaging.",
    lat: 0,
    lon: 0,
    createdAt: 0,
    category: "mission",
    agency: "ESA / Roscosmos",
    status: "Active (orbiter)",
  },
  {
    id: "msn-hope",
    name: "UAE Hope Probe (EMM)",
    notes:
      "Emirates Mars Mission (2021–). First Arab interplanetary mission. Global atmosphere & weather mapping with EMIRS, EXI, EMUS.",
    lat: 0,
    lon: 180,
    createdAt: 0,
    category: "mission",
    agency: "UAESA / MBRSC",
    status: "Active (orbiter)",
  },
  {
    id: "msn-mro",
    name: "Mars Reconnaissance Orbiter",
    notes:
      "NASA MRO (2006–). HiRISE, CRISM, SHARAD — cornerstone for geology, ice, and landing-site certification.",
    lat: 10,
    lon: -50,
    createdAt: 0,
    category: "mission",
    agency: "NASA / JPL",
    status: "Active (orbiter)",
  },
  {
    id: "msn-maven",
    name: "MAVEN",
    notes:
      "NASA Mars atmosphere & volatile evolution mission (2014–). Atmospheric escape, ionosphere, space weather.",
    lat: -10,
    lon: 30,
    createdAt: 0,
    category: "mission",
    agency: "NASA / LASP",
    status: "Active (orbiter)",
  },
  {
    id: "msn-tianwen1-orb",
    name: "Tianwen-1 Orbiter",
    notes:
      "CNSA orbiter supporting Zhurong and ongoing remote sensing (HiRIC, MoRIC, MOSIR, MINPA, etc.). Companion to surface assets in Utopia Planitia.",
    lat: 25,
    lon: 110,
    createdAt: 0,
    category: "mission",
    agency: "CNSA",
    status: "Active (orbiter)",
  },

  // Mineral / resource sites
  {
    id: "min-meridiani",
    name: "Meridiani Planum (Hematite)",
    notes:
      "Orbital hematite signature confirmed by Opportunity as concretions ('blueberries') in sulfate-rich evaporite sandstones. Fe-oxide resource interest.",
    lat: -2.0,
    lon: -5.5,
    createdAt: 0,
    category: "mineral",
    agency: "NASA TES / Opportunity",
  },
  {
    id: "min-nili-olivine",
    name: "Nili Fossae Olivine–Carbonate",
    notes:
      "One of the largest olivine exposures; Mg-carbonates suggest past water–rock interaction. Potential feedstock for ISRU oxygen/metal extraction studies.",
    lat: 21.5,
    lon: 78.5,
    createdAt: 0,
    category: "mineral",
    agency: "NASA CRISM / OMEGA",
  },
  {
    id: "min-medusae",
    name: "Medusae Fossae (Sulfates / Dust)",
    notes:
      "Extensive friable deposits; possible volcanic ash / sulfate-cemented sediments. Dust source region.",
    lat: -5,
    lon: -160,
    createdAt: 0,
    category: "mineral",
  },
  {
    id: "min-syrtis",
    name: "Syrtis Major (Basalt / Pyroxene)",
    notes:
      "Low-albedo volcanic province rich in pyroxene & olivine. Classic telescopic dark region.",
    lat: 8.4,
    lon: 69.5,
    createdAt: 0,
    category: "mineral",
  },
  {
    id: "min-polar-ice",
    name: "North Polar Layered Deposits (H₂O Ice)",
    notes:
      "Kilometers of layered water ice with dust — primary accessible water-ice reservoir for future ISRU.",
    lat: 85,
    lon: 0,
    createdAt: 0,
    category: "mineral",
    agency: "NASA SHARAD / MARSIS",
  },
];

// ---------------------------------------------------------------------------
// Minerals & ores (approximate occurrence)
// ---------------------------------------------------------------------------

export const MINERALS: MineralRecord[] = [
  {
    name: "Iron oxides (hematite, maghemite, nanophase Fe-oxide)",
    formula: "Fe₂O₃ / FeOOH",
    occurrencePct: "~16–18% FeO equivalent in bulk crust; surface dust highly oxidized",
    sites: ["Meridiani Planum", "Global dust", "Gale Crater"],
    notes:
      "Responsible for Mars' red color. Coarse gray hematite at Meridiani confirmed in situ. Nanophase oxides dominate bright dust.",
    source: "NASA TES, Opportunity, Curiosity CheMin",
  },
  {
    name: "Basaltic silicates (plagioclase, pyroxene, olivine)",
    formula: "(Mg,Fe)₂SiO₄ · (Ca,Mg,Fe)SiO₃",
    occurrencePct: "~45–55% of crystalline igneous crust (regionally variable)",
    sites: ["Syrtis Major", "Gusev plains", "Nili Fossae", "Tharsis"],
    notes:
      "Primary igneous assemblage. Olivine-rich units mark relatively unaltered crust or recent exposures.",
    source: "CRISM, OMEGA, Spirit Mini-TES, CheMin",
  },
  {
    name: "Phyllosilicates (smectites, chlorite, kaolinite)",
    formula: "e.g. (Na,Ca)₀.₃(Al,Mg)₂Si₄O₁₀(OH)₂·nH₂O",
    occurrencePct: "~5–15% of Noachian highlands exposures studied from orbit (local beds much higher)",
    sites: ["Mawrth Vallis", "Jezero delta", "Nili Fossae", "Endeavour rim"],
    notes:
      "Clay minerals indicate prolonged water–rock interaction in the Noachian. Priority astrobiology targets.",
    source: "CRISM, OMEGA, Perseverance, Opportunity",
  },
  {
    name: "Sulfates (gypsum, jarosite, kieserite, polyhydrated Mg-sulfates)",
    formula: "CaSO₄·2H₂O, KFe₃(SO₄)₂(OH)₆, MgSO₄·nH₂O",
    occurrencePct: "~2–10% of Hesperian layered terrains; local beds 20–50%+",
    sites: ["Valles Marineris", "Meridiani", "Gale Mount Sharp", "Aram Chaos"],
    notes:
      "Record acidic / evaporative waters. Jarosite at Meridiani was a key Opportunity discovery.",
    source: "OMEGA, CRISM, Opportunity, Curiosity",
  },
  {
    name: "Carbonates (Mg/Fe carbonates)",
    formula: "(Mg,Fe)CO₃",
    occurrencePct: "<1–3% globally; local Nili/Jezero outcrops significantly enriched",
    sites: ["Nili Fossae", "Jezero Crater", "Columbia Hills (Spirit)"],
    notes:
      "Scarcer than expected if Mars had a long-lived CO₂-rich ocean; still critical paleoclimate & CO₂-sink clues.",
    source: "CRISM, Spirit, Perseverance",
  },
  {
    name: "Perchlorates & chlorides",
    formula: "ClO₄⁻, NaCl, MgCl₂",
    occurrencePct: "~0.5–1% perchlorate in Phoenix soils; chlorides in scattered basins",
    sites: ["Phoenix site", "Curiosity sites", "Chloride-bearing basins (southern highlands)"],
    notes:
      "Lower freezing point of brines; oxidize organics during sample heating; ISRU oxidizer candidate.",
    source: "Phoenix MECA/TEGA, Curiosity SAM, MRO",
  },
  {
    name: "Water ice",
    formula: "H₂O (s)",
    occurrencePct: "Polar layered deposits km-thick; mid-latitude glaciers tens of % ice by volume",
    sites: ["Planum Boreum", "Planum Australe", "Korolev Crater", "Mid-latitude lobate debris aprons"],
    notes:
      "Most accessible ISRU resource. Confirmed by Phoenix excavation, SHARAD/MARSIS radar, and impact exposures.",
    source: "Phoenix, SHARAD, MARSIS, HiRISE",
  },
  {
    name: "Silica (opal, hydrothermal SiO₂)",
    formula: "SiO₂·nH₂O",
    occurrencePct: "Local enrichments 50–90% in hydrothermal deposits; trace–few % elsewhere",
    sites: ["Columbia Hills (Spirit)", "Jezero / Nili region outcrops", "Valles Marineris"],
    notes:
      "Hydrothermal & acid-leaching environments; high preservation potential for biosignatures.",
    source: "Spirit Mini-TES/APXS, CRISM",
  },
  {
    name: "Titanium & aluminum oxides",
    formula: "TiO₂, Al₂O₃",
    occurrencePct: "TiO₂ ~0.5–1.5%; Al₂O₃ ~8–12% in bulk basaltic soils (APXS averages)",
    sites: ["Gusev", "Gale", "Meridiani soils"],
    notes:
      "Minor components of basaltic crust and dust; relevant for future metallurgy concepts.",
    source: "APXS (Spirit, Opportunity, Curiosity)",
  },
  {
    name: "Magnesium & iron sulfides / sulfides precursors",
    formula: "e.g. FeS₂ pathways",
    occurrencePct: "Trace; localized reduction chemistry",
    sites: ["Gale (selected veins)", "Impact-altered units"],
    notes:
      "Most sulfur is oxidized to sulfates today; reduced sulfur is rarer but chemically informative.",
    source: "Curiosity CheMin / SAM",
  },
];

// ---------------------------------------------------------------------------
// Organic compounds & related volatiles
// ---------------------------------------------------------------------------

export const ORGANICS: OrganicRecord[] = [
  {
    name: "Methane",
    formula: "CH₄",
    location: "atmosphere",
    abundance:
      "Background ≲ 0.05 ppbv (TGO); Curiosity reported episodic spikes ~7–20+ ppbv and seasonal ~0.2–0.7 ppbv variations",
    detection:
      "Curiosity TLS-SAM (surface); ESA TGO NOMAD/ACS (orbit — strong upper limits); ISRO MOM MSM (upper limits)",
    notes:
      "Most debated Mars volatile. Possible geologic (serpentinization) or biogenic sources; rapid destruction pathways still uncertain. TGO & Curiosity datasets are not fully reconciled.",
    source: "NASA Curiosity, ESA TGO, ISRO MOM",
  },
  {
    name: "Chlorobenzene",
    formula: "C₆H₅Cl",
    location: "surface",
    abundance: "Up to ~150–300 ppb in evolved gas from Cumberland mudstone (order-of-magnitude)",
    detection: "Curiosity SAM GC-MS (Gale Crater, Yellowknife Bay)",
    notes:
      "Likely formed during pyrolysis when indigenous organics react with oxychlorine salts — evidence for organic carbon in ancient mudstones.",
    source: "NASA MSL SAM",
  },
  {
    name: "Dichloroalkanes (e.g. dichloroethane, dichloropropane)",
    formula: "C₂H₄Cl₂ / C₃H₆Cl₂",
    location: "surface",
    abundance: "Tens to low hundreds of ppb in SAM evolved gas (sample-dependent)",
    detection: "Curiosity SAM",
    notes: "Also interpreted as reaction products of organics + perchlorates during heating.",
    source: "NASA MSL SAM",
  },
  {
    name: "Thiophenes & methylthiophenes",
    formula: "C₄H₄S (and alkylated)",
    location: "surface",
    abundance: "ppb-range sulfur organics in Murray formation mudstones",
    detection: "Curiosity SAM (Gale, Pahrump Hills / Mojave / Confidence Hills samples)",
    notes:
      "Heterocyclic organics consistent with diagenetically processed organic matter; sulfurization may aid preservation.",
    source: "NASA MSL SAM (2018 Science results)",
  },
  {
    name: "Aromatics (benzene, toluene, alkylbenzenes)",
    formula: "C₆H₆, C₇H₈, …",
    location: "surface",
    abundance: "ppb-level in evolved gas from selected Gale samples",
    detection: "Curiosity SAM",
    notes: "Fragments of larger macromolecular organic material in ancient sediments.",
    source: "NASA MSL SAM",
  },
  {
    name: "Aliphatic hydrocarbons (fragments)",
    formula: "CₓHᵧ chains",
    location: "surface",
    abundance: "ppb-level; part of macromolecular organic reservoir estimates ~10–100s ppm organic carbon in some mudstones",
    detection: "Curiosity SAM / SHERLOC context",
    notes:
      "Bulk organic carbon is mostly refractory macromolecules; free light organics are scarce due to radiation & oxidants.",
    source: "NASA MSL",
  },
  {
    name: "Carbon dioxide",
    formula: "CO₂",
    location: "both",
    abundance: "95.32% of atmosphere; seasonal polar caps; adsorbed/CO₂ ice",
    detection: "All landed & orbital missions",
    notes: "Dominant volatile controlling pressure cycle; not 'organic' but central carbon reservoir.",
    source: "Viking, MSL REMS, orbiters",
  },
  {
    name: "Carbon monoxide",
    formula: "CO",
    location: "atmosphere",
    abundance: "~0.08% by volume",
    detection: "Orbital IR / sub-mm spectroscopy",
    notes: "Photochemical product; relevant to atmospheric redox state.",
    source: "Multiple orbiters incl. TGO, EMM",
  },
  {
    name: "Formaldehyde / methanol (upper limits / models)",
    formula: "H₂CO / CH₃OH",
    location: "atmosphere",
    abundance: "Not robustly confirmed at high confidence; strict upper limits from TGO-class instruments",
    detection: "Orbital spectroscopy campaigns",
    notes: "Often discussed in methane oxidation chains; detections remain unconfirmed or contested.",
    source: "ESA TGO literature",
  },
  {
    name: "Hydrogen peroxide",
    formula: "H₂O₂",
    location: "atmosphere",
    abundance: "~10–40 ppbv (seasonally variable)",
    detection: "Ground-based IR & orbital instruments",
    notes: "Strong oxidant; contributes to destruction of surface organics.",
    source: "Ground-based + orbital remote sensing",
  },
  {
    name: "Ozone",
    formula: "O₃",
    location: "atmosphere",
    abundance: "ppbv-range; anti-correlated with water vapor",
    detection: "SPICAM, NOMAD, ground-based",
    notes: "Tracer of atmospheric photochemistry; polar winter enhancements.",
    source: "ESA Mars Express / TGO",
  },
  {
    name: "Molecular oxygen",
    formula: "O₂",
    location: "atmosphere",
    abundance: "~0.13% (Curiosity reported unexpected seasonal variations)",
    detection: "Curiosity SAM-QMS; orbital",
    notes: "Seasonal O₂ variations larger than simple photochemical models predict.",
    source: "NASA Curiosity",
  },
  {
    name: "Meteoritic organics (ALH84001 & SNC suite)",
    formula: "PAHs, amino-acid contaminants debated",
    location: "surface",
    abundance: "ppb–ppm in meteorite samples (Earth labs)",
    detection: "Laboratory analysis of Martian meteorites",
    notes:
      "Demonstrate delivery of complex carbon; terrestrial contamination must be carefully controlled. Not the same as in-situ SAM detections.",
    source: "Meteorite labs worldwide",
  },
];

export const DATA_SOURCES = [
  {
    agency: "NASA / JPL / USGS",
    assets: "MOLA, HiRISE, CRISM, Curiosity, Perseverance, Ingenuity, MRO, MAVEN, Viking, MER",
    url: "https://mars.nasa.gov",
  },
  {
    agency: "ESA",
    assets: "Mars Express, Trace Gas Orbiter (NOMAD, ACS, CaSSIS), ExoMars program",
    url: "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars",
  },
  {
    agency: "ISRO",
    assets: "Mars Orbiter Mission (Mangalyaan) — MCC, MSM, TIS, LAP, MENCA; data via ISSDC / PRADAN",
    url: "https://www.issdc.gov.in",
  },
  {
    agency: "CNSA",
    assets: "Tianwen-1 orbiter + Zhurong rover (Utopia Planitia)",
    url: "http://www.cnsa.gov.cn",
  },
  {
    agency: "UAESA / MBRSC",
    assets: "Hope Probe (Emirates Mars Mission)",
    url: "https://www.emiratesmarsmission.ae",
  },
  {
    agency: "IAU / USGS Astrogeology",
    assets: "Nomenclature, MOLA datum, prime meridian (Airy-0)",
    url: "https://astrogeology.usgs.gov",
  },
];

export const CATEGORY_META: Record<
  MarkerCategory,
  { label: string; color: string; hex: number }
> = {
  crater: { label: "Craters & basins", color: "text-amber-300", hex: 0xfbbf24 },
  volcano: { label: "Volcanoes", color: "text-orange-400", hex: 0xf97316 },
  mission: { label: "Missions & rovers", color: "text-sky-400", hex: 0x38bdf8 },
  pole: { label: "Poles", color: "text-cyan-200", hex: 0xa5f3fc },
  mineral: { label: "Mineral sites", color: "text-emerald-400", hex: 0x34d399 },
  landmark: { label: "Landmarks", color: "text-violet-300", hex: 0xc4b5fd },
  custom: { label: "Custom marks", color: "text-rose-300", hex: 0xfda4af },
};
