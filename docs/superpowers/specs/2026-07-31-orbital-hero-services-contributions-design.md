# Orbital Hero, Spotlight Services, and Green Contributions Design

**Date:** 2026-07-31
**Status:** Approved for implementation planning; glow refinement approved 2026-08-01

## Goal

Make the existing portfolio feel more alive and distinctive without replacing its overall structure. The update has three coordinated parts:

1. Turn the hero avatar into the center of a living Three.js orbital system.
2. Replace the flat Services list with an animated spotlight bento grid.
3. Restyle GitHub Contributions with a recognizable GitHub-green activity scale.

The project grid, project ordering, page navigation, and social/contact behavior remain unchanged.

## Visual Direction

### Hero: Orbital Reactor

The hero uses a purple space atmosphere with the avatar embedded inside a transparent three-dimensional volume. The current opaque dark disk behind the avatar is removed completely. The volume is communicated by the orbit paths, satellites, particles, and light falloff rather than by a visible circular shell.

The scene contains eight elliptical orbit paths on different three-dimensional axes. Small emissive satellites move at varied speeds and directions. Some paths pass in front of the avatar and others behind it so the scene reads as real volume instead of a flat overlay. A soft atmosphere pulses slowly around the core, and subtle pointer parallax changes the viewing angle.

The intended “4D” feeling means three-dimensional depth that evolves continuously over time. It is not presented as literal four-dimensional geometry.

Purple is the primary atmospheric color. Desaturated blue and restrained green highlights may be used for orbit particles, but they must not compete with the avatar or heading.

#### Approved glow refinement

The purple light behind the avatar must read as a soft radiating glow, matching the approved previews, rather than as a filled circle or a sphere with a visible perimeter.

- Use two low-opacity additive glow layers behind the avatar, with slightly different elliptical scales and soft radial falloff.
- Build the glow with existing Three.js primitives and a small procedural radial texture; do not add post-processing, bloom, or another runtime dependency.
- Each layer fades completely into the page background before its outer edge; no hard ring, uniform purple fill, or circular silhouette may remain visible.
- Any transparent core geometry retained for depth must stay below the threshold where it reads as a separate disc.
- Normal motion may use a very slow, restrained breathing effect with no more than roughly two percent scale change. Reduced-motion mode keeps the glow static.
- Tablet and mobile profiles reduce the glow size and intensity while preserving the same soft falloff.
- Orbit lines, satellites, avatar depth ordering, and the subtle particle field remain unchanged.

### Services: Spotlight Bento

The white Services section remains a visual break between dark sections. Its six services move into an asymmetric responsive bento grid instead of a long vertical list.

Each card keeps its icon, title, explanation, and capability tags visible. On pointer devices, a low-opacity purple spotlight follows the cursor inside the card and the card receives a restrained perspective lift. Cards enter with the existing staggered fade animation. Keyboard focus receives an equivalent visible border/glow state.

The interaction is inspired by React Bits Spotlight Card and Magic Bento, while the semantic card structure follows the accessibility-oriented examples collected by The Component Gallery. The implementation will be local and tailored to this portfolio rather than adding the full Magic Bento runtime or GSAP dependency.

### GitHub Contributions

The contribution panel remains below the project grid and keeps its dark surface. The chart color changes from blue-grey to GitHub green, using `39d353` as the requested chart color. Supporting accents use a restrained green scale for the icon, border, focus ring, and activity label.

The chart remains a link to the GitHub profile. Its existing image-error fallback remains available and adopts the updated green focus treatment.

## Component Architecture

### `OrbitalAvatar`

A focused Three.js component replaces the current split between `NetworkGlobe` and the separate hero portrait.

Responsibilities:

- Lazily import Three.js after mount.
- Create and dispose the renderer, scene, camera, textures, geometries, and materials.
- Load `/images/avatar-transparent.png` as the central avatar texture.
- Render the low-opacity core, layered radial glow, orbit paths, atmosphere, satellites, and particles.
- Respond to pointer position, resize, document visibility, intersection state, and reduced-motion preference.
- Signal readiness so the static visual fallback can fade out only after the first successful frame.

Pure geometry helpers will generate orbit definitions and satellite placement. This keeps scene data deterministic and independently testable.

### Hero fallback

The hero retains a CSS-rendered static avatar fallback underneath the canvas. It uses the same diffused, edge-free purple glow with no black fill or circular shell. If Three.js cannot load, WebGL creation fails, or the avatar texture fails, the fallback remains visible. The canvas is decorative and `aria-hidden`; the fallback image retains the meaningful `Erkan avatar` alternative text.

### `SpotlightCard`

