# TransitWise — Public Transport Crowding & Route Recommendation

A DBMS Level 3 academic project demonstrating a web application backed by MySQL and MongoDB. This Windows package runs with locally installed MySQL Server and MongoDB Community Server; Docker is not required.

## Technology stack

- Next.js 15 / React 19 — web interface and API Route Handlers.
- MySQL 8.x — relational transport data, integrity constraints, views, procedure and trigger.
- MongoDB Community Server — flexible crowd observation documents and aggregation.
- MySQL Workbench — execute and inspect the SQL schema.
- `mysql2` / MongoDB Node driver — database connectivity.
- Zod — request validation.
- bcryptjs + jose — password hashing and signed HTTP-only session cookie.

## Install and run on Windows

1. Extract the ZIP and open `public-transport-crowding-system` in VS Code.
2. Copy your local `.env.local` into the project folder, or copy `.env.example` to `.env.local` and set your actual MySQL password. The application uses `.env.local` in Next.js. The seed/check scripts also load `.env.local`.
3. Start MySQL Server and MongoDB Server from Windows Services (`services.msc`).
4. In MySQL Workbench, execute `database/mysql/init.sql` to create `transit_db` and its sample tables/data. This does not modify a different database such as `publictransportdb`.
5. In VS Code PowerShell:

```powershell
npm install
npm run db:check
npm run db:seed
npm run dev
```

6. Open `http://localhost:3000`.

## Access roles and pages

- `/` — public landing page only. It does not expose route search or administrator controls. An account is required before planning a journey.
- `/login` — passenger sign-up and sign-in.
- `/routes` — passenger route-planning workspace. Requires a signed-in `PASSENGER` account.
- `/admin/login` — separate administrator sign-in page.
- `/admin` — administrator dashboard. Requires a signed-in `ADMIN` account.

Passenger registration always creates the `PASSENGER` role. Users cannot select or self-assign the administrator role. The administrator sign-in endpoint checks the stored role; passenger accounts cannot enter the admin dashboard. The route list and route-recommendation APIs also require passenger authentication. Crowd-update and analytics APIs require administrator authentication.

### Demo accounts

Run `npm run db:seed` to create/reset these local demonstration accounts:

- Admin: `admin@transitwise.local` / `Admin@123`
- Passenger: `passenger@transitwise.local` / `Passenger@123`

You can also register a passenger account through `/login`.

## Main functionality

- Passenger registration and sign-in.
- Protected passenger route-planning workspace.
- Source/destination stop selection and route ranking.
- Reverse-direction matching for sample routes.
- Crowd level, travel time, distance, transfer count and estimated fare.
- Separate administrator portal for crowd updates and route analytics.
- Admin crowd update writes operational history to MySQL and crowd observation documents to MongoDB.

**Data note:** the included stops, routes and crowd readings are synthetic academic demonstration data, not a live BMTC feed.

## API endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a passenger account |
| POST | `/api/auth/login` | Public, passenger-only | Passenger sign in |
| POST | `/api/auth/admin-login` | Public, admin-only | Administrator sign in |
| POST | `/api/auth/logout` | Signed-in | Clear the session |
| GET | `/api/stops` | Passenger | Stops and passenger dashboard summary |
| POST | `/api/routes/recommend` | Passenger | Find and rank direct/reverse routes |
| GET | `/api/admin/routes` | Admin | List routes for crowd management |
| POST | `/api/admin/crowding` | Admin | Update crowd reading |
| GET | `/api/analytics/route` | Admin | Call route popularity stored procedure |

## Route ranking

Lower score is better:

`crowd_percent × 0.55 + duration_minutes × 0.65 + distance_km × 1.2 + transfers × 12`

## Database concepts demonstrated

1. DDL: tables, view, procedure, trigger, constraints and indexes.
2. DML: inserts and selects in application flows and demo seed process.
3. Joins across routes, stops and buses.
4. Aggregate functions and grouping in dashboard and analytics.
5. MySQL view: `route_overview`.
6. Stored procedure: `GetRoutePopularity`.
7. Trigger: `crowding_insert_audit` records new crowd summary rows.
8. Indexes on route/date, schedules and crowd history.
9. MySQL transaction with commit/rollback for crowd updates.
10. MongoDB aggregation using `$match`, `$sort` and `$group` to find the latest reading per route.

### MongoDB data model

Database: `transit_analytics`; collection: `crowd_readings`.

```json
{
  "routeId": 2,
  "crowdPercent": 42,
  "source": "ADMIN",
  "observedAt": "2026-11-04T05:00:00.000Z",
  "updatedBy": 1
}
```

Indexes: `{ routeId: 1, observedAt: -1 }` and `{ observedAt: -1 }`.

## Testing

```powershell
npm test
npm run build
```

Manual checks:
- [ ] Landing page contains no route-search controls or admin crowd form.
- [ ] Unauthenticated visit to `/routes` redirects to `/login`.
- [ ] Passenger can register and sign in.
- [ ] Passenger can access `/routes` after sign-in.
- [ ] Unauthenticated route/stops API calls are rejected.
- [ ] Passenger account is rejected by `/admin/login`.
- [ ] Admin can sign in at `/admin/login` and open `/admin`.
- [ ] Admin can update crowd readings.
- [ ] Passenger can search routes and see route options.

## Security and deployment notes

This is a local academic demonstration. Change demo passwords and `JWT_SECRET` before deployment. Use HTTPS, secure secret storage, rate limiting, CSRF protections for cookie-authenticated write endpoints, and production-grade session management before exposing the app publicly. The MySQL + MongoDB write is sequential, not a distributed transaction; a production system should use an outbox/retry approach to reconcile failures across the databases.

## Suggested team split

- Member 1: MySQL ER model, schema, constraints, views, stored procedure, trigger, SQL reports and database evidence.
- Member 2: Next.js UI, API integration, MongoDB model/aggregation, authentication, route ranking and application test evidence.

Replace this suggested split with the work actually completed by each member.


## Completed-trip logging and route popularity

The administrator's **Completed trips** value counts rows in `passenger_trips`. Route searches do not create trip rows: a passenger must first sign in, search for a route, travel, and then explicitly click **Record completed trip** on the route result. This keeps route popularity figures from being inflated by searches that never became journeys.

For an existing `transit_db`, open `database/mysql/patches/001_trip_logging_and_analytics.sql` in MySQL Workbench and execute it once. This ensures the trip table and the route-popularity stored procedure are in place. No existing trip data is dropped, and `publictransportdb` is not changed.
