# KadalApi 3D Three.js Integration & 3D Fox Runner Upgrade

Integrate Three.js into the KadalApi portfolio by transforming the hero mascot into an interactive 3D voxel fox stage with real-time kinematics and upgrading the Fox Runner arcade mini-game into a fully playable 3D third-person voxel runner.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during the planning interview and define the technical and visual scope:

- **Confirmed Decision 1 (Placement)**: 3D Three.js will be featured in the **Hero Mascot Stage** (replacing the static SVG with an interactive 3D low-poly voxel fox on a floating grassy floating island) and in the **Retro Arcade Modal** (transforming Fox Runner into a 3D third-person runner).
- **Confirmed Decision 2 (Visual Style)**: **Low-poly voxel retro pixel art style**, matching the authentic retro-gaming identity of the portfolio (`#F97316` fox body, `#EA6A0C` shading, `#FFF8EF` chest/cheeks, `#15130F` outlines/paws, and `#2F9E44` grass blocks).
- **Confirmed Decision 3 (Arcade Upgrade)**: Upgrade the 2D canvas runner to **Fox Runner 3D**, featuring a third-person chase camera, procedural voxel obstacles (boulders, cacti), collectible pixel energy stars, 3D jump and double-jump somersaults, and Web Audio API 8-bit chiptune sound synthesis.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **3D Hero Voxel Fox Stage**: Renders a rich, multi-part procedural 3D voxel fox perched on a retro voxel grass pedestal. The mascot's head and eyes track the visitor's cursor with smooth spring kinematics, reacts to clicks with joyful salto somersaults and click-burst particles, and seamlessly launches the 3D arcade game.
  2. **Fox Runner 3D: Pixel Dash**: An immersive third-person arcade runner inside the retro arcade cabinet modal. The 3D camera glides behind Fox_404 as players dodge low-poly boulders and voxel obstacles, collect rotating 3D floating power stars, and leap with double-jump flips.
  3. **Performance & Device Guard**: Uses `isSoftwareGl` detection and lightweight voxel geometry (`BoxGeometry` / instanced blocks) with optimized rendering on demand for the hero and high-performance delta-timed loops for the game.
- **Target Audience**: Prospective clients, tech recruiters, and software engineering enthusiasts exploring Dhaifan's portfolio.
- **Key Value**: Instantly showcases advanced software engineering and 3D web graphics capability while preserving the portfolio's iconic retro identity and fast load times.

---

## 2. User Experience & Visual Design

### A. Key User Flows
1. **Hero Mascot Interaction**:
   - Visitors land on the page; the 3D voxel fox on its floating grass island greets them with subtle breathing animations and turns its head toward their mouse cursor.
   - Hovering triggers interactive tilt. Clicking the fox triggers an animated 360-degree somersault flip, hit counter (`+1`, `+2`), speech bubble line, and transitions into the 3D arcade cabinet.
2. **Fox Runner 3D Gameplay**:
   - The retro arcade cabinet modal opens with HUD elements (Score, Best High Score, Level).
   - Pressing **SPACE** / **UP** or tapping on mobile initiates the run. The 3D voxel ground flows backward beneath Fox_404.
   - Obstacles approach along the track. Single jump clears low obstacles; double jump triggers a 360-degree aerial flip to clear tall voxel cacti.
   - CRT scanlines toggle and Web Audio chiptune mute toggles remain fully functional.

### B. Visual Identity & Palette
- **Dominant Palette**:
  - Mascot: Deep Orange (`#F97316`), Amber Shade (`#EA6A0C`), Soft Cream (`#FFF8EF`), Dark Charcoal (`#15130F`), Chestnut Paws (`#4A2A12`).
  - Terrain: Retro Grass Green (`#2F9E44`, `#3EBE57`), Dirt/Voxel Underlayer (`#4A2A12`).
  - Lighting: Warm directional key light (`#FFF5EB`) with cool ambient hemisphere light (`#38BDF8` sky / `#1E293B` ground) and subtle contact grounding shadows.
