# Célveren portfolio

My developer portfolio — a place to share what I’m building and working on next.

Currently featuring Lightning, Adamel, and UDB-API. Built with HTML, Tailwind CSS, and JavaScript, with support for light and dark mode.

## Local development

Build the shared header and styles, then serve the site locally (navigation uses root-relative links):

```sh
npm ci
npm run build
python3 -m http.server 4174 --bind 127.0.0.1
```

The site will be at [localhost:4174](http://127.0.0.1:4174/). Card-style experiments live in [previews/index.html](previews/index.html).

To rebuild the styles with Node.js installed:

```sh
npm ci
npm run build
```

Use `npm run watch` while editing to regenerate both shared headers and CSS. Page content lives in `index.html` and `tools-services.html`, styles in `input.css`, and small interactions in `script.js`. `styles.css` is generated; do not edit it directly.

## Shared navigation

Edit `partials/header.html` to change the header, navigation links, or header social links across all deployed pages. `npm run build` fills the `shared:header` comment regions in `index.html`, `tools-services.html`, `migration/index.html`, `404.html`, and `previews/index.html` before compiling CSS. Commit the partial and regenerated pages together; edit page content outside these regions normally.

The two active-link placeholders are filled at build time. `script.js` updates the active link after hash navigation. Header links use root-relative URLs so nested pages share the same destinations, and the generated navigation works without JavaScript. Shared appearance lives in `input.css`.

`npm run watch` monitors the partial and pages as well as CSS. Docker Compose Watch already rebuilds when these inputs change. Docker and VPS deployment both run the same build. Run `npm test` to check header generation, page preservation, and active-link behavior.

## Project and service cards

Projects and Tools & Services share `.project-card` in `input.css`. Copy an existing card from `index.html` or `tools-services.html`, inside `.project-grid` within a `.projects` container.

Keep this element order:

| Class | Content |
| --- | --- |
| `.project-title` | `.project-icon`, heading, and `.project-category` |
| `.project-description` | Short description |
| `.project-features` | Optional capability list |
| `.card-actions` | `.project-primary` and optional `.project-secondary` links, or a `.coming-soon` status span |
| `.project-screenshot` | Optional desktop screenshot |

Cards use a tinted surface, rounded corners, serif headings, and actions below the features. Below 768px, they become a single column with smaller spacing and hidden screenshots; keep essential information in the text.

The default palette is orange; `.adamel` uses sage and `.udb-api` uses blue. Add color variants through `--project-accent`, `--project-border`, `--project-tint`, `--project-button-ink`, `--project-hover`, and the background, including light-theme overrides. Keep layout and typography in the shared rules rather than page-specific overrides.

Choose the heading level for the page (`h2`–`h4` are styled equally). Use empty alt text for decorative icons and descriptive alt text for screenshots. Preserve keyboard focus styles and the existing external-link pattern.

## Docker

Build and serve at [localhost:8080](http://localhost:8080), without a local Node.js installation:

```sh
docker compose up --build -d
```

Rerun after edits, or use automatic rebuilds with [Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/) (Docker Compose 2.22.0+):

```sh
docker compose up --build --watch
```

Watch rebuilds from files allowed by `.dockerignore`; refresh the browser afterward. Docker generates its own stylesheet, leaving local `styles.css` unchanged.

Set `CELVEREN_PORT=8081` before either command to change the port. Stop Watch with Ctrl+C; use `docker compose down` to stop and remove containers.

## Maintenance notes

Before publishing, check mobile and desktop layouts in both themes, links, images, keyboard navigation, and reduced-motion behavior.

Server setup and automatic deployment are documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). For a manual upload, include `index.html`, `tools-services.html`, `404.html`, `styles.css`, `script.js`, `daily-artwork.js`, `assets/`, and `migration/`.

Artwork sources and usage notes are in [docs/ASSETS.md](docs/ASSETS.md). No open-source license is currently assigned to this repository.

Preview the custom missing page at `/404.html`. Python’s basic server does not use custom error pages; use Docker to check actual missing-URL routing.

## Rebrand announcement and migration guide

Link to `https://celveren.dev/?from=lightsage` to show the dismissible rebrand announcement. The same parameter works on `/migration/`. Other visits do not show the banner. The guide is always available at `/migration/` and from the homepage footer.

Dismissal is remembered in this browser using the `celveren-rebrand-dismissed-v1` local-storage key, even on later tagged visits. Clear that key in browser developer tools to test the announcement again. If storage is unavailable, dismissal works for the current page view only.

The end-user guide explains replacing `lightsage.dev` with `celveren.dev` while keeping product subdomains, paths, query strings, and fragments intact. Old-domain redirect configuration can append `from=lightsage` to destination URLs (using `&` when a query already exists); this repository does not configure those redirects.
