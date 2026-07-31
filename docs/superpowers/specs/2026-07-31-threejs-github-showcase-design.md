# Three.js Hero and GitHub Showcase Design

## Summary

Enhance the existing `erkanrzgc.dev` portfolio without redesigning its overall identity or page structure. The work adds a restrained Three.js network globe behind the current hero avatar, replaces the oversized sticky project cards with a compact responsive grid, curates eight GitHub repositories in a deliberate order, and places a GitHub contribution graphic below those project cards.

The terminal concept is explicitly out of scope. The existing navigation, hero copy, avatar, About section, Services section, Footer, privacy page, typography, and dark blue-gray palette remain recognizable.

## Goals

- Add a memorable but restrained 3D element to the existing hero.
- Keep the person's portrait and introduction as the visual focus.
- Make GitHub projects faster to scan and easier to compare.
- Present the strongest repositories first rather than relying on recency alone.
- Show GitHub activity after the projects as supporting evidence.
- Preserve responsive behavior, accessibility, graceful degradation, and reasonable GPU usage.

## Non-goals

- No terminal interface or command-based navigation.
- No full-site redesign or new information architecture.
- No changes to the About, Services, Footer, or Privacy content beyond layout adjustments required by the new hero and projects sections.
- No authenticated GitHub integration, private repository access, or server-side GitHub data store.
- No interactive 3D project world or drag-to-navigate experience.

## Page Flow

The existing page order remains:

1. Hero with the new network globe
2. Existing marquee
3. Existing About section
4. Existing Services section
5. Projects heading and curated project grid
6. GitHub contribution graphic
7. Existing Footer and social links

The project cards precede the contribution graphic because completed work is the primary evidence. Contribution activity is secondary evidence of consistency.

## Hero Experience

### Visual design

The current hero heading, subtitle, navigation, and transparent avatar keep their existing positions. A translucent blue-gray network globe sits behind the avatar and below the text layers.

The globe contains:

- A faint spherical wireframe or latitude-longitude guide.
- A bounded set of softly glowing nodes distributed across the sphere.
- Connection lines between nearby nodes.
- A subtle atmospheric glow that uses the existing `#BBCCD7` and `#D7E2EA` palette.

The effect should read as a technical network visualization rather than a bright sci-fi ornament. It must not reduce the contrast or legibility of the hero text and avatar.

### Motion and interaction

- The globe rotates slowly without requiring interaction.
- Pointer movement adds small, damped parallax rotation.
- The globe is not draggable and does not capture normal page scrolling.
- The scene fades subtly as the hero leaves the viewport.
- When `prefers-reduced-motion: reduce` is active, the globe renders a static frame without continuous animation.

### Performance and fallback

- Cap the renderer pixel ratio to prevent excessive GPU work on high-DPI displays.
- Use fewer nodes and connections on narrow/mobile viewports.
- Pause the animation loop when the hero is outside the viewport or the document is hidden.
- Dispose of geometries, materials, the renderer, observers, and event listeners on unmount.
- If WebGL initialization fails, remove the canvas and leave the current hero intact.
- The canvas is decorative, has no keyboard interaction, and is hidden from assistive technology.

## Three.js Component Architecture

Create a focused `NetworkGlobe` React component that owns the complete Three.js lifecycle. It will use the `three` package directly instead of adding React Three Fiber.

Responsibilities:

- Create and size the renderer, scene, camera, globe geometry, nodes, connections, and glow.
- Generate deterministic node positions so the visual does not change unpredictably between renders.
- Apply pointer parallax and slow automatic rotation.
- React to viewport resize and visibility changes.
- Select desktop or mobile scene density.
- Clean up all Three.js and browser resources.

Keep deterministic sphere-point and connection-generation logic in a small helper module so it can be unit tested without WebGL.

`HeroSection` only places the canvas layer and preserves the existing content stack. It does not own rendering internals.

## Project Showcase

### Layout

Replace the current full-height sticky card stack with a compact grid:

- Two columns at widths of 768 px and above.
- One column below 768 px.
- Consistent card heights within each row without forcing viewport-height cards.
- Clear separation between the section heading, project grid, contribution graphic, and footer.

Each project card contains:

- Repository owner prefix and GitHub indicator.
- Formatted repository name.
- Short repository description.
- Primary language.
- Star count.
- Relative or formatted last-updated date.
- Separate GitHub and Live buttons when a distinct live homepage exists.

