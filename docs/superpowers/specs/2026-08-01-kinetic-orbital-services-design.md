# Kinetic Orbital Rig and Orbital Echo Services Design

**Date:** 2026-08-01
**Status:** Approved for implementation planning

## Goal

Increase the sense of depth and life in the existing portfolio without replacing its structure or making the hero difficult to read.

The refinement has two coordinated parts:

1. Expand the hero from eight mostly rigid orbit planes into an eleven-orbit, physics-driven scene that responds to pointer and drag input.
2. Refine the existing white Services bento into an Orbital Echo treatment that visually continues the hero through restrained orbit traces, light nodes, and spring-like card tilt.

The chosen motion character is lively but balanced. Interaction should be noticeable and satisfying, but the avatar and heading remain the visual priority.

## Approved Decisions

- Use the physics-driven interaction approach rather than a single rigid scene tilt.
- Show 11 orbits on desktop, 9 on tablet, and 6 on mobile/coarse-pointer profiles.
- Support both passive pointer parallax and click-drag rotation on desktop.
- Support horizontal touch-drag on mobile while preserving vertical page scrolling.
- Give the avatar an independent spring-follow motion rather than rotating it rigidly with the orbit system.
- Preserve the current soft, edge-free purple glow.
- Use the approved Orbital Echo Bento direction for Services.
- Keep the Services section white, preserve all six services, and keep every description and capability tag visible without interaction.

## Scope

### In scope

- Three new deterministic orbit definitions.
- Per-orbit motion rigs and varied physical response.
- Pointer parallax, drag rotation, release momentum, damping, and spring return.
- Independent avatar drift and lag.
- Desktop, tablet, mobile, coarse-pointer, and reduced-motion profiles.
- Pointer/touch gesture boundaries and cleanup.
- Orbital card decorations, dual-layer card lighting, and restrained card tilt in Services.
- Automated coverage and responsive browser verification for the new behavior.

### Out of scope

- A second Three.js scene in Services.
- Post-processing, bloom, GSAP, a physics engine, or another runtime dependency.
- Literal four-dimensional geometry.
- Terminal-mode Services cards.
- Changes to service copy, service order, Projects, GitHub Contributions, navigation, or social links.
- Turning decorative service cards into links, buttons, or keyboard controls.

## Hero Visual Direction

The avatar remains the center of a transparent purple volume. Eleven three-dimensional elliptical paths create a denser reactor-like silhouette on desktop. The additional paths use lower visual weight and varied radii and axes so density increases without becoming a bright wire ball.

The existing soft glow remains behind the avatar. It follows the avatar's small x/y translation but does not inherit scene tilt or orbit rotation. This preserves the approved diffuse aura and prevents the glow from reading as an angled disc, sphere, or visible ring.

Orbit colors remain predominantly purple and lilac. Blue and green stay secondary accents. The three new paths should not increase the number or prominence of green accents enough to compete with the avatar.

## Hero Scene Architecture

The scene is reorganized into focused transform rigs:

```text
scene
├── glowGroup
└── root
    ├── avatarRig
    │   ├── avatar sprite
    │   ├── transparent core
    │   └── transparent atmosphere
    └── interactionRig
        ├── particle field
        └── orbitalGroup
            ├── orbitRig 01 (line + satellite)
            ├── orbitRig 02 (line + satellite)
            └── ... through orbitRig 11
```

Responsibilities:

- `interactionRig` receives the primary pointer, drag, inertia, and spring rotation.
- Each `orbitRig` keeps its line and satellite aligned while adding a small deterministic precession and a secondary lag response.
- `avatarRig` follows the interaction with lower amplitude and a softer spring.
- `glowGroup` mirrors only the avatar's translation and approved breathing scale. It remains scene-level and does not rotate with either rig.
- Geometry is created once. Per-frame work changes transforms and satellite positions only.

The current renderer, camera, texture-loading, readiness, fallback, visibility, resize, and resource-disposal boundaries remain in `OrbitalAvatar`.

