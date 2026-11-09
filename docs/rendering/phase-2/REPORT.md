# Cataluña II · Phase 2 · WebGL renderer configuration

Date: 2026-11-09 · Route: `/demos/cataluna-ii` · Only file changed: `components/three/demos/selector/SelectorExperience.tsx`

## 1. Current architecture (analysis)

| Piece | What it is |
|---|---|
| Three.js | r187 (`three@0.187.0`), through React Three Fiber 9.8.2 + drei 10.7.9 |
| Renderer | One `WebGLRenderer`, created by R3F's `<Canvas>` in `SelectorExperience.tsx`. No other renderer on the page. |
| Scene | `SelectorScene.tsx`: lighting, procedural building (`EdificioModel` / `CatalunaArchitecture`, merged geometry per floor and material), 2D Google map ground, map buildings, clouds, intro, contact shadows, post-processing |
| Camera | Perspective, fov 40, near 0.5, far 2000 (map view). `MapIntro` drives it during the arrival; `CameraRig` (orbit controls) takes over afterwards |
| Lighting | `EdificioLighting.tsx`: sky dome, fog, ambient + hemisphere, one sun with a 4096² shadow map (desktop), drei `SoftShadows` (PCSS), drei `Environment preset="city"` |
| Shadows | Renderer shadow map on desktop only; drei `ContactShadows` under the tower |
| Materials | `MeshStandardMaterial` / `MeshPhysicalMaterial` (glass), canvas textures set to sRGB |
| GLB | **No GLB in this demo.** The building is generated at runtime from the facade reconstruction data. (GLB loading is used by other demos only.) |
| Post-processing | Desktop: `PostFX` composer (MSAA ×4, SSAO, ACES tone mapping, saturation, vignette). The composer turns the renderer's own tone mapping off and does ACES itself. Mobile: no composer, renderer does ACES. |
| Loop | R3F's single `requestAnimationFrame` loop; drei `PerformanceMonitor` lowers/raises resolution |
| Google Maps | `MapGround.tsx`: 2D Map Tiles API (satellite → street plan), sRGB textures, max anisotropy. 3D tiles only with `?geo=3d` (own composer in `GeoAtmosphere`) |
| Clouds | `MapClouds.tsx`: drei `Clouds` with runtime puff texture + drifting cloud-shadow plane |

## 2. Renderer configuration: before → after