- **Typography & Theme Integration**:
  - Preserves Silkscreen and DotGothic16 pixel fonts for HUD, badges, and controls.
  - Seamlessly respects the user's Dark / Light mode toggle.

---

## 3. Key Product Decisions & Trade-Offs

- **Procedural Voxel Assembly vs. External GLTF Models**:
  - *Chosen Approach*: Procedural Three.js voxel geometry constructed using nested `THREE.Group` parts and optimized box primitives.
  - *Why*: Guarantees **zero 404 network errors**, instant loading without waiting for heavy external 3D asset downloads, perfect color calibration, and zero dependency on unverified 3D model hosts.
- **Three.js Dependency**:
  - *Chosen Approach*: Install `three` and `@types/three` via standard npm.
  - *Why*: Industry standard, lightweight when bundled with tree-shaking, robust WebGL support across desktop and mobile.
- **Arcade Screen Rendering**:
  - *Chosen Approach*: WebGLRenderer attached directly to the arcade screen wrapper, replacing the 2D canvas context while retaining the CRT shader/overlay and Web Audio synth.
  - *Why*: Provides high visual fidelity while preserving existing HUD components, high score storage, and audio effects.

---

## 4. Technical Architecture & Data Strategy

### System & Component Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App.tsx (Global State)                          │
│        (Theme, Language, Projects, Modals, High Score Store)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
┌───────────────────────────────────┐       ┌───────────────────────────────────┐
│        Hero.tsx (Hero Section)    │       │     FoxRunnerModal.tsx (Arcade)   │
│ ┌───────────────────────────────┐ │       │ ┌───────────────────────────────┐ │
│ │  HeroVoxelFox3D.tsx (Three.js)│ │       │ │   FoxRunner3DCanvas.tsx       │ │
│ │ - Procedural Voxel Mascot     │ │       │ │ - Third-person chase camera   │ │
│ │ - Floating Grass Pedestal     │ │       │ │ - Voxel obstacle spawner      │ │
│ │ - Head/Eye cursor tracking    │ │       │ │ - Jump/Double-jump kinematics │ │
│ │ - Click salto somersault      │ │       │ │ - Contact shadow & fog depth  │ │
│ └───────────────────────────────┘ │       │ └───────────────────────────────┘ │
│ - Semantic typography & badges    │       │ - Arcade Cabinet HUD & Tools      │
│ - CTA buttons & click dialogue    │       │ - Web Audio Chiptune Synthesizer  │
└───────────────────────────────────┘       └───────────────────────────────────┘
```

### Technical Implementation Steps
1. **Dependency Installation**: Install `three` and `@types/three`.
2. **Hero Voxel 3D Mascot (`src/components/HeroVoxelFox3D.tsx`)**:
   - Construct modular procedural voxel Fox (Head, Ears, Snout, Body, Tail, Legs) inside a `THREE.Group`.
   - Add floating voxel grass island with soil layers and scattered grass tufts.
   - Add mouse-tracking lerp kinematics for head rotation and jumping salto state machine.
   - Add responsive canvas container with resize handling.
3. **Hero Integration (`src/components/Hero.tsx`)**:
   - Replace the SVG fox stage with `HeroVoxelFox3D`, retaining the dialogue bubble, click hit counter (`+1`), and arcade trigger callback.
4. **Fox Runner 3D Upgrade (`src/components/FoxRunner3DCanvas.tsx` & `FoxRunnerModal.tsx`)**:
   - Create a 3D procedural track with moving floor grids and side scenery.
   - Implement Fox character with run cycle, vertical jump, double-jump rotation, and collision bounding boxes.
   - Implement obstacle generation (voxel cacti, stone cubes) and floating collectible stars.
   - Synchronize score, high score (localStorage), level progression, and Web Audio API chiptune triggers.
5. **Build Verification**:
   - Verify complete build with `lint_applet` and `compile_applet`.