## Pure Motion Model

A new pure module, expected to be named `orbitalAvatarMotion.ts`, owns the numerical behavior independently of Three.js.

It models:

- current pitch and yaw;
- target parallax rotation;
- drag rotation;
- angular velocity;
- spring force toward the neutral/target state;
- damping;
- elapsed-time normalization and clamping;
- bounded avatar translation, roll, and follow lag;
- deterministic per-orbit response factors.

The model accepts elapsed time and input state and returns the next immutable motion state. It does not read the DOM, create Three.js objects, or schedule animation frames.

### Motion limits

- Interaction rig pitch is capped at approximately ±18 degrees.
- Interaction rig yaw is capped at approximately ±30 degrees.
- Passive pointer parallax uses only a fraction of those limits, approximately ±4 degrees pitch and ±6 degrees yaw.
- Angular velocity is capped so a fast flick cannot flip or continuously spin the scene.
- Release momentum remains visible briefly, then damping and a neutral spring settle the scene without an abrupt snap.
- Avatar translation is capped near ±0.09 scene units horizontally and ±0.06 vertically.
- Avatar roll is capped near ±3 degrees.
- Avatar idle scale/bob variation stays at or below roughly one percent and remains subordinate to the existing glow breathing effect.
- A frame delta is capped before integration so returning from a hidden tab or offscreen state cannot create a large jump.

Exact stiffness and damping constants will be selected through tests and browser tuning, but they must satisfy these visible limits and the lively-but-balanced acceptance criteria.

## Orbit Profiles

The responsive workload becomes:

| Profile | Visible orbits | Orbit scale | Pointer parallax | Drag input |
| --- | ---: | ---: | --- | --- |
| Desktop | 11 | Full | Fine pointer | Mouse/pen drag |
| Tablet | 9 | Reduced | Fine pointer when available | Pointer drag |
| Mobile/coarse pointer | 6 | Most reduced | Disabled | Horizontal touch/pen drag |

The first six definitions are the mobile-priority paths. The next three extend the composition for tablet. The final two add desktop density. Orbit definitions remain deterministic and ordered; responsive changes reuse existing actors and change visibility/draw ranges rather than rebuilding the scene.

The three new orbits use different radii, rotations, phases, directions, and speeds. Their lines and satellites may use slightly lower opacity/scale than the core eight paths to prevent visual clutter.

## Input and Gesture Flow

### Passive pointer parallax

Fine-pointer movement inside the hero updates a normalized target. The physics loop eases toward that target rather than writing directly to Three.js rotation. Pointer values are clamped to the hero bounds.

### Drag interaction

An interaction surface covers only the central orbital scene, not the heading or navigation. It uses a grab/grabbing cursor on fine pointers.

1. Pointer down starts a drag and captures that pointer.
2. Pointer movement updates bounded pitch/yaw and estimates angular velocity.
3. Pointer up or cancel releases capture and keeps capped momentum.
4. Damping reduces momentum while the neutral spring brings the scene back toward its idle/parallax target.
5. Lost capture, unmount, profile changes, document hiding, and viewport exit clear active drag state safely.

For coarse pointers, the interaction surface uses `touch-action: pan-y`. Horizontal intent controls the scene; vertical intent remains normal page scrolling. A vertical gesture may cancel scene interaction without producing momentum.

## Avatar Motion

The avatar is not rigidly attached to the rotating orbital system.

- It follows a lower-amplitude version of pointer/drag input using its own spring state.
- It gains small x/y translation, a maximum three-degree roll, and restrained idle float.
- It does not flip or rotate away from the camera; the portrait remains readable.
- The core and transparent atmosphere follow the avatar rig so the central depth volume stays aligned.
- The glow copies avatar x/y translation but not roll, pitch, or yaw.

This layered response makes the avatar feel embedded in the volume while avoiding a pasted-on or rubbery appearance.

## Per-Orbit Physical Response

Every orbit shares the global interaction rig, then adds a small deterministic response based on its definition:

