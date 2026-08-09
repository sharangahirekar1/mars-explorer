# Mars Explorer

Interactive 3D Mars globe built with [Fresh](https://fresh.deno.dev) + Three.js.

## Features

- **Elevation-colored surface** — blend true-color Mars imagery with a MOLA-style height colormap (basins → plains → highlands → peaks)
- **Catalog markers** — craters, volcanoes, poles, mineral sites, and mission landing/orbital references (Perseverance, Ingenuity, Curiosity, Zhurong/Tianwen-1, ISRO MOM, ESA TGO, UAE Hope, …)
- **Editable notes** — coordinates + free-form notes stored in `localStorage` (Markers panel)
- **Lat/lon grid** — optional coordinate overlay (off by default)
- **Fictional MTZ time zones** — 24 × 15° mean-solar-time bands for regional sol comparison
- **Right data panel** — accordion UI for physical metrics, atmosphere %, minerals/ores, organics/volatiles, and agency sources (NASA, ESA, ISRO ISSDC/PRADAN, CNSA, UAESA)

## Run

```bash
deno task start
```

Open http://localhost:8000

## Controls

| Action | Input |
|--------|--------|
| Orbit | Left-drag |
| Pan | Right-drag |
| Zoom | Scroll |
| Mark custom site | Double-click globe |
| Fly to marker | Click pin or list item |
| Rotate planet | ← → ↑ ↓ or bottom buttons |

## Data notes

Scientific values are educational summaries from public mission results (NASA/JPL/USGS, ESA, ISRO MOM via ISSDC, CNSA Tianwen-1, UAE Hope). Mineral percentages are approximate crustal/regional ranges, not a single global assay. Tiangong is Earth’s space station — the Mars surface asset is **Tianwen-1 / Zhurong**.

Textures: `static/textures/mars_color.jpg`, `mars_bump.jpg`.
