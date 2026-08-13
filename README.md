# Malt & Lime Bar Management

A bar management workspace for Nigeria operations, with a Next.js web interface and an Express + MongoDB API.

## Stack

- **Frontend:** Next.js, React, Tailwind CSS, Lucide icons
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB
- **Authentication:** JWT access and refresh tokens
- **Validation:** Zod
- **Currency:** Nigerian Naira (NGN)

## Project structure

- `app/` — web application
- `lib/api.ts` — typed API client
- `server/src/` — Express API, models, routes, controllers, and seed script

## Run locally

1. Install the frontend dependencies from the project root.
2. Install the backend dependencies from the `server` directory.
3. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and `JWT_SECRET`.
4. Start MongoDB locally or use a MongoDB Atlas connection string.
5. Seed demo data with `npm run seed` from `server`.
6. Start the API with `npm run dev` from `server`.
7. Set `NEXT_PUBLIC_API_URL=http://localhost:5000/api` for the frontend and use the existing frontend development command.

## Demo accounts

After seeding:

- Owner: `owner@maltlime.ng` / `password123` / PIN `1234`
- Manager: `manager@maltlime.ng` / `password123` / PIN `1234`
- Staff: `staff@maltlime.ng` / `password123` / PIN `1234`

Change all demo credentials before using the application outside a local demo.

## API routes

- `/api/auth` — login, registration, refresh, current user
- `/api/users` — owner-only staff management
- `/api/products` — inventory CRUD and low-stock filtering
- `/api/suppliers` — supplier CRUD
- `/api/stock-movements` — stock movement history and adjustments
- `/api/orders` — tabs, checkout, and manager-approved voids
- `/api/shifts` — open, close, current, and history
- `/api/reports` — sales, inventory valuation, and low stock

The API applies Nigeria’s 7.5% VAT rate during checkout, records sales as stock movements, and logs sensitive actions such as voids, discounts, stock adjustments, and staff changes.
