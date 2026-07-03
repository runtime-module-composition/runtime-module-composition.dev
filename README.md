# Runtime Module Composition

Documentation site for an import-map-based microfrontend strategy that composes independently deployed ESM modules in the browser at runtime.

## Development

This site is built with Astro Starlight.

```bash
npm install
npm run dev
```

Markdown docs live in `src/content/docs`.

## Cloudflare Pages

This project is also hosted on Cloudflare Workers & Pages through the linked GitHub repository. New merges into `main` redeploy the static site automatically.

Recommended Cloudflare Pages settings:

- Framework preset: `Astro`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

## GitHub Pages

GitHub Pages deploys the built `dist` directory through `.github/workflows/pages.yml`.

## Preview

```bash
npm run build
npm run preview
```
