# ScaleEzy Inventory — frontend

The shop's app: products, stock, shelves, purchase orders, orders and the counter (New sale),
returns, offers, the Day Book, WhatsApp, and the Help Center guide (`/help`, in English, Telugu,
Hindi, Tamil and Kannada).

React + Vite, TanStack Query, react-hot-toast; PDFs with `@react-pdf/renderer`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173, talks to the backend on http://localhost:4006
npm run build      # production build into dist/
```

Settings come from `.env` (see `.env.example`). Deployed on Vercel (`vercel.json`); `Dockerfile`
and `nginx.conf` are for running it in a container.

## Where things are

| Folder | What |
|---|---|
| `src/pages` | One file per screen (`sales/`, `shelves/`, `settings/` group related screens) |
| `src/components` | Shared pieces; `common/Select.jsx`, `ConfirmModal.jsx`, `pdf/` letterhead, `whatsapp/` |
| `src/hooks` | Data for each area (one hook file per area, e.g. `useWhatsApp.js`) |
| `src/help` | The Help Center: `content/<section>/<page>.md` (+ `.te/.hi/.ta/.kn.md`), `images/`, `sections.js` for the menu |
| `scripts/verify-css-vars.mjs` | Checks every CSS variable used is defined |

The screen tests (Playwright robot) live outside this repo, in `PLAN-help/robot`.