A small reusable local wrapper handles pointer-relative CSS custom properties for the card spotlight. It does not hide content or change semantic order.

Responsibilities:

- Update spotlight coordinates only while a fine pointer is interacting with the card.
- Expose normal `article` content and a visible `:focus-within` state.
- Disable pointer tracking and perspective motion for coarse pointers and reduced-motion users.

`ServicesSection` owns the service data and responsive bento layout. It continues to render all six services directly.

### `GithubContributions`

The component keeps its current state and fallback behavior. Only the chart URL and visual accent tokens change.

## Runtime and Data Flow

1. The hero renders the static avatar fallback immediately.
2. `OrbitalAvatar` becomes visible and begins its asynchronous Three.js initialization.
3. After the texture and scene are ready, the component renders a successful frame and fades the canvas in while fading the static fallback out.
4. Animation runs only while the hero intersects the viewport and the document is visible.
5. Reduced-motion users receive a single composed frame with pointer movement and continuous orbital motion disabled.
6. The Services spotlight reads local pointer coordinates and writes only CSS custom properties on the active card.
7. GitHub Contributions loads its remote chart lazily and shows the existing profile-link fallback if the image request fails.

No new API, server, persistent state, or analytics event is introduced.

## Responsive Behavior

- Desktop: eight orbit paths, full particle density, pointer parallax, and asymmetric Services bento spans.
- Tablet: reduced particle count and smaller orbital radius; Services uses a balanced two-column grid.
- Mobile/coarse pointer: fewer particles and satellites, no pointer parallax, and a single-column Services grid. Orbital animation stays slow unless reduced motion is enabled.
- All viewport sizes keep the heading and subtitle readable above the scene and prevent horizontal overflow.

## Accessibility

- Respect `prefers-reduced-motion` for the hero, service entrances, spotlight, and perspective transforms.
- Keep service content visible without hover and preserve logical document order.
- Do not make decorative service cards falsely interactive. Focus styling appears through real links or controls inside a card, if any are added later.
- Keep the Three.js canvas out of the accessibility tree and preserve accessible avatar text through the fallback image.
- Preserve the contribution chart’s descriptive alternative text and profile link.
- Maintain sufficient contrast for purple and green accents on both white and dark surfaces.

## Performance and Cleanup

- Keep Three.js in its existing asynchronous chunk.
- Cap device pixel ratio more aggressively on mobile.
- Reuse orbit geometry where practical and avoid per-frame geometry allocation.
- Stop animation outside the viewport, in hidden tabs, and for reduced-motion users.
- Dispose every renderer resource, texture, geometry, material, observer, and event listener on unmount.
- Avoid the full Magic Bento/GSAP dependency; use the existing React, CSS, and Framer Motion stack.

## Testing Strategy

Implementation follows test-driven development.

Automated coverage will verify:

- Hero renders the accessible static avatar fallback before WebGL readiness.
- A successful orbital scene can mark itself ready and hide only the visual fallback, not its accessible meaning.
- Failed Three.js import, renderer creation, or texture loading leaves the fallback visible.
- The orbital component removes listeners, observers, animation frames, and WebGL resources on unmount.
- Reduced motion prevents continuous animation and pointer-driven motion.
- Glow configuration preserves soft radial falloff, responsive intensity, and a static reduced-motion state.
- Services renders six semantic service cards in the intended bento container.
- Spotlight coordinates update for pointer interaction and remain inactive for reduced motion/coarse pointers.
- GitHub Contributions requests the `39d353` green chart and retains the accessible link and failure fallback.

Final verification includes the focused tests, full Vitest suite, TypeScript/Vite production build, and visual checks at desktop and mobile widths with normal and reduced motion.

## Acceptance Criteria

- No opaque black disk or visible purple circle/sphere is visible behind the avatar.
- The avatar appears embedded in a transparent purple volume created by a soft, edge-free glow and orbital depth.
- Eight orbit paths and moving satellites produce visible front/back depth on desktop.
- The hero remains usable when WebGL or texture loading fails.
- Services is an asymmetric spotlight bento grid with all six descriptions visible.
- Services motion is restrained and does not require hover to understand content.
- The contribution chart and its supporting accents use GitHub green.
- Mobile and reduced-motion experiences remain readable, stable, and performant.
- All automated tests and the production build pass.

## References

- [React Bits](https://reactbits.dev/get-started/index)
- [React Bits Spotlight Card](https://www.reactbits.dev/components/spotlight-card)
- [React Bits Magic Bento](https://www.reactbits.dev/components/magic-bento)
- [The Component Gallery: Card](https://component.gallery/components/card/)