| Setting | Before | After | Why |
|---|---|---|---|
| `antialias` | `!isMobile` (desktop on, mobile off) | on only when no composer draws the frame (mobile 2D map); off on desktop and in the 3D-tiles view | The composer renders into its own MSAA ×4 target and draws a single full-screen quad to the canvas, so canvas MSAA there was pure memory cost. Mobile had no AA at all. |
| Pixel ratio | fixed `2` desktop / `1.5` mobile, regardless of the screen | `min(devicePixelRatio, 2)` desktop / `min(devicePixelRatio, 1.5)` mobile | A 1× monitor was rendering 4× the pixels |
| Adaptive floor | `0.75` | `1` (or the screen's DPR if lower) | Below 1 the facade lines go soft |
| Shadow map type | `shadows={true}` → asks for `PCFSoftShadowMap`, removed in r187 (console warning, fallback to PCF) | `shadows="percentage"` → `PCFShadowMap` | r187-native. drei `SoftShadows` still swaps in its PCSS path on desktop exactly as before |
| `outputColorSpace` | implicit sRGB (R3F default) | explicit `SRGBColorSpace` | Same value, now stated |
| Tone mapping | ACES Filmic, exposure 1.05 | unchanged | Preserves the reconstructed facade's look |
| `powerPreference` | `high-performance` | unchanged | |

Not changed: scene, lights, materials, building geometry, clouds, camera, intro, `CameraRig`, Google Maps code, other demos. The homepage's embedded "El resultado" selector uses the same component, so it gets the same settings.

## 3. Color management

- `ColorManagement.enabled = true`, output sRGB, linear working space: correct.
- All color textures are sRGB: map tiles (`MapGround`), street-number plate (`CatalunaArchitecture`). Cloud puff (white) and cloud shadow (black + alpha) are not affected by color space.
- Material colors in hex are converted from sRGB by three automatically.
- Desktop: ACES is applied once, by the composer (renderer tone mapping is off there). Mobile: once, by the renderer. No double tone mapping.
- Before/after screenshots show the same tones and exposure.

## 4. Measurements

Machine: Intel Iris Plus (integrated), Chrome headless with GPU (ANGLE D3D11). "Render ms" = time to run the frame and `gl.finish()`. Numbers vary ±15% between runs (laptop heat), so the key comparisons were run back to back.

**Sky arrival animation (1280×720, 1×), during the descent**

| | Resolution | FPS |
|---|---|---|
| Before | 1320×1080 (still 1.5× on a 1× screen) | 10.2 / 10.8 |
| After | 880×720 (1×) | 18.7 / 19.6 |

**Steady orbit view**

| Viewport | Before | After |
|---|---|---|
| 1280×720 @1× | 660×540 (dropped to 0.75), 19 FPS | 880×720 (1×, sharper), 19 FPS |
| 1920×1080 @1× (A/B at 15 s) | 1900×1350 (still 1.25×), 8 FPS | 1520×1080 (1×), 15–17 FPS |
| 1440×900 @2× | 780×675 (0.75), 18 FPS | 1040×900 (1×), 19 FPS |
| 390×844 @3× mobile | 585×886, no AA, 3 ms | 585×886, MSAA, 7 ms (100+ FPS) |

- Draw calls / triangles (unchanged): desktop 435 / ~400 k per frame, mobile 168 / ~92 k.
- Memory freed on desktop (canvas MSAA ×4 color+depth no longer allocated): ~20 MB at 1280×720, ~52 MB at 1920×1080, up to ~166 MB on a 2× screen at full resolution. Mobile adds ~17 MB for its MSAA buffer.
- Load time to first canvas: 3–7 s both before and after (no change expected; no assets added).
- Console: the `PCFSoftShadowMap has been removed` warning is gone. Remaining warning (`THREE.Clock deprecated`) comes from R3F itself.

**What costs the most (measured by turning one piece off at a time, 1280×720 @1×, median ~43 ms)**

| Off | Median ms | Note |
|---|---|---|
| Sun shadow map 4096² → 2048² | ~27 | biggest single cost, but 2048² shows grainier shadows on the facade (see screenshots) |
| ContactShadows | ~35 | re-renders the scene every frame |
| Whole PostFX | ~30 | |
| Composer MSAA | ~38 | |
| PCSS SoftShadows | ~41 | |
| SSAO | ~44 | within noise |
| Clouds | ~41 | within noise |
| Shadow map updates frozen | ~45 | no gain: the cost is sampling, not redrawing |

These are lighting / shadow / post-processing choices, so they were measured but **not changed** in this phase.

## 5. Visual differences

- Desktop: same colors and light; facade lines, railings and window frames are crisper because the view no longer falls back to 0.75× resolution. (`before-desktop-frente.png` vs `after-desktop-frente.png`)
- Mobile: railings and balusters no longer break into jagged stripes. (`before-mobile-frente.png` vs `after-mobile-frente.png`)
- Arrival animation, clouds, satellite → plan blend, Google attribution: unchanged (`after-arrival.png`).
- Clouds sit in slightly different places between shots because they drift in real time.

## 6. Compatibility notes

- three r187 removed `PCFSoftShadowMap`; R3F 9.8.2 still maps `shadows={true}` to it. Fixed here by naming the type.
- drei `SoftShadows` on r187 switches the renderer to `BasicShadowMap` while mounted (it needs raw depth) and restores the previous type when removed. Works; D3D compiles of its shader print harmless `X4000` warnings.
- `antialias` is fixed when the WebGL context is created. Resizing a desktop window below 768 px wide keeps the desktop setting until reload (same limitation as before).
- `n8ao` crashes on r187 (already noted in `PostFX.tsx`).

## 7. Recommendations for the next phase

1. **Shadows (largest win):** keep 2048² but fit the sun's shadow camera tightly around the tower and nearby blocks (now ±70 m). That keeps 4096²-level sharpness on the building at ~40% less frame time. Revisit the PCSS sample count at the same time.
2. **ContactShadows:** render once (`frames={1}`) or bake it; the tower doesn't move.
3. **HDRI:** replace `Environment preset="city"` with a real HDRI (PMREM) that matches the afternoon sun; test with `environmentIntensity` against exposure 1.05.
4. **Tone mapping:** try `AgXToneMapping` / `NeutralToneMapping` (r162+) against ACES for whites on the facade.
5. **PerformanceMonitor:** lower effect quality (SSAO samples, shadow size) before resolution when the GPU is weak.
6. Replace R3F's deprecated `THREE.Clock` warning when R3F ships a fix (upstream).
