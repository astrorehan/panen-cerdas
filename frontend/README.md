# PanenCerdas - Frontend (Next.js)

Next.js 14 + TypeScript + Tailwind + shadcn/ui + react-leaflet.

## Quick start

```powershell
# from frontend/ directory
copy .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

The dev server proxies `/api/*` requests to the FastAPI backend at `http://localhost:8000`
(see `next.config.mjs`). Make sure the backend is running first.

## Scripts

- `npm run dev` - dev server on :3000
- `npm run build` - production build
- `npm start` - run production build
- `npm run lint` - eslint
- `npm run type-check` - tsc --noEmit

## Folder map

```
frontend/
  src/
    app/
      page.tsx            # Dashboard (route: /)
      peta/page.tsx       # Peta Prediksi
      detail/page.tsx     # Detail Kecamatan
      tentang/page.tsx    # Tentang
      layout.tsx
      globals.css
    components/
      navbar.tsx
      kpi-card.tsx
      trend-chart.tsx
      choropleth-map.tsx  # client-only (react-leaflet)
      ui/
        button.tsx
        card.tsx
    lib/
      api.ts              # backend HTTP client
      utils.ts            # cn(), formatters, status color map
    types/
      index.ts            # shared types matching backend schemas
```
