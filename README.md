# ParrotScout Landing Page

Marketing landing page for ParrotScout, an AI receptionist product focused on HVAC and plumbing businesses.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- lucide-react (icons)

## Getting Started

Prerequisites:

- Node.js 18+
- npm 9+

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The app runs on `http://localhost:3000` by default.

## Available Scripts

- `npm run dev`: starts Vite dev server on `0.0.0.0:3000`
- `npm run build`: creates production build in `dist/`
- `npm run preview`: serves the production build locally
- `npm run lint`: runs TypeScript type checking (`tsc --noEmit`)
- `npm run clean`: removes `dist/`

## Project Structure

```text
.
|- public/
|  |- assets/            # landing page images
|- src/
|  |- App.tsx            # full landing page UI
|  |- main.tsx           # app entry point
|  |- index.css          # Tailwind import
|- index.html
|- metadata.json
|- vite.config.ts
```

## Assets

The page expects images under `public/assets`. See `public/assets/README.md` for naming details.

## Notes

- This repo currently ships a static marketing UI (form controls are presentational).
- If you add backend or API integrations later, document any required environment variables here.
