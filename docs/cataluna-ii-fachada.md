# Cataluña II: facade reconstruction (Nov 2026)

The building in `/demos/cataluna-ii` is rebuilt from the developer's brochure
`CATALUÑA 25.10.25.pdf` (40 pages). Page 1 (daytime street elevation) is the reference for
the geometry, and page 3 (night view) is secondary. Floor programme from pages 11–21.

Before: a generic procedural tower, 24 × 17 m, 12 floors, 48 units (P01-A … P12-D),
full-height glazing on four sides, glass railings, fins, a pool on the roof.
After: Cataluña II, 10.5 m frontage, ground floor + 6 floors + roof terrace, 15 units.

Comparison sheet: `docs/cataluna-ii-comparacion.png` (page 1 next to `?vista=frente`,
details, before/after). Open `/demos/cataluna-ii?vista=frente` for the straight-on elevation
(no auto-rotation, no "for sale" tint).

## How it is measured

Page 1 rendered at 2000 px wide: ≈ 50 px per meter, taken from the pedestrians (1.65 m).
Frontage 530 px → 10.5 m. Floor pitch 150 px → 3.05 m. Sidewalk to floor 1 frame bottom
≈ 4.9 m → ground floor 5.1 m. Total to the top of the roof frame ≈ 25.9 m.
Floor plans: two street units side by side on floors 1–3 (unit 103 is 5.15 m wide, 8.66 m deep).

## Files

| File | Role |
| --- | --- |
| `lib/three/cataluna-ii.ts` | Config, the 15 units (areas from the unit sheets), layout, facade rules (frames, windows, railings), unit data |
| `lib/three/cataluna-ii-parts.ts` | All architecture as solid parts (boxes, cylinders, blobs) per level and material |
| `components/three/demos/selector/CatalunaArchitecture.tsx` | Merges parts into one mesh per level/material, materials, "2771" plate |
| `components/three/demos/selector/EdificioModel.tsx` | Units (click targets), status shells, cards, open plan, ghost floors (kept) |

Other changes: `building-layout.ts` dispatches on `config.kind`. `SelectorExperience` uses the
new config, aims the unit camera from the unit's real position and adds `?vista=frente`. The sun
study uses the new facades. The demo page and the homepage embed use the slug `cataluna-ii`.
`site.ts` moves the address offset so the deeper building keeps its facade on the lot line.
The API serves the brochure units until the project is seeded, and `db/seed.ts` has the
project. The `edificio-demo` project, its 48 units and `/admin` are unchanged.

## Architectural modifications

- Volume: 24 × 17 m × 12 floors → 10.5 × 22 m, 5.1 m ground floor + 6 × 3.05 m + terrace.
- Street facade only on +Z. Side walls are blind party walls (medianeras).
- Staggered grey frame boxes: floors 1, 3, 5 frame the center and right bays, floors 2 and 4
  the left and center bays, floor 6 the full width.
- Three window bays per floor: left 2.56 m (3 panes), center 1.76 m (2 panes, transom at
  guard height), right 2.84 m (3 panes, fixed right pane with transom). Black aluminium.
- Black bar railings (1.0 m, bars every 12 cm) with side returns. Inside a frame the railing is
  wide; on the unframed side it is short, on its own white balcony slab. Floor 6 is continuous.
- White edge pilasters on both lot lines; white slab edges between frames.
- Ground floor: black slatted side-access gate (left) and garage gate (right), white portico
  beam with a thin left leg, 4 steps to a raised glazed hall, two round columns, planters,
  "2771" pier, white vertical boards above the gates, dark garage recess.
- Roof: grey frame (4 posts + ring beam, 2.4 m), black pergola with slats running front to
  back, black railing, two palms in planters, 4 planters with shrubs, hanging climbers,
  light grey stair/lift block on the core.

## Reconstructed 3D elements (all real geometry, no textures)

Floor slabs, unit volumes, stair/lift core, quincho volume, grey frame bands and sides,
window frames, mullions, transoms, glass and curtain panes, balcony slabs, railing rails,
bars and returns, pilasters, gates (frame, lintel, slats), garage boards, portico beam and
legs, steps, landing, hall glazing and mullions, round columns, planters, street-number pier,
roof slab, deck, parapets, roof frame posts and beams, pergola beams and slats, stair/lift
block, palms (trunk + fronds), shrubs, hanging plants. The only texture is the "2771"
lettering on the pier.

## Reused existing elements

Unit hit volumes and their click/hover handlers, status shells, floating unit cards, the open
unit plan, the ghost of the floors above an isolated floor, camera rig and viewpoints logic,
floor selector, info panel, sun-hours worker, map/city environment, lighting and post FX.
The old tower geometry was not reusable (wrong width, floor count and facade), so it is replaced.

## Assumptions (not determinable from the brochure)

- Depth 22 m, full-width rear wing. The plans suggest the rear wing may be narrower, with a
  side patio, but no dimension is given.
- Party wall between the two street units at the center (x = 0). It crosses the center window.
- Which street unit is on the left: 102 / 201 / 301 left, 103 / 202 / 302 right. 101 and the
  quincho at the rear (101 has no balcony).
- Rear facade: two windows per floor and a 7.2 × 0.9 m balcony (6.5 m², from the unit sheets)
  on floors 2–6. Not shown in any render.
- Roof terrace 6.6 m deep. The rest of the roof is plain, with parapets.
- Frame and balcony projection 0.9 m. Railing height 1.0 m.
- Prices and statuses are illustrative, like the rest of the demo.

## Remaining differences from page 1

- The stair/lift block sits on the core (8.7 m back, as in the plans). The render shows it
  above the pergola; with the selector's 40° lens it hides behind the frame up close.
- Plants are simple shapes (blobs, blades, strands), not foliage.
- Glass is not see-through. The render shows furniture and curtains behind it; here panes are
  dark glass or white curtain.
- The neighbours (red brick house, tiled roofs) are not modelled. The map shows the real lots' footprints.
- Page 3 (night lighting, warm windows, soffit downlights) is not reproduced: lighting work
  was out of scope for this phase.

## Database

`npm run db:seed` adds the `cataluna-ii` project and its 15 units (existing projects and units are
left untouched). After that, `/admin` can edit them and the API reads them from the database.
Until then the API serves the same data from `lib/three/cataluna-ii.ts`.
