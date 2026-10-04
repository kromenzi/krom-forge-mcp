---
name: krom-3d-design-studio
version: 1.0.0
description: >
  Professional 3D art-direction and implementation skill for KROM Forge v75.
  Designs and reviews true 3D, pseudo-3D, glassmorphism, depth systems,
  interactive scenes, dashboards, landing pages, posters, icons and spatial UI
  while preserving usability, responsiveness, accessibility and performance.
compatibility: "KROM Forge v75"
category: "3d-ui-ux-visual-design"
languages:
  - ar
  - en
---

# KROM 3D Design Studio

## 1. Mission

Use this skill to create, improve, inspect, or implement professional 3D visual experiences.

The skill covers:

- 3D web interfaces
- 3D dashboards
- 3D landing pages
- hero sections
- 3D cards
- glass panels
- floating UI
- 3D icons
- product presentation
- industrial visualization
- technical visualization
- spatial UI
- posters and banners
- logo presentation
- animated backgrounds
- command centers
- control panels
- data visualization
- interactive scenes

The required operating model is:

**BRIEF → 3D MODE DECISION → ART DIRECTION → SCENE → DEPTH → LIGHT → MATERIAL → MOTION → RESPONSIVE → ACCESSIBILITY → PERFORMANCE → VISUAL VERIFY**

The goal is not to maximize effects.

The goal is to create **controlled depth, visual hierarchy, realism or stylization, and high-quality interaction without damaging usability**.

---

# 2. Trigger Conditions

Activate this skill when the user asks to:

- صمم 3D.
- حول التصميم إلى 3D.
- خلي الواجهة ثلاثية الأبعاد.
- سوي داشبورد 3D.
- سوي كروت 3D.
- صمم صفحة هبوط 3D.
- صمم بوستر 3D.
- صمم أيقونات 3D.
- أضف تأثيرات عمق.
- أضف glass / glow / perspective.
- استخدم Three.js.
- استخدم React Three Fiber.
- استخدم WebGL.
- اصنع مشهد تفاعلي.
- improve visual depth.
- create premium 3D UI.
- add spatial UI.
- build interactive 3D experience.
- review 3D design quality.
- optimize a 3D interface.

Also activate when an interface looks:

- flat
- visually weak
- generic
- low depth
- poorly lit
- overly glossy
- overloaded with effects
- inconsistent in perspective
- heavy or slow because of 3D
- unusable on mobile

---

# 3. Core Principle

**3D is a hierarchy tool, not decoration.**

Every 3D effect must support at least one of:

- hierarchy
- focus
- interaction
- orientation
- realism
- brand identity
- information grouping
- status communication
- navigation
- storytelling

If an effect supports none of these, remove or reduce it.

---

# 4. First Decision — Choose the Correct 3D Mode

Before implementation, classify the design into one of these modes.

## MODE A — TRUE_3D

Use actual 3D rendering when the experience requires:

- 3D geometry
- orbit/rotation
- real perspective
- 3D environments
- product models
- animated objects
- spatial interaction
- physically based lighting
- camera movement
- model inspection
- scene-based storytelling

Typical technologies:

- Three.js
- React Three Fiber
- Drei
- WebGL
- WebGPU where justified
- GLTF / GLB
- shaders
- post-processing

---

## MODE B — HYBRID_3D

Use HTML/CSS UI with limited real 3D elements.

Best for:

- dashboards
- enterprise platforms
- admin systems
- safety systems
- monitoring systems
- hero sections
- premium cards
- command centers

Typical composition:

```text
HTML/CSS UI
+
CSS perspective/depth
+
SVG
+
small WebGL/R3F scene
+
motion
```

This is usually the preferred mode for application interfaces.

---

## MODE C — PSEUDO_3D

Simulate depth without a WebGL scene.

Use:

- CSS transforms
- gradients
- layered shadows
- highlights
- perspective
- blur
- SVG
- masks
- layered images
- subtle motion