The card body is not one large external link. Explicit buttons keep destinations understandable and accessible. Hover and focus may add a small elevation and border-light effect, but no strong tilt or motion is required.

### Curated repository order

Display exactly these eight repositories in this order:

1. `vibeprint`
2. `octopus`
3. `autonomous-scanner`
4. `firewall`
5. `reverse-engineering`
6. `steganography`
7. `loadkit`
8. `open-source-intelligence`

This impact-first order balances product polish, AI and cybersecurity work, systems programming, language diversity, and developer tooling. Repositories outside this list do not appear as cards. A `View all projects on GitHub` link below the showcase provides access to the complete public profile.

The current legacy ordering aliases such as `cyberm4fia-scanner` and `cyberm4fia-osint` must be replaced with the live repository names above.

## GitHub Data Flow

1. Render a local fallback list immediately in the approved curated order.
2. Fetch public owner repositories from the existing GitHub REST endpoint.
3. Exclude private repositories, forks, the profile repository, the portfolio repository, and other explicitly excluded repositories.
4. Retain only the eight approved repository names.
5. Map live description, language, stars, forks, updated date, homepage, and URLs into the portfolio model.
6. Sort the result according to the curated order, never by live response order.
7. If one approved repository is absent from the API response, keep its local fallback entry in the correct slot rather than silently shortening or reordering the grid.

The local fallback data must be refreshed for the eight approved repositories so offline/error behavior matches the live presentation.

## GitHub Contributions

Place the contribution graphic after the project grid and before the Footer. It appears inside a bordered panel using the same dark background and blue-gray accent palette as the project cards.

The graphic links to `https://github.com/erkanrzgc`. Because the public GitHub REST API does not provide the contribution calendar, load the themed image from `https://ghchart.rshah.org/BBCCD7/erkanrzgc`. The image must be lazy-loaded, have useful alternative text, and be wrapped in a link to the GitHub profile.

If the image fails to load, replace the visual with a compact `View GitHub activity` link rather than leaving a broken image or empty panel. The contribution chart is supplementary; project rendering must never depend on it.

## Error Handling

- GitHub repository request failure: show the complete curated local fallback list and the existing unobtrusive status message.
- Partial GitHub response: merge live results with missing fallback entries by repository name.
- Missing description, language, homepage, or date: use explicit local defaults and omit actions that have no valid destination.
- Contribution image failure: show the GitHub activity fallback link.
- WebGL failure: keep the current non-3D hero.
- Resize, visibility, or observer APIs unavailable: continue with safe static or continuously visible behavior without breaking the page.

No error in Three.js, GitHub data, or the contribution image may prevent the rest of the portfolio from rendering.

## Accessibility

- Three.js canvas is decorative and excluded from the accessibility tree.
- Existing hero text remains real HTML above the canvas.
- Project actions use visible focus styles and descriptive accessible names.
- External links retain `noopener noreferrer` behavior.
- Motion respects `prefers-reduced-motion`.
- Card text and controls preserve sufficient contrast against the dark background.
- Contribution content has meaningful alternative text and a textual fallback.

## Testing and Verification

Add automated coverage for:

- Deterministic sphere node generation.
- Connection generation staying within the configured bounds.
- Approved project filtering and exact curated order.
- Merging live GitHub results with missing fallback entries.
- Formatting missing metadata safely.

Use Vitest with a DOM-capable test environment for these focused unit and component tests.

Manual/browser verification covers:

- Hero layering at desktop and mobile breakpoints.
- Pointer parallax without blocking navigation or scrolling.
- Pausing when offscreen and respecting reduced motion.
- WebGL-disabled fallback.
- Two-column and one-column project layouts.
- Keyboard navigation and focus visibility for project actions.
- GitHub API failure and contribution-image failure states.
- No console errors or leaked animation loops after navigation/unmount.

Run the TypeScript build and production Vite build as the final automated verification.

## Acceptance Criteria

- The existing portfolio remains recognizable and all existing sections remain available.
- A network globe renders behind the hero avatar without obscuring content.
- The globe is responsive, motion-aware, and gracefully removable when WebGL is unavailable.
- Exactly eight approved repositories appear in the documented order.
- The project section uses a responsive compact grid rather than viewport-height sticky cards.
- Each card exposes accurate metadata and explicit GitHub/Live actions.
- The contribution graphic appears below the project grid with a working fallback.
- GitHub or contribution-service failures do not break the page.
- The site builds successfully and passes the documented responsive and accessibility checks.
