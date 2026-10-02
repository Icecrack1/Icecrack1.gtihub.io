# Vertex Ascent

A monochrome, scroll-driven landing page for an independent game studio. Inspired by early-console worlds and the belief that games can bring out the best in us.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

```sh
npm run build     # Type-check and build to dist/
npm run preview   # Serve the production build
```

## Structure

The site follows the Take Care Studios reference architecture: a semantic HTML document, a TypeScript application entry point, scroll animations, and a shared, lazily loaded Three.js scene. Native CSS sticky positioning keeps each chapter on screen; GSAP reveals the copy, while scroll position controls the scene's four poses. Scrolling remains native.

- `index.html`: all editable copy, sections, navigation, and metadata.
- `src/styles/main.css`: typography, responsive layouts, and static artwork.
- `src/app/App.ts`: motion preference, chapter navigation, progress, and reveals.
- `src/scenes/AscentScene.ts`: procedural islands, portal, crystal, stars, and scene transitions.
- `src/scenes/BlackHole.ts`: the first chapter’s violet pixel-art black hole, with an opaque center, a glowing rim, and a slowly orbiting particle disk. Its shared scene clock respects the motion toggle and background-tab pause.
- `VertexAscentLogo1.png`: original studio logo, displayed through a CSS crop without modifying the source.
- `public/fonts/`: self-hosted Roboto and its license.

The four chapters are the introduction, purpose, worlds, and studio. Game announcements intentionally remain general until real projects are ready. Add or revise text directly in the HTML. No external font service, analytics, forms, or model downloads are required.

Reduced-motion visitors receive the static artwork and visible content by default. The header control pauses ambient animation; scrolling still selects the appropriate scene. If WebGL fails, the static illustration remains visible. Rendering stops in background tabs.

## GitHub Pages

The included workflow builds and publishes `dist/` on pushes to `main`. In the repository's **Settings → Pages**, select **GitHub Actions** as the source (one-time setup). Relative asset paths support both a repository subpath and a custom domain. Do not serve the unbuilt source as a static site: use the workflow or publish the contents of `dist/`.

## Artwork

The studio logo was supplied with this repository. The 3D artwork is generated in code specifically for this page. The locally hosted Roboto font is distributed under the SIL Open Font License; see `public/fonts/OFL.txt`.