Best for:

- forms
- admin pages
- mobile-heavy interfaces
- dense dashboards
- performance-sensitive applications
- print-inspired layouts

---

## MODE D — STATIC_3D_ART

Use rendered 3D-looking imagery instead of runtime geometry.

Best for:

- posters
- hero artwork
- banners
- presentation visuals
- campaign graphics
- backgrounds
- branding assets

---

# 5. 3D Mode Decision Matrix

Use the simplest mode that satisfies the requirement.

| Requirement | Preferred mode |
|---|---|
| Enterprise dashboard | HYBRID_3D |
| Admin form | PSEUDO_3D |
| Interactive machine model | TRUE_3D |
| Product configurator | TRUE_3D |
| Hero with floating object | HYBRID_3D |
| Mobile-heavy control panel | PSEUDO_3D |
| Poster | STATIC_3D_ART |
| 3D logo showcase | HYBRID_3D / TRUE_3D |
| Dense analytics | PSEUDO_3D / HYBRID_3D |
| Virtual environment | TRUE_3D |

Never choose TRUE_3D only because it appears more advanced.

---

# 6. KROM Forge v75 Tool Contract

## Required tools

Use when applicable:

1. `krom_route_workflow`
2. `krom_select_tools`
3. `krom_build_task_graph`
4. `krom_audit_ui`
5. `krom_audit_responsive`
6. `krom_audit_rtl`
7. `krom_audit_accessibility`
8. `krom_build_design_system`
9. `krom_generate_ui_fix_plan`
10. `krom_evaluate_performance_budgets`
11. `krom_verify_evidence`
12. `krom_review_diff`
13. `krom_verify_patch_evidence`

## Optional orchestration tools

Use when needed:

- `krom_inspect_project`
- `krom_inventory_dependencies`
- `krom_plan_code_change`
- `krom_prepare_patch`
- `krom_assess_patch_risk`
- `krom_generate_test_plan`
- `krom_route_agent`
- `krom_coordinate_agents`
- `krom_evaluate_agent_run`
- `krom_evaluate_production_readiness`

## External host capabilities

When available, use:

- browser
- Figma
- image generation
- screenshot evidence
- local execution
- GitHub
- deployment preview

Never claim the visual result has been rendered if no renderer/browser evidence exists.

---

# 7. Design Brief

Before designing, establish:

```text
Project:
Surface:
Audience:
Primary goal:
Secondary goal:
Brand:
Visual tone:
3D mode:
Interaction level:
Target devices:
RTL/LTR:
Dark/light:
Performance sensitivity:
Accessibility requirements:
Existing design system:
Existing assets:
```

If some items are unknown, use conservative defaults.

Do not block progress for non-critical ambiguity.

---

# 8. Visual Direction

Choose one dominant art direction.

Possible directions:

- INDUSTRIAL_TECH
- PREMIUM_DARK
- CLEAN_FUTURISTIC
- GLASS_DEPTH
- SOFT_CLAY
- METALLIC
- NEON_TECH
- MINIMAL_SPATIAL
- HIGH_CONTRAST_CONTROL_ROOM
- REALISTIC_PRODUCT
- ISOMETRIC_TECHNICAL
- HOLOGRAPHIC
- CORPORATE_PREMIUM

Do not mix unrelated styles without a deliberate hierarchy.

---

# 9. Scene Architecture

Every 3D composition must define layers.

Recommended structure:

```text
L0 — BACKGROUND
L1 — ATMOSPHERE
L2 — FAR OBJECTS
L3 — MAIN SCENE
L4 — PRIMARY UI
L5 — FLOATING UI
L6 — INTERACTION FEEDBACK
L7 — MODALS / CRITICAL OVERLAYS
```

The user must always understand which layer is interactive.

---

# 10. Depth System

Do not use random z-values.

Create a depth token system.

Example:

