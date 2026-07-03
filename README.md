# Runtime Module Composition

Technical documentation for an import-map-based micro frontend strategy that composes independently deployed ESM modules in the browser at runtime.

## GitHub Pages

This project is intentionally static. GitHub Pages deploys the repository root directly through `.github/workflows/pages.yml`; there is no Jekyll, Docker image, package install, or build command.

- `index.html` is the public landing page.
- `styles.css` contains the page styling.
- `docs/technical-implementation.md` is the editable source document.

## Cloudflare Pages

This project is also hosted on Cloudflare Workers & Pages through the linked GitHub repository. New merges into `main` redeploy the static site automatically.

Recommended Cloudflare Pages settings:

- Framework preset: `None`
- Build command: leave empty
- Build output directory: `.`
- Root directory: repository root

## Local Preview

Open `index.html` in a browser, or serve the folder with any static file server.
