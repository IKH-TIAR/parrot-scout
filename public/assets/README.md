# Asset Guide

This folder contains the local images used by the ParrotScout landing page.

## Current Files Used By The UI

- `hero-bg.png`
- `hvac-companies.png`
- `plumbing-companies.png`
- `small-service-teams.png`
- `owner-operators.png`

## Naming Convention

Use the exact filenames above unless you also update the matching paths in `src/App.tsx`.

## Fallback Behavior

The app includes fallback image logic:

- If a card image `.png` is missing, the UI tries the same name with `.jpg`.
- If that also fails, the UI falls back to a remote Unsplash image.
- The hero section falls back to a remote image if `hero-bg.png` cannot be loaded.

For best performance and consistent branding, keep these local files present.