```text
depth-0   = base surface
depth-1   = raised card
depth-2   = selected card
depth-3   = floating control
depth-4   = navigation overlay
depth-5   = modal / critical alert
```

Pseudo-3D example:

```css
--depth-0: 0px;
--depth-1: 8px;
--depth-2: 18px;
--depth-3: 32px;
--depth-4: 56px;
--depth-5: 96px;
```

Depth must correlate with importance.

---

# 11. Perspective Rules

Use one primary perspective system per section.

Avoid mixing:

- conflicting vanishing points
- random card tilts
- inconsistent horizon lines
- conflicting camera angles

For UI:

- keep tilt subtle
- keep text planes readable
- do not rotate important text excessively
- do not force users to decode perspective

Recommended UI ranges:

```text
Card tilt:
2°–8° normal
8°–14° only for hero/feature moments

Perspective:
800px–1800px typical CSS UI range

Hover lift:
2px–12px depending on scale
```

These are design heuristics, not mandatory constants.

---

# 12. Camera System for True 3D

Define:

```text
Camera type:
FOV:
Position:
Target:
Near:
Far:
Movement:
Constraints:
Mobile behavior:
```

Recommended principles:

- avoid excessive FOV distortion
- maintain stable focal hierarchy
- constrain orbit controls
- prevent camera clipping
- prevent disorientation
- disable unnecessary camera motion on mobile
- respect `prefers-reduced-motion`

Never use uncontrolled camera movement in a dense application UI.

---

# 13. Composition

Use:

- foreground
- midground
- background
- focal object
- counterbalance
- negative space
- directional lighting
- depth cues

A strong 3D composition must remain understandable when motion stops.

---

# 14. Lighting System

Use a deliberate lighting hierarchy.

Typical stack:

```text
KEY LIGHT
FILL LIGHT
RIM LIGHT
AMBIENT / ENVIRONMENT
OPTIONAL ACCENT LIGHT
```

Each light needs a purpose.

## Key light
Defines primary form.

## Fill light
Controls shadow severity.

## Rim light
Separates subject from background.

## Ambient/environment
Prevents dead black areas and helps material readability.

## Accent light
Supports status or branding.

---

# 15. Lighting Rules

Avoid:

- too many colored lights
- every object glowing
- hard shadows everywhere
- flat ambient-only lighting
- inconsistent light direction
- unrealistic highlights
- bloom hiding details

For dark dashboards:

- use local highlights
- preserve text contrast
- reserve glow for state and focus
- keep large surfaces relatively calm

---

# 16. Material System

Classify materials:

- matte
- satin
- glossy
- metallic
- glass
- emissive
- translucent
- holographic
- rubber
- plastic
- brushed metal

For every material define:

```text
base color
roughness
metalness
transmission
opacity
ior if relevant
normal detail
environment response
emission
```

Do not use all material effects at once.

---

# 17. Glassmorphism Rules

Glass is not simply:

```css
backdrop-filter: blur(...)
```

A convincing glass surface needs:

- transparency
- border highlight
- background separation
- controlled blur
- internal tint
- subtle shadow
- surface reflection cue

Do not use glass behind dense text if readability is reduced.

---

# 18. Metallic UI

For metallic surfaces:

Use:

- controlled gradient
- highlight strip
- dark edge
- small specular accents
- material-consistent shadow

Avoid:

- chrome everywhere
- high-frequency highlights
- excessive contrast behind text

---

# 19. Glow System

Glow communicates:

- active state
- status
- energy
- selection
- alert
- live data

Create glow tokens:

```text
glow-none
glow-subtle
glow-active
glow-critical
```

Do not assign glow to every element.

---

# 20. Color Hierarchy

Define:

```text
Background
Surface
Raised surface
Primary
Secondary
Success
Warning
Danger
Info
Text primary
Text secondary
Border
Glow
```

3D lighting may change apparent color.

Always verify final rendered contrast.

---

# 21. Typography in 3D Interfaces

Important text remains primarily 2D.

