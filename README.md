# Kindle Nonograms

A nonogram (picross) puzzle game designed to be played directly in the built-in web browser of a Kindle e-reader.

<!-- vibe:begin:features -->
No features have shipped yet — this project is in early scaffolding. Check back after the first release.
<!-- vibe:end:features -->

<!-- vibe:begin:install -->
**Prerequisites:** Node.js 22+ and npm.

```bash
npm install
```

Verify the install worked by running the test suite:

```bash
npm test
```
<!-- vibe:end:install -->

<!-- vibe:begin:usage -->
Run the backend API in development mode:

```bash
npm run dev:server
```

Run the frontend in development mode (in a separate terminal):

```bash
npm run dev:client
```

Build both the server and the client for production:

```bash
npm run build
```

Run the test suite:

```bash
npm test
```

Run the linter (auto-fixes style issues):

```bash
npm run lint
```
<!-- vibe:end:usage -->

## Documentation

<!-- vibe:begin:docs-index -->
- [docs/api.md](docs/api.md) — the server's HTTP API
- [docs/architecture.md](docs/architecture.md) — how the project's packages fit together
- [docs/configuration.md](docs/configuration.md) — environment variables and build-time settings
<!-- vibe:end:docs-index -->
