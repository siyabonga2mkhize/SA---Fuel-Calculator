# 🇿🇦 SA Fuel Calculator

A South African fuel-trip calculator built with React, TypeScript, Vite, Leaflet and Supabase.

## MVP features

- Route map with OpenStreetMap + Leaflet.
- Free-tier OpenRouteService geocoding and road routing when `VITE_ORS_API_KEY` is configured.
- Keyless read access to the public SA Fuel Price API by default.
- Vehicle selection with petrol/diesel types, base consumption and tank size.
- Driving-speed input that adjusts the planning estimate with a transparent heuristic.
- Inland/coastal fuel-price selection.
- Trip distance, duration, litres used, fuel price, total cost and cost/km.
- Supabase schema ready for vehicles, monthly fuel prices and authenticated trip history.

## Stack

- React 19 + TypeScript
- Vite 8
- Leaflet + React-Leaflet
- Supabase PostgreSQL + Supabase JS v2
- OpenRouteService for geocoding/routing
- SA Fuel Price API for South African monthly prices

## Run locally

Use Node.js 22 or newer.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open the local URL printed by Vite.

### Environment variables

`VITE_FUEL_API_URL` defaults to `https://sa-fuel-api.railway.app`.

`VITE_ORS_API_KEY` is optional for the demo. Without it, the app supports a small built-in list of South African cities and uses a straight-line fallback route. Add a free OpenRouteService API key for real road routing and geocoding.

`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are optional for the current calculator UI. They are prepared for the next iteration where we persist vehicles, price history and user trips.

## Supabase

Run `supabase/migrations/202608280001_initial_schema.sql` in the Supabase SQL Editor. The migration creates the `vehicles`, `fuel_prices` and `trips` tables, enables row-level security, and seeds the initial vehicle set.

## Free-tier design

The application is designed so the core calculation does not depend on a paid AI service. Map display uses OpenStreetMap tiles through Leaflet; road routing uses OpenRouteService within its public service restrictions; fuel prices come from the free public SA Fuel Price API. Usage limits and third-party service policies still apply.

## Calculation model

```text
adjusted consumption = base consumption × speed factor
fuel required        = distance / 100 × adjusted consumption
fuel cost            = fuel required × price per litre
cost per kilometre   = fuel cost / distance
```

The speed factor is explicitly a planning heuristic. It should not be presented as an official vehicle efficiency test.

## Inspiration

The project takes architectural and product inspiration from:

- GIScience OpenFuelService — vehicle/speed/fuel calculation concepts.
- `thes4s67/fuel-trip-calculator` — trip calculator and map workflow.
- `guerillagardeningkzn-design/sa-fuel-api` — South African fuel price API structure and historical price model.

Those projects are references, not runtime dependencies of this repository.