Use 3D typography only for:

- hero title
- logo moment
- short labels
- display numerals
- decorative headings

Avoid extruded 3D text for:

- paragraphs
- forms
- tables
- legal content
- error messages
- instructions

---

# 22. 3D Cards

A good 3D card can use:

- subtle perspective
- surface highlight
- internal layering
- elevation shadow
- hover tilt
- status glow
- animated sheen

A card must still have:

- obvious title
- readable data
- clear interaction state
- keyboard focus
- stable layout

Do not make the tilt interfere with clicking.

---

# 23. Dashboard 3D Rules

For enterprise dashboards:

Use 3D for:

- KPI emphasis
- status cards
- equipment representation
- building/factory map
- incident visualization
- sensor states
- asset status
- hero overview
- command-center visuals

Keep these mostly 2D:

- tables
- forms
- long reports
- data entry
- configuration pages
- dense lists
- legal records

Recommended mode:

**HYBRID_3D**

---

# 24. Status Semantics

Never communicate status only through depth or glow.

Status should include at least two cues where practical:

- color
- icon
- text
- shape
- border
- motion

Example:

```text
Critical:
red + warning icon + CRITICAL text
```

not only red glow.

---

# 25. Motion System

Motion types:

- entrance
- hover
- focus
- object rotation
- parallax
- camera movement
- floating
- pulse
- data update
- state transition
- alert motion

Each animation must have a semantic reason.

---

# 26. Motion Timing

For UI:

```text
micro interaction: 100–220ms
card transition: 180–350ms
panel movement: 250–500ms
hero ambient movement: slow / continuous
```

Avoid long interaction-blocking animation.

Ambient loops must remain subtle.

---

# 27. Reduced Motion

Always support:

```css
@media (prefers-reduced-motion: reduce)
```

Reduce or disable:

- parallax
- continuous rotation
- camera travel
- floating loops
- depth transition
- particle motion

Critical information must remain available without animation.

---

# 28. Interaction

For every interactive 3D element define:

```text
default
hover
focus
active
selected
disabled
loading
success
warning
error
```

Do not rely on hover alone.

Mobile must have an equivalent interaction.

---

# 29. Cursor and Hit Targets

3D transforms can visually move elements without moving expected hit areas.

Verify:

- clickable region matches visible object
- pointer does not disappear behind layers
- overlay does not intercept unintended clicks
- touch targets remain large enough
- transformed controls retain keyboard behavior

---

# 30. Responsive 3D

Desktop design cannot simply be scaled down.

Define three modes:

```text
DESKTOP
TABLET
MOBILE
```

For mobile:

- reduce scene complexity
- reduce particle count
- reduce post-processing
- reduce shadows
- reduce blur
- flatten extreme perspective
- disable unnecessary hover logic
- reduce camera motion
- preserve primary controls

---

# 31. Adaptive Scene Strategy

Use capability-based degradation.

Example:

```text
High-capability desktop:
full scene + shadows + effects

Standard desktop:
scene + reduced effects

Tablet:
simplified scene

Mobile:
lite scene or pseudo-3D

Low power / reduced motion:
static visual
```

The page must remain usable at the lowest mode.

---

# 32. RTL / LTR

For Arabic interfaces:

Verify:

- information flow
- floating panel placement
- directional arrows
- menu anchors
- card ordering
- spatial hierarchy
- 3D camera composition
- chart labels
- icon semantics

Do not blindly mirror physically meaningful objects.

Examples that may not be mirrored:

- real equipment orientation
- maps
- compass direction
- real-world machinery
- technical diagrams

---

# 33. Accessibility

3D cannot reduce accessibility.

Verify:

- semantic DOM remains available
- keyboard navigation
- focus states
- screen reader labels
- contrast
- reduced motion
- readable typography
- logical tab order
- no interaction only inside canvas without alternative access
- canvas content has accessible fallback where required

A visually impressive scene with inaccessible core functionality fails this skill.