- a slow idle precession;
- a mass/lag factor derived from stable orbit metadata;
- a limited secondary rotation influenced by global angular velocity;
- its existing satellite travel speed, phase, and direction.

These secondary responses do not create separate animation loops or DOM listeners. They run inside the existing single render loop and update transform groups only.

## Services: Orbital Echo Bento

The Services section remains a white rounded visual break and keeps its existing semantic list and asymmetric six-column desktop layout.

### Card treatment

- Card 01 remains the 4-column by 2-row featured card.
- Cards 02–06 keep their existing 2-column desktop spans and responsive order.
- Each card receives a low-opacity decorative orbit variant and one optional light node.
- Decorative metadata lives with the service data, for example an orbit variant, accent color, and node position. It never changes service meaning or reading order.
- Card 01 uses the richest multi-orbit schematic. Smaller cards use simpler single-arc variations.
- Purple remains dominant. One restrained blue and one restrained green node may provide continuity with the hero accents.
- Existing icon, title, description, index, and capability tags remain visible.

### Lighting and tilt

`SpotlightCard` continues to own capability detection and pointer coordinates. It gains bounded tilt variables and a reset path.

- A broad low-opacity purple radial layer supplies atmosphere.
- A smaller secondary highlight/node layer adds local depth without creating a hard ring.
- Fine-pointer movement tilts the card by no more than three degrees and lifts it by no more than four pixels.
- Pointer leave returns spotlight position and tilt to their neutral values with a spring-like easing.
- Only the active card performs pointer-relative updates.
- Coarse pointers and reduced-motion users receive static decoration with no pointer tracking or tilt.

Decorative orbit lines and nodes are CSS/DOM presentation layers marked `aria-hidden`. Any slow node movement uses CSS transforms within the existing card and stops for coarse pointers and reduced motion.

## Runtime Data Flow

1. The static hero fallback renders immediately.
2. `OrbitalAvatar` lazily initializes Three.js and creates all eleven orbit actors plus the new transform rigs.
3. Successful texture loading renders the first frame and triggers the existing ready transition.
4. Media queries and width select the 11/9/6 profile and input capabilities.
5. Pointer events update input state only; the single render loop integrates physics and writes transforms.
6. The loop runs only while the hero intersects the viewport, the document is visible, and reduced motion is not requested.
7. Services pointer input updates CSS custom properties on the active card only.

No server, API, persistence, analytics, or new package is introduced.

## Error Handling and Cleanup

- Three.js import, renderer creation, and avatar texture failures retain the accessible static fallback.
- A failed or cancelled initialization must not attach interaction listeners.
- Pointer capture is released or abandoned safely on pointer cancel, lost capture, capability changes, visibility changes, and unmount.
- Animation state resets its timestamp after pauses to prevent a resume jump.
- Geometry, materials, textures, renderer, observers, media listeners, pointer listeners, and animation frames are disposed or removed exactly once.
- Service cards remain fully readable if JavaScript motion is unavailable.

## Responsive and Reduced-Motion Behavior

### Desktop

- Eleven visible orbits.
- Full particle density within the current performance budget.
- Passive parallax, drag, inertia, avatar follow, orbit lag, and Services tilt.

### Tablet

- Nine visible orbits with reduced scale, segments, particles, glow, and pixel ratio.
- Pointer interaction only when the device reports suitable pointer capability.
- Existing two-column Services layout.

### Mobile/coarse pointer

- Six visible orbits and the lowest existing workload profile.
- No passive global parallax.
- Horizontal touch-drag with bounded momentum; vertical scrolling remains native.
- Static Services orbit decoration with no card tilt.
- Existing one-column Services order.

### Reduced motion

- No continuous hero animation loop.
- No pointer parallax, drag momentum, avatar float, orbit precession, service-node travel, or card tilt.
- One stable frame uses the correct responsive orbit count.
- All text, service content, avatar meaning, and navigation remain unchanged.

## Accessibility

