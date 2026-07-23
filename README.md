# Block Image Reveal — Developer Handoff

`block-image-reveal` is the active AstroLover Sketch frontend. It collects a first name, birth date, soulmate preference, and email address; requests an AI-generated portrait; and presents a staged celestial loader followed by a frosted 3×3 portrait reveal.

The application does not generate images itself. During local development it proxies `/api/*` to the sibling `block-image-reveal-api` service on port `8787`.

## Repository responsibilities

| Repository | Responsibility |
| --- | --- |
| `block-image-reveal` | Active React form, loader animation, portrait tiles, unlock flow, zodiac/date helpers, and frontend tests |
| `block-image-reveal-api` | `POST /api/generate`, image-provider integration, prompt enrichment, and background removal |

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- The sibling `block-image-reveal-api` service running on `http://127.0.0.1:8787`
- Docker Desktop or another Docker Compose runtime for local background removal

## Local development

Start background removal:

```bash
cd ../block-image-reveal-api
docker compose up -d background-removal
```

Start the generation API in a second terminal:

```bash
cd ../block-image-reveal-api
npm install
cp .env.example .env
npm run server
```

Start this frontend in a third terminal:

```bash
cd ../block-image-reveal
npm install
npm run dev
```

Open `http://127.0.0.1:5173/block-image-reveal/`. Vite proxies `/api` to `http://127.0.0.1:8787`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test -- --run` | Run the 31 Vitest tests once |
| `npm run lint` | Lint source and Vite configuration with Oxlint |
| `npm run build` | Type-check and create the production bundle in `dist/` |
| `npm run preview` | Serve the production bundle locally |

## Runtime flow

1. `ZodiacRevealLoader.jsx` validates the form locally. Personal form data stays in component state and is not written to storage or the URL.
2. `portraitGeneration.js` sends `{ name, birthdate, interestedGender, vibe }` to `POST /api/generate`.
3. The loader begins immediately while the API works:
   - Stage 1: preparation — 3 seconds
   - Stage 2: zodiac-wheel alignment — 4 seconds
   - Stage 3: planetary mapping — 4 seconds
   - Stage 4: romantic alignment — 4 seconds
   - Stage 5: energy reading — 4 seconds
4. If the portrait is not ready after the initial 19 seconds, stages 2–5 repeat in a 16-second loop.
5. When the generated PNG has loaded, Stage 6 displays all nine frosted blocks. The first button reveals three edge blocks; the second reveals the complete portrait in Stage 7.
6. `prefers-reduced-motion` skips the staged motion and waits directly for the completed composition.

There is currently no frontend request timeout. Provider or background-removal failures are surfaced as a retry message.

## Important source files

| File | Purpose |
| --- | --- |
| `src/views/ZodiacRevealLoader.jsx` | Form state, generation request, phase state machine, and unlock behavior |
| `src/views/ZodiacRevealLoader.css` | Responsive composition, wheel motion, frost blocks, and reduced-motion rules |
| `src/portraitGeneration.js` | API payload mapping, response validation, and image preloading |
| `src/zodiac.js` | Pure date validation, display formatting, and tropical zodiac calculation |
| `src/*.test.js` | Generation contract and zodiac boundary coverage |
| `public/images/celestial-wheels/` | Three production wheel layers used by Stage 2 |
| `vite.config.ts` | Root deployment base path and local `/api` proxy |
| `vercel.json` | Production rewrite from `/api/*` to `block-image-reveal-api` |

## Direct dependencies

Versions below are the declared package ranges; `package-lock.json` contains the exact resolved versions.

### Runtime

| Package | Range | Use |
| --- | --- | --- |
| `react` | `^18.2.0` | Component and state runtime |
| `react-dom` | `^18.2.0` | Browser root rendering |

### Development

| Package | Range | Use |
| --- | --- | --- |
| `@types/react` | `^18.2.66` | React types for TypeScript checks |
| `@types/react-dom` | `^18.2.22` | React DOM types |
| `@vitejs/plugin-react` | `^4.2.1` | JSX transform and React fast refresh |
| `oxlint` | `^1.71.0` | Source linting |
| `typescript` | `^5.2.2` | Static type checks and Vite-config compilation |
| `vite` | `^6.2.0` | Development server and production bundler |
| `vitest` | `^3.0.6` | Unit tests |

## API contract

Request:

```http
POST /api/generate
Content-Type: application/json

{
  "name": "Avery",
  "birthdate": "1992-05-06",
  "interestedGender": "male",
  "vibe": "dreamy"
}
```

Successful response fields used by this frontend:

```json
{
  "portraitUrl": "data:image/png;base64,..."
}
```

`portraitUrl` may also be an HTTP(S) URL. The frontend rejects other URL schemes or unsupported data-image formats.

## Production integration

The Vite development proxy does not exist after deployment. `vercel.json` preserves the same-origin `/api/generate` contract by rewriting API requests to `https://block-image-reveal-api.vercel.app`. The configured Vite base path is `/`, matching the Vercel production root.

Before release, run:

```bash
npm ci
npm run lint
npm test -- --run
npm run build
```

Do not commit `.env` files or provider credentials. Do not push or deploy from this workspace unless the repository owner explicitly requests it.

## Current limitations

- The loader repeats until the API returns because there is no client timeout or server progress endpoint.
- The API returns the transparent image as a base64 data URL, which increases response size compared with object storage.
- Email is collected for visual parity but is not persisted or sent by this frontend.
- Generated results are not cached, so refreshing requires another generation request.