---

# 34. True 3D Technology Selection

## Three.js
Use when lower-level scene control is needed.

## React Three Fiber
Use when project is React-based and declarative scene composition is beneficial.

## Drei
Use selectively for utilities.

## CSS 3D
Use when geometry is unnecessary.

## SVG
Use for vector depth, diagrams, technical visuals and lightweight effects.

## Canvas 2D
Use when full 3D is unnecessary but procedural drawing is useful.

Do not add a major rendering dependency without proving its value.

---

# 35. Model Handling

For GLTF/GLB assets:

Inspect:

- polygon count
- material count
- texture size
- texture count
- animation count- skeleton complexity
- unused nodes
- duplicate meshes
- scale
- coordinate orientation

Optimize before shipping.

---

# 36. Geometry Rules

Use the minimum geometry necessary.

Prefer:

- instancing
- shared geometry
- LOD
- merged static meshes where appropriate
- simplified collision/raycast geometry

Avoid:

- excessive subdivisions
- invisible geometry
- duplicate objects
- high-poly assets for tiny UI elements

---

# 37. Texture Rules

Prefer:

- compressed textures
- appropriate resolution
- reusable texture sets
- normal/roughness maps only where visible value exists

Avoid:

- 4K textures on tiny cards
- duplicate textures
- uncompressed large assets
- alpha where unnecessary

---

# 38. Shadows

Shadows are expensive.

Use them to establish:

- contact
- separation
- scale
- hierarchy

Prefer fewer important shadow-casting lights.

On low-power modes, simplify or disable dynamic shadows.

---

# 39. Post-Processing

Possible effects:

- bloom
- depth of field
- vignette
- tone mapping
- chromatic aberration
- SSAO

Use sparingly.

Avoid:

- excessive bloom
- blurred UI text
- strong chromatic aberration
- depth-of-field hiding important content

Enterprise UI should usually use minimal post-processing.

---

# 40. Particles

Particles can support:

- ambient depth
- network visualization
- airflow
- sparks
- data flow
- energy
- atmosphere

Particles must not:

- reduce text readability
- obscure controls
- consume excessive GPU
- imply false system states

---

# 41. Data Visualization

Use 3D charts only when the third dimension represents meaningful data or spatial context.

Do not turn ordinary bar charts into 3D solely for appearance.

Prefer 2D charts for precise comparison.

Use 3D for:

- spatial distribution
- building/factory context
- equipment location
- topology
- network relationships
- physical simulation context

---

# 42. Technical / Industrial 3D

When designing technical systems:

Prioritize:

- clarity
- state visibility
- labels
- equipment identity
- status color
- hazard visibility
- spatial relationships
- operator readability

Avoid cinematic styling that hides operational information.

---

# 43. UI + Scene Integration

A real 3D scene and HTML UI must have a clear ownership model.

Possible layout:

```text
Scene layer
↓
Visual overlay
↓
Application UI
↓
Critical controls
↓
Modal layer
```

Critical UI must not be trapped inside an opaque canvas-only architecture unless justified.

---

# 44. Z-Index / Stacking Rules

3D transforms create new stacking contexts.

Audit:

- `z-index`
- transformed parents
- `overflow`
- `position`
- fixed elements
- portal layers
- modal stacking
- canvas stacking

Prevent:

- menu behind canvas
- modal behind 3D scene
- tooltip clipping
- pointer interception

---

# 45. Loading Strategy

For heavy scenes:

Use:

- progressive loading
- skeleton or poster state
- lazy loading
- asset prefetch only when justified
- fallback scene
- error state

Never show a blank screen while the 3D engine loads.

---

# 46. Performance Budget

Before implementation define a budget.

Track when possible:

- JS bundle impact
- model bytes
- texture bytes
- GPU load
- frame rate
- main-thread blocking
- loading time
- scene initialization
- memory
- number of draw calls

Suggested target philosophy:

