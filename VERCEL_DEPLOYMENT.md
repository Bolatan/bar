# Vercel single-deployment API architecture

The Next.js frontend and the existing Express API are deployed together.

- Frontend: Next.js
- API entry: `api/index.js`
- Express application: `server/src/app.js`
- Local server entry: `server/src/index.js`
- API paths remain `/api/*`
- MongoDB connection is cached across warm Vercel invocations.
- No `NEXT_PUBLIC_API_URL` rewrite is required.

Set the following in Vercel:
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN` (optional)
- `JWT_REFRESH_EXPIRES_IN` (optional)
- `VAT_RATE` (default `7.5`)
- `DISCOUNT_APPROVAL_THRESHOLD` (default `10`)
- `CLIENT_ORIGIN` (optional)

The root `package.json` contains the runtime dependencies previously isolated in `server/package.json`, because Vercel installs dependencies from the deployment root.
