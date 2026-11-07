# FieldPulse Pro — Standalone B2B Field Sales & Visit Management SaaS Suite

> **An independent, production-ready, commercial-grade Field Sales Automation, Real-Time Fleet Radar (Uber/Ola View), and Dynamic Role-Based Access Control (RBAC) System.**

This project is completely decoupled and standalone with its own backend (`server/`), frontend dashboard (`client/`), and database schema. It is ready to be packaged, licensed, or sold independently as a SaaS product.

---

## 🌟 Key Features

### 1. Dynamic Administration & Custom Role Controls (RBAC)
- Admin can create, edit, and delete custom roles (e.g. `Super Admin`, `Area Manager`, `Field Salesman`, `Auditor`).
- Multi-select checklist of available UI modules:
  - `dashboard`: KPI Metrics & Revenue Gauges
  - `live_tracking`: Real-time Fleet Radar with 60 FPS vehicle gliding
  - `routes`: Route Planning & Sequence
  - `visits`: Field Visit Check-In / Check-Out & Geotagging
  - `parties`: Retailers & Customer Directory
  - `collections`: Payment Receipts & Daily Ledger
  - `salesmen`: Field Staff Directory & Targets
  - `users`: User Administration
  - `roles`: Role & Permission Management
- **Dynamic UI Rendering:** When a user logs in, the sidebar and dashboard automatically show **only** the screens permitted for their role. Backend routes strictly reject unauthorized requests with HTTP `403 Forbidden`.

### 2. Live Fleet Radar (Uber / Ola Real-Time Engine)
- **60 FPS Vector Gliding (LERP):** Marker glides smoothly along vectors without teleportation or jumps.
- **Dynamic 360° Bearing Rotation:** Top-down delivery vehicle/scooter SVG rotates to face the direction of travel using mathematical Great-Circle Azimuth calculation.
- **Turn-by-Turn Road Snapping (OSRM):** Maps visits and breadcrumbs to actual streets and highways with live distance (`km`) and drive time (`mins`).
- **Sequenced Customer Stop Badges:** Visual stop pins (`[✓ 1] Completed`, `[🔵 2] Next Target`, `[3] Pending`).
- **Cockpit Telemetry HUD:** Floating glassmorphic dashboard with live speedometer, device battery indicator, GPS precision meter, and one-click **Camera Follow Mode**.

### 3. Field Route Planning & Sequences
- Plan daily schedules, assign territory salesmen, and sequence customer stop milestones (`Stop 1 -> Stop 2 -> Stop 3`).

### 4. Visit Execution & Proof of Visit
- Geo-tagged check-in and check-out with timestamp, GPS accuracy, visit duration, purpose, and order amount.

### 5. Payment Collections & Reconciliation
- Instant payment receipt generation (Cash, UPI / QR, Cheque, Bank Transfer) with automatic customer ledger balance reconciliation.

---

## 📁 Project Architecture

```
salesman-field-suite/
├── server/                 # Standalone Express + MongoDB + Socket.IO API
│   ├── config/db.js        # Dedicated MongoDB connection
│   ├── models/             # Role, User, Salesman, Party, Route, Visit, Collection, Location
│   ├── middleware/         # JWT Auth, Role Permission Checker
│   ├── controllers/        # Full Business Logic
│   ├── services/           # Real-time WebSocket Gateway
│   ├── routes/             # REST API endpoints
│   ├── scripts/seed.js     # Enterprise Demo Seeder
│   └── server.js           # Server Entrypoint (Port 5070)
│
├── client/                 # Standalone React + Vite + Tailwind CSS Dashboard
│   ├── src/
│   │   ├── context/        # AuthContext (RBAC engine), SocketContext
│   │   ├── components/     # Dynamic Sidebar, Navbar, ProtectedRoute
│   │   └── pages/          # Login, Dashboard, LiveFleetRadar, RoleManagement, UserManagement...
│   └── package.json        # Client dependencies (Port 5173)
│
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Backend Setup
```bash
cd server
npm install
npm run seed     # Pre-populates Roles, Users, Salesmen, Parties & GPS demo
npm run dev      # Starts server on http://localhost:5070
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev      # Starts dashboard on http://localhost:5173
```

---

## 🔑 Default Credentials (Ready for Demo)

| Role | Email | Password | Allowed Screens |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@salesmanfield.com` | `admin123` | **All Screens** (Unconstrained) |
| **Area Manager**| `manager@salesmanfield.com` | `manager123` | Dashboard, Live Radar, Routes, Visits, Parties, Collections, Salesmen |
| **Field Salesman** | `salesman1@salesmanfield.com` | `salesman123` | Dashboard, Routes, Customer Visits, Collections, Parties |

---

## 💰 Commercial Resale / SaaS Packaging Note
This product is 100% self-contained. To sell to a new client:
1. Copy the `salesman-field-suite` folder or zip it.
2. Provide a new MongoDB connection string in `server/.env`.
3. Run `npm run seed` or configure their initial Super Admin user.
4. Deploy the server (via Docker, PM2, or Railway/Render) and client (via Vercel, Netlify, or NGINX).