- interaction remains responsive
- dashboard stays usable on ordinary hardware
- mobile receives reduced complexity
- no visual feature is allowed unlimited cost

Use `krom_evaluate_performance_budgets` when measurable data exists.

---

# 47. Frame Rate Strategy

Do not render continuously if the scene is static.

Possible strategies:

- render on demand
- reduce DPR
- pause when tab hidden
- pause offscreen
- adaptive quality
- reduce effects under load

Never assume maximum device pixel ratio is always desirable.

---

# 48. Quality Tiers

Create:

```text
ULTRA
HIGH
STANDARD
LITE
STATIC
```

The application may choose a lower tier automatically.

The design must still look intentional in LITE and STATIC modes.

---

# 49. Dark Mode

3D dark mode needs:

- separation between surfaces
- controlled black levels
- visible edges
- readable labels
- restrained bloom
- distinct interaction states

Do not use pure black everywhere.

---

# 50. Light Mode

Light mode needs:

- reduced glare
- softer shadows
- clear material boundaries
- less aggressive glass transparency
- sufficient contrast

3D design must not be dark-mode-only unless explicitly required.

---

# 51. Design Tokens

Create 3D-related tokens.

Example:

```text
radius
surface-depth
shadow-depth
perspective
tilt
blur
glass-opacity
highlight
rim-light
glow
animation-duration
easing
scene-background
```

Do not hardcode unrelated values across components.

---

# 52. 3D Component Library

Recommended components:

```text
DepthCard
GlassPanel
FloatingPanel
PerspectiveButton
StatusOrb
MetricTile3D
SceneFrame
ModelViewer
SpatialTooltip
DepthBadge
HoloPanel
ControlKnob
SceneLoader
SceneFallback
PerformanceFallback
```

Each must have:

- variants
- states
- responsive behavior
- accessibility behavior
- reduced-motion behavior

---

# 53. 3D Button Rules

Buttons may have:

- elevation
- highlight
- depth
- press animation

But must retain:

- clear label
- predictable shape
- focus ring
- disabled state
- stable hitbox

Do not make buttons resemble decorative objects.

---

# 54. 3D Icons

Use consistent:

- camera angle
- material
- light direction
- corner radius
- depth
- shadow
- visual weight

Do not mix:

- clay icon
- chrome icon
- flat line icon
- photoreal icon

within one primary icon family unless intentionally separated.

---

# 55. Logo Presentation

For 3D logo treatment:

Preserve brand geometry.

Allowed:

- extrusion
- bevel
- metallic treatment
- glass treatment
- soft shadow
- controlled reflection

Do not distort the logo proportions.

---

# 56. Posters and Hero Art

Use:

- focal object
- atmospheric depth
- foreground accents
- directional lighting
- clear text-safe zone
- brand-consistent palette

Text must not compete with the 3D focal object.

---

# 57. Visual Audit Checklist

Audit:

```text
[ ] clear focal point
[ ] consistent perspective
[ ] consistent light direction
[ ] coherent materials
[ ] correct depth hierarchy
[ ] readable typography
[ ] restrained glow
[ ] no random tilt
[ ] stable interaction
[ ] responsive degradation
[ ] mobile readability
[ ] keyboard navigation
[ ] reduced-motion support
[ ] acceptable performance
[ ] fallback available
```

Use:

- `krom_audit_ui`
- `krom_audit_responsive`
- `krom_audit_rtl`
- `krom_audit_accessibility`

when applicable.

---

# 58. Anti-Patterns

Reject or correct:

## 58.1 Everything floating
Not every panel needs elevation.

## 58.2 Excessive glass
Too much transparency destroys hierarchy.

## 58.3 Rainbow neon
Multiple glow colors produce visual noise.

## 58.4 Constant motion
Continuous motion creates fatigue.

## 58.5 Huge WebGL scene for simple UI
Use pseudo-3D instead.

## 58.6 Perspective on body text
Keep reading surfaces stable.

