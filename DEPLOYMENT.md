# Production Deployment Guide - Salesman Visit Suite

This guide explains how to deploy the Salesman Visit Field Management & Tracking Suite to production.

---

## Architecture Overview
- **Backend**: Node.js / Express with Socket.IO WebSockets and MongoDB.
- **Frontend**: React 18, Vite, TailwindCSS, Leaflet Maps.
- **Two Deployment Modes Supported**:
  1. **Mode A (Unified Single Service - Recommended for Render / Railway)**: The backend serves both the `/api/*` REST endpoints, WebSockets, and statically hosts the compiled frontend from `client/dist`.
  2. **Mode B (Separated Hosting)**: Backend deployed to Render/Railway, and Frontend deployed to Vercel/Netlify.

---

## 1. Quick Deploy: Mode A (Unified on Render / Railway)

### Step 1: Create MongoDB Database (MongoDB Atlas)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free or dedicated cluster.
2. Under **Database Access**, create a user (e.g. `admin`) and set a strong password.
3. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere).
4. Click **Connect -> Drivers** and copy your connection string:
   ```
   mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/salesman_field_suite?retryWrites=true&w=majority
   ```

### Step 2: Deploy to Render
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New + -> Web Service**.
3. Connect your GitHub repository.
4. Configure service settings:
   - **Name**: `salesman-field-suite`
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm run install:all && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
5. Add **Environment Variables**:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: Your MongoDB Atlas connection string.
   - `JWT_SECRET`: A secure random string (e.g. `prod_secret_key_salesman_2026`).
   - `JWT_EXPIRE`: `30d`
6. Click **Deploy Web Service**.
   - The server will connect to MongoDB, automatically provision the Super Admin role and account on first boot, and serve the full application!

---

## 2. Deploy: Mode B (Separated on Vercel + Render)

### Backend on Render (Web Service):
- **Build Command**: `cd server && npm install`
- **Start Command**: `cd server && node server.js`
- **Environment Variables**:
  - `MONGO_URI`: MongoDB Atlas connection string
  - `JWT_SECRET`: Random secure string
  - `CLIENT_URL`: `https://your-frontend-app.vercel.app`

### Frontend on Vercel:
- **Root Directory**: `client`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**:
  - `VITE_SERVER_URL`: `https://your-backend-service.onrender.com`

> **Note**: `client/vercel.json` and `client/public/_redirects` are already configured so React Router SPA navigation (`/visits`, `/users`, `/dashboard`) works smoothly on page refresh without 404 errors.

---

## 3. Initial Login Credentials
On brand-new database deployments, the system boots automatically with the primary administrator:
- **Email**: `admin@gmail.com`
- **Password**: `Admin@123456`
- **Role**: `Super Admin` (All permissions enabled)

*(You can change the email and password anytime from the **Users** tab).*