- The Three.js canvas remains decorative and `aria-hidden`.
- The fallback avatar retains meaningful alternative text.
- Drag is an optional enhancement; no content or navigation requires it.
- The interaction surface receives no false button role or tab stop.
- Service cards remain semantic articles inside the labelled list and are not made falsely interactive.
- Decorative service arcs and nodes are hidden from assistive technology.
- Focus treatment remains available for any real focusable descendant added in the future.
- Motion preferences are honored across Three.js, fallback, entrance motion, nodes, spotlight, and tilt.

## Performance Constraints

- Keep one `requestAnimationFrame` loop for the complete hero.
- Do not allocate geometry, materials, or arrays per frame.
- Reuse all eleven actors across responsive profile changes.
- Perform per-orbit physical response through group transforms, not regenerated vertices.
- Cap frame delta after pauses.
- Preserve current intersection, document visibility, pixel ratio, and reduced-motion gates.
- Do not add another Three.js scene or a general-purpose physics dependency.
- The three additional paths must not materially change initial JavaScript loading because Three.js is already asynchronously chunked.

## Testing Strategy

Implementation follows test-driven development.

### Pure geometry and profile tests

- Orbit definitions are deterministic and ordered.
- Profiles select exactly 11 desktop, 9 tablet, and 6 mobile orbits.
- New paths retain three-dimensional front/back depth and closed geometry.
- Mobile and tablet workloads remain lower than desktop.

### Pure motion tests

- Fixed input and delta produce deterministic state.
- Pitch, yaw, angular velocity, avatar translation, and roll stay inside limits.
- Drag release preserves capped momentum.
- Damping decreases velocity monotonically under neutral input.
- Spring return approaches the target without an abrupt snap.
- Large frame deltas are clamped.
- Per-orbit response factors are stable and bounded.

### Three.js component tests

- Exactly eleven orbit actors are created and the correct profile subset is visible.
- Lines and satellites share their orbit rig.
- Pointer down/move/up/cancel and lost capture update and clear interaction state correctly.
- Touch vertical intent does not create scene momentum.
- Avatar and glow translations remain aligned while glow rotation remains independent.
- One RAF loop is preserved and pauses still work offscreen/hidden.
- Reduced motion schedules no continuous frame.
- All added groups, listeners, captures, and resources clean up exactly once.

### Services tests

- All six existing service articles, names, descriptions, tags, order, and spans remain.
- Decorative layers are `aria-hidden` and do not introduce false interactivity.
- Fine-pointer movement updates bounded spotlight and tilt variables.
- Pointer leave resets light and tilt state.
- Touch, coarse pointer, and reduced motion avoid tracking and layout reads.
- Media-query changes and unmount remove listeners and scheduled frames.

### Final verification

- Focused Vitest suites.
- Full Vitest suite.
- TypeScript and Vite production build.
- Browser QA at desktop, tablet, and mobile widths.
- Mouse parallax, mouse drag, release inertia, mobile touch-drag, vertical scroll, offscreen pause, hidden-tab resume, fallback, and reduced-motion checks.

## Acceptance Criteria

- Desktop shows eleven distinct orbit paths; tablet shows nine; mobile/coarse pointer shows six.
- More paths add depth without obscuring the avatar or creating a bright wire ball.
- Pointer parallax feels smooth rather than direct or twitchy.
- Drag produces bounded rotation and visible release momentum, then settles naturally.
- Mobile horizontal drag works without breaking vertical page scroll.
- Orbit planes display subtle independent lag/precession without separate loops or per-frame geometry generation.
- The avatar follows with restrained independent motion and remains readable.
- The purple glow stays soft, follows avatar translation, and never reads as a hard circle or angled disc.
- Services retains its white break and semantic content while visually echoing the hero.
- Service tilt stays within three degrees/four pixels and resets on leave.
- Reduced-motion mode is stable and static.
- Existing fallback, navigation, Projects, Contributions, and social behavior remain intact.
- All automated tests and the production build pass.
