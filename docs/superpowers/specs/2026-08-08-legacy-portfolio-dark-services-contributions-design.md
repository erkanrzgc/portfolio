# Legacy Portfolio Restoration with Dark Services and GitHub Contributions

Date: 2026-08-08

## Goal

Restore the portfolio's last pre-Three.js runtime design, based on commit
`c248614`, while making only two visible changes:

1. Keep the original Services layout but convert its white theme to the site's
   existing black theme.
2. Add the green GitHub Contributions panel immediately after the project card
   stack.

The restored result should feel like the original portfolio rather than a new
redesign.

## Approved Visual Direction

### Restored portfolio

- Restore the original magnetic floating avatar in the hero.
- Restore the original section sequence, typography, spacing, and motion.
- Restore the original full-height sticky project cards.
- Remove the runtime Three.js globe/orbital scene and spotlight/bento service
  presentation.
- Do not add terminal, topology, orbit, glow, tilt, or other new visual systems.

### Dark Services

The Services section keeps its original six-row structure, content, icons,
spacing, responsive behavior, and FadeIn timing. Only its color treatment
changes:

- section background: the site's existing `#0C0C0C` black;
- section heading: the existing `hero-heading` gradient used elsewhere in the
  restored page;
- service names: solid `#D7E2EA`;
- descriptions and secondary copy: existing light blue-grey with reduced
  opacity;
- separators, icon borders, and tag outlines: subtle translucent light grey;
- icon surfaces: dark neutral surfaces with light icons;
- hover behavior: the original restrained translation and border emphasis.

There are no cards, terminal controls, maps, expandable rows, or new service
interactions.

### GitHub Contributions

- Reuse the current standalone `GithubContributions` component.
- Keep GitHub's green palette (`#39D353` and `#7EE787`).
- Render it inside the Projects section after the complete sticky project-card
  stack and before the footer.
- Keep the chart linked to `https://github.com/erkanrzgc`.
- Keep lazy loading, accessible alternative text, keyboard focus styles,
  secure external-link attributes, and the GitHub profile fallback when the
  chart image cannot load.
- Give the chart `width="663"` and `height="104"` while retaining responsive
  `w-full h-auto` styling, reducing layout shift without changing its layout.

## Architecture and Scope

### Runtime restoration

Restore the application-facing source from `c248614` selectively rather than
resetting or rewriting Git history. The restoration must preserve the user's
existing uncommitted `.octarine` deletions and avoid restoring those files.

Expected runtime changes include:

- restore `Magnet` and the legacy Hero implementation;
- restore the legacy Services and Projects implementations;
- restore legacy supporting CSS and the `c248614` project data, ordering, and
  fetch behavior needed by those sections;
- remove runtime-only orbital, geometry, glow, motion, and spotlight modules;
- remove the Three.js production dependency when no runtime import remains.

Historical design and plan documents may remain in the repository because they
do not affect the delivered site.

### Testing infrastructure

Keep the current Vitest and Testing Library infrastructure instead of removing
all tests with the old runtime snapshot. Replace tests coupled to the orbital,
spotlight, and compact-project implementations with focused tests for the
restored behavior.

## Data Flow and Failure Behavior

- The legacy Projects section continues to fetch public repository data through
  the existing project-data module and shows its local fallback list when the
  request fails.
- GitHub Contributions loads independently from the project fetch. A failure in
  either feature must not hide or break the other.
- If the contribution chart fails, the component replaces it with a direct
  GitHub profile link.
- No new API, server, token, or environment variable is introduced.

## Responsive and Accessibility Requirements

- The magnetic pointer interaction remains desktop-only and the existing mobile
  avatar float remains available when hover is unavailable.
- Reduced-motion preferences disable nonessential avatar and reveal motion.
- The original Services rows stack cleanly on small screens with readable text
  and visible separators.
- The contribution chart remains full-width and responsive without horizontal
  page overflow.
- External links remain keyboard accessible and expose visible focus states.

## Verification

- Tests lock the restored section order and confirm Three.js is absent from the
  runtime path.
- Hero tests cover the legacy avatar and Magnet rendering.
- Services tests cover all six rows and the dark, non-card presentation.
- Projects tests cover the legacy sticky cards and Contributions placement.
- Contributions tests cover its chart link, accessibility text, and fallback.
- Run the full test suite, TypeScript production build, and `git diff --check`.
- Visually verify desktop and mobile layouts, including reduced motion and the
  chart failure fallback.

## Explicitly Out of Scope

- A new avatar asset or cybernetic avatar treatment.
- Terminal-style portfolio navigation.
- Three.js, orbital animation, pointer-driven scene physics, or service maps.
- A service card/bento redesign.
- Changes to profile/social links, project content, or the footer beyond what is
  required to restore `c248614` behavior.
- Deployment, push, or production publication.
