# Célveren portfolio

My developer portfolio — a place to share what I’m building and working on next.

Currently featuring Lightning, Adamel, and UDB-API. Built with HTML, Tailwind CSS, and JavaScript, with support for light and dark mode.

## Local development

Open `index.html` directly for a quick look, or serve it locally:

```sh
python3 -m http.server 4174 --bind 127.0.0.1
```

The site will be at [localhost:4174](http://127.0.0.1:4174/). Card-style experiments live in [previews/index.html](previews/index.html).

To rebuild the styles with Node.js installed:

```sh
npm ci
npm run build
```

Use `npm run watch` while editing. Page content lives in `index.html` and `tools-services.html`, styles in `input.css`, and small interactions in `script.js`. `styles.css` is generated; do not edit it directly.

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

Server setup and automatic deployment are documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). For a manual upload, include `index.html`, `tools-services.html`, `404.html`, `styles.css`, `script.js`, `daily-artwork.js`, and `assets/`.

Artwork sources and usage notes are in [docs/ASSETS.md](docs/ASSETS.md). No open-source license is currently assigned to this repository.

Preview the custom missing page at `/404.html`. Python’s basic server does not use custom error pages; use Docker to check actual missing-URL routing.
