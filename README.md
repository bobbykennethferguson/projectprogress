# Job Milestone Progress Tracker

A web app for tracking manufacturing job milestones and progress. Built with React + TypeScript + Vite.

## Features

- **Jobs Overview** — See all jobs as cards with progress bars and next milestone
- **Job Detail** — Check off milestones grouped by phase, with timestamps
- **Template Editor** — Customize the milestone template for new jobs
- **Weighted Progress** — Toggle between equal-weight and phase-weighted progress calculation
- **Export/Import** — Back up and restore all data as JSON
- **Responsive** — Works on desktop and mobile
- **No backend** — All data stored in localStorage

## Getting Started

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (typically http://localhost:5173).

## Default Milestone Template

| Phase | Milestones |
|-------|-----------|
| Kickoff | Payment received, Job opened / PO created |
| Engineering | Drawings sent to customer, Customer approval received, Final drawings locked |
| Fabrication | Fabrication started, Major fabrication complete, Pressure/leak test passed |
| Finishing | Passivation complete, Foam complete |
| Tile | Tile materials received, Tile started, Tile complete |
| Shipping | Final QC complete, Shipping scheduled, Packed & loaded, Shipped, Closeout complete |

## Weighted Mode

When enabled, phases have configurable weights (default: Kickoff 10, Engineering 20, Fabrication 35, Finishing 10, Tile 15, Shipping 10). Each phase's weight is distributed equally across its milestones.

## Tech Stack

- React 19 + TypeScript
- Vite
- React Router
- localStorage for persistence