## 58.7 3D charts without semantic need
Use precise 2D charts.

## 58.8 Heavy blur
Blur is expensive and can reduce readability.

## 58.9 Camera motion during task completion
Do not move the user's visual frame while they are entering data.

## 58.10 Desktop-only design
Always define mobile degradation.

---

# 59. Design Review Score

Score 0–100.

```text
Visual hierarchy .......... 15
3D coherence .............. 15
Materials / lighting ...... 10
Typography / readability .. 10
Interaction ............... 10
Responsiveness ............ 10
Accessibility ............. 10
Performance ............... 10
Brand consistency ......... 5
Fallback quality .......... 5
```

Classification:

```text
95–100  EXCEPTIONAL
90–94   PRODUCTION PREMIUM
80–89   GOOD
70–79   NEEDS REFINEMENT
<70     REWORK
```

A high visual score cannot compensate for inaccessible or unusable core functionality.

---

# 60. Implementation Planning

Before changing an existing project, produce:

```text
3D IMPLEMENTATION PLAN

Objective:
Current UI:
Chosen 3D mode:
Why this mode:
Visual direction:
Components affected:
Scene assets:
Libraries:
New dependencies:
Performance impact:
Responsive strategy:
RTL strategy:
Accessibility strategy:
Fallback:
Files expected to change:
Verification:
```

---

# 61. Dependency Rules

Before adding:

- three
- @react-three/fiber
- @react-three/drei
- postprocessing
- animation libraries

check whether the project already has an equivalent dependency.

Avoid duplicate rendering/animation stacks.

---

# 62. CSS Pseudo-3D Pattern

Use for lightweight cards and panels.

Conceptual structure:

```css
.card-3d {
  transform-style: preserve-3d;
  perspective: var(--perspective);
}

.card-3d__surface {
  transform: translateZ(var(--depth-1));
}

.card-3d__accent {
  transform: translateZ(var(--depth-2));
}
```

Keep transform values tokenized.

---

# 63. React Three Fiber Architecture

Prefer separation:

```text
SceneCanvas
├── CameraRig
├── Environment
├── Lighting
├── SceneObjects
├── InteractionLayer
├── Effects
└── PerformanceController
```

UI stays outside the canvas where practical:

```text
Page
├── SceneCanvas
└── UIOverlay
```

---

# 64. Performance Controller

A true-3D implementation should be able to reduce quality.

Pseudo-logic:

```text
if reducedMotion:
    static or low-motion mode

if mobile:
    lower DPR
    fewer effects
    simpler geometry

if low performance:
    lower quality tier

if offscreen:
    pause rendering
```

---

# 65. Visual Verification

Do not approve the final design solely from source code.

When implementation access exists, verify rendered output.

Check:

- desktop
- tablet
- mobile
- RTL if applicable
- LTR if applicable
- light mode
- dark mode
- hover
- keyboard focus
- modal stacking
- loading
- empty states
- errors
- low-quality fallback

Rendered evidence is preferred.

---

# 66. Browser Verification

When browser capability is available:

Inspect:

- actual layout
- clipping
- overflow
- canvas size
- WebGL errors
- console errors
- layout shift
- clickability
- text overlap
- FPS/performance if available
- mobile behavior

Source code alone is insufficient for a strong visual claim.

---

# 67. Evidence Rule

Never say:

- "perfect"
- "fully responsive"
- "performance optimized"
- "works on mobile"
- "RTL fixed"
- "accessibility passed"

without relevant evidence.

Use:

```text
DESIGNED
IMPLEMENTED
VISUALLY_VERIFIED
PARTIALLY_VERIFIED
UNVERIFIED
```

accurately.

---

# 68. Final Design Report

Use:

