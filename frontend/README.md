# Guardians of the Slums — Frontend

A shared operational picture for informal-settlement safety — connecting
citizens, volunteers, and municipal authorities on one live platform.
Built for the IBM Hackathon.

This repo is **frontend only**. No backend or AI/ML logic lives here —
authentication and all data are dummy/local so every flow is fully
demoable without a server. See `src/context/AuthContext.jsx` and the
`src/data/*.js` files for where that's wired.

## Stack

- **React 19** + **Vite** — app shell and dev/build tooling
- **Tailwind CSS** — utility-first styling on a custom dark-first design-token system
- **shadcn/ui-style components** (Radix primitives + CVA) — accessible, composable UI
- **React Router** — routing, role-based protected routes
- **TanStack React Query** — server-state fetching/caching (ready for a real API)
- **Axios** — HTTP client (single configured instance in `src/lib/axios.js`)
- **Leaflet** + **react-leaflet** + **leaflet.heat** — interactive maps, heatmap layer
- **Recharts** — charts
- **Framer Motion** — page transitions, micro-interactions
- **Lucide React** — icon set
- **IBM Plex Sans / Mono** — self-hosted via `@fontsource`

## Getting started

```bash
npm install
cp .env.example .env   # then fill in VITE_API_BASE_URL etc.
npm run dev
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

### Demo logins

Dummy auth, seeded in `src/context/AuthContext.jsx`. Password for all: `demo1234`.

| Role      | Email               |
|-----------|----------------------|
| Authority | authority@demo.io    |
| Volunteer | volunteer@demo.io    |
| Citizen   | citizen@demo.io      |
| Admin     | admin@demo.io        |

Or use the one-click role buttons on the `/login` page. New accounts can
also be created via `/register` for any of the four roles.

## What's built

- **Marketing site** — landing page (Hero, Problem, Solution, Architecture,
  Features, IBM tech stack, How it Works, Impact, Footer)
- **Auth** — Login, Register (with role selection), Forgot Password —
  glassmorphic UI, full client-side validation
- **Dashboard shell** — collapsible desktop sidebar, mobile drawer + bottom
  tab bar, floating action button, global search (⌘K), notification drawer
  with simulated real-time arrivals, dark/light theme toggle
- **Role dashboards** — Authority, Volunteer, Citizen, Admin, each with
  role-appropriate cards, charts, tables, and queues
- **Live Map** — shelters/hospitals/schools markers, dummy heatmap, static
  GeoJSON road layer, layer toggle, fullscreen, legend
- **Incident Details** — evidence gallery, risk score, AI-explanation
  preview, timeline, assigned volunteers, local chat preview, audit history
- **Design system** — typography, spacing, buttons, cards, charts, tables,
  status chips, alerts, toasts, skeletons/loading states — see
  `src/components/ui/`

## Folder structure

```
src/
├── assets/                Static images/icons
├── components/
│   ├── ui/                 Design-system primitives (button, card, table, chart, toast, ...)
│   ├── layout/              App shell: Sidebar, Navbar, MobileSidebar, BottomNavigation,
│   │                         FloatingActionButton, NotificationDrawer, PageTransition
│   ├── auth/                 Route guards: ProtectedRoute, GuestRoute
│   ├── landing/               Marketing page sections
│   ├── dashboard/              Per-role dashboard widgets (authority/, volunteer/, citizen/)
│   ├── incident/                Incident Details page widgets
│   ├── map/                      Leaflet map + layers (heatmap, roads, legend, markers)
│   └── common/                    Shared building blocks (StatCard, ...)
├── constants/              Routes, roles, map defaults, breadcrumb config
├── context/                 AuthContext, ThemeProvider, NotificationContext
├── data/                     Dummy JSON fixtures, one file per feature area
├── hooks/                     Shared hooks (useMediaQuery, use-toast, ...)
├── lib/                        axios instance, query client, cn(), validation helpers
├── pages/                       Route-level page components
├── routes/                       AppRoutes.jsx — central route table
├── styles/                        globals.css — design tokens, Leaflet/toast overrides
├── App.jsx                        Composition root: providers + router
└── main.jsx                       Entry point
```

## Conventions

- Use the `@/` path alias for all internal imports.
- New primitives go in `src/components/ui/` and follow the existing pattern
  (forwardRef, `cn()`, CVA variants).
- Feature UI for a dashboard/page lives next to it under
  `src/components/<area>/`, not lumped into `ui/` or `common/`.
- Dummy data lives in `src/data/<feature>.js`, one export per fixture —
  swap for a real query without touching the components that consume it.
- All HTTP calls go through the shared `api` instance in `src/lib/axios.js`.
- Add new routes in `src/routes/AppRoutes.jsx`; wrap role-restricted ones
  in `<ProtectedRoute allowedRoles={[...]}>`.

## Not included (by design)

- No backend or AI/ML logic — auth and all data are local/dummy.
- AI-labeled surfaces (AI Explanation, AI Recommendations, heatmap) are
  clearly marked as previews — no model is actually called.
