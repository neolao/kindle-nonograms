---
status: todo
---
# Add a Favicon

## Description
The app currently has no favicon — `packages/client/index.html` declares no icon and the client has no `public/` folder to serve one from. A favicon should be added so the site has a proper tab icon in browsers, including Kindle's built-in browser.

## Acceptance Criteria
- [ ] A favicon asset exists in the client package (served as a static file, e.g. via `packages/client/public/`)
- [ ] `packages/client/index.html` links the favicon via a `<link rel="icon">` tag
- [ ] The favicon is included in the production build output and resolves correctly (no 404) both in dev and in the built static site
- [ ] The favicon renders legibly at small sizes and in the e-ink/high-contrast context targeted by the Kindle browser

## Notes
Vite serves anything placed in `packages/client/public/` at the site root, so a `public/favicon.ico` or `public/favicon.svg` is the simplest fit given the current structure (no `public/` folder exists yet). Format choice (`.ico` vs `.svg`) and actual icon design are left open — pick whatever keeps contrast high and file size minimal, in line with the project's e-ink constraints.