```text
KROM 3D DESIGN REPORT

Project:
Surface:
3D mode:
Art direction:

Design system:
Depth system:
Perspective:
Lighting:
Materials:
Motion:

Desktop:
Tablet:
Mobile:

RTL/LTR:
Accessibility:
Performance:
Fallback:

Components created/changed:

Visual verification:
Browser verification:
Performance evidence:

Known limitations:

Final status:
DESIGNED | IMPLEMENTED | VISUALLY_VERIFIED | PARTIALLY_VERIFIED
```

---

# 69. Autonomous Workflow

When the user says:

- "صمم"
- "ابدأ"
- "طبق 3D"
- "طور التصميم"
- "خله احترافي 3D"
- "كمل"

proceed without repeatedly asking for confirmation.

Sequence:

1. inspect current design if evidence exists
2. identify purpose
3. select 3D mode
4. choose art direction
5. establish depth/perspective tokens
6. define lighting/materials
7. define interaction/motion
8. define responsive degradation
9. define accessibility fallback
10. implement if authorized
11. render/inspect if capability exists
12. optimize
13. report evidence

Stop only for:

- unavailable required source
- destructive boundary
- missing implementation authorization
- tool limitation
- unresolved critical requirement

---

# 70. Design Prompt Template

Use this internal prompt structure:

```text
Create a professional 3D visual system for [surface].

Goal:
[goal]

Audience:
[audience]

3D mode:
[TRUE_3D / HYBRID_3D / PSEUDO_3D / STATIC_3D_ART]

Art direction:
[direction]

Requirements:
- strong focal hierarchy
- consistent perspective
- controlled depth
- coherent materials
- professional lighting
- restrained glow
- clear typography
- production-quality interaction states
- desktop/tablet/mobile
- RTL/LTR where required
- dark/light where required
- reduced motion
- performance fallback

Avoid:
- random 3D tilt
- excessive glass
- excessive bloom
- rainbow neon
- unreadable text
- decorative motion overload
- WebGL where CSS/SVG is sufficient
```

---

# 71. Dashboard Prompt Template

```text
Design a premium HYBRID_3D dashboard.

Keep primary application content accessible in semantic HTML.

Use 3D selectively for:
- KPIs
- system overview
- equipment/status representation
- critical alerts
- hero visualization

Keep tables, forms and reports primarily 2D.

Create:
- depth token system
- glass/surface system
- lighting logic
- state glow system
- responsive degradation
- reduced-motion mode
- mobile-lite mode

Verify:
- text readability
- keyboard access
- mobile layout
- canvas stacking
- modal layering
- performance
```

---

# 72. Industrial / Command Center Template

```text
Create a controlled industrial 3D command-center aesthetic.

Visual language:
- dark technical surfaces
- restrained metallic material
- selective glass
- subtle edge lighting
- status-aware accent colors
- strong information hierarchy

Do not make safety-critical status dependent on glow alone.

Prioritize:
- alerts
- equipment states
- spatial context
- operator readability
- fast scanning
- clear controls

Use HYBRID_3D unless true spatial geometry is necessary.
```

---

# 73. Static 3D Artwork Template

```text
Create a high-quality static 3D artwork with:

- one dominant focal object
- controlled camera angle
- coherent lighting
- realistic or deliberately stylized materials
- foreground/midground/background depth
- clean text-safe area
- restrained atmospheric effects
- brand-compatible palette

Do not overload the frame with equal-priority objects.
```

---

# 74. Acceptance Criteria

This skill is complete only when it can answer:

1. Why is 3D needed here?
2. Which 3D mode is appropriate?
3. What is the art direction?
4. What is the depth system?
5. What is the camera/perspective logic?
6. What is the lighting logic?
7. What are the materials?
8. What motion is meaningful?
9. How does mobile degrade?
10. How is accessibility preserved?
11. What is the performance strategy?
12. What happens without WebGL/motion?
13. Was the rendered design actually verified?

If any answer is unknown, state it.

---

# 75. Core Quality Rule

**The best 3D interface is not the one with the most depth, glow, motion, or geometry.  
It is the one where depth makes the product clearer, stronger, more memorable, and still fast and usable.**