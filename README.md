# API Marketplace (Call Cart Hub)

A mini API gateway by Alisha Chaudhari: **buy, meter and monitor APIs in real time.** Sellers list APIs, buyers purchase call quotas, and every request is logged.

## What's inside
- **Catalog:** browse APIs and buy call quotas.
- **Hashed API keys:** each buyer gets a key that is shown once and stored only as a hash.
- **Atomic metering:** every call through `/api/v1/:slug` checks and deducts quota in one step, so usage is never double-counted. Buyers get a warning when their quota runs low.
- **Live dashboards and logs:** response times and status codes for every request.
- **Admin console:** manage APIs, users and system-wide call logs, with role-based access.

The APIs on sale are dummy endpoints. This is a demo of the marketplace and metering model, not a production gateway.

**Stack:** TanStack Start (React + TypeScript), Tailwind + shadcn/ui, Supabase (auth, Postgres, row-level security). Tables: `profiles`, `user_roles`, `apis`, `subscriptions`, `call_logs`. Built with Lovable.

```bash
npm install
npm run dev
```
