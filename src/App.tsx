import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import { Car, Gauge, Fuel, MapPin, Route, Sparkles, TriangleAlert } from 'lucide-react'
import { calculateTrip, type TripResult } from './lib/calculations'
import { geocodePlace, getLatestFuelPrices, getRoute, type FuelPrices, type Place, type RouteResult } from './lib/services'

const vehicles = [
  { id: 'corolla-cross', label: 'Toyota Corolla Cross 1.8', fuel: 'petrol95', consumption: 7.0, tank: 47 },
  { id: 'polo', label: 'Volkswagen Polo 1.0 TSI', fuel: 'petrol95', consumption: 6.0, tank: 40 },
  { id: 'fortuner', label: 'Toyota Fortuner 2.8', fuel: 'diesel', consumption: 8.6, tank: 80 },
  { id: 'hilux', label: 'Toyota Hilux 2.4 GD-6', fuel: 'diesel', consumption: 8.3, tank: 80 },
  { id: 'ranger', label: 'Ford Ranger 2.0', fuel: 'diesel', consumption: 8.5, tank: 80 },
]

type FuelOption = 'petrol95' | 'petrol93' | 'diesel'
type Region = 'coastal' | 'inland'

function MapViewport({ origin, destination }: { origin: Place | null; destination: Place | null }) {
  const map = useMap()
  useEffect(() => {
    if (origin && destination) {
      map.fitBounds([[origin.lat, origin.lon], [destination.lat, destination.lon]], { padding: [30, 30] })
    }
  }, [map, origin, destination])
  return null
}

function money(value: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value)
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins}m`
}

export default function App() {
  const [originText, setOriginText] = useState('Durban')
  const [destinationText, setDestinationText] = useState('Johannesburg')
  const [vehicleId, setVehicleId] = useState(vehicles[0].id)
  const [fuelType, setFuelType] = useState<FuelOption>('petrol95')
  const [region, setRegion] = useState<Region>('coastal')
  const [speed, setSpeed] = useState(100)
  const [prices, setPrices] = useState<FuelPrices | null>(null)
  const [priceError, setPriceError] = useState('')
  const [origin, setOrigin] = useState<Place | null>(null)
  const [destination, setDestination] = useState<Place | null>(null)
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [result, setResult] = useState<TripResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const vehicle = useMemo(() => vehicles.find((item) => item.id === vehicleId) || vehicles[0], [vehicleId])

  useEffect(() => {
    setFuelType(vehicle.fuel as FuelOption)
  }, [vehicle.fuel])

  useEffect(() => {
    getLatestFuelPrices().then(setPrices).catch((err: Error) => setPriceError(err.message))
  }, [])

  const pricePerLitre = useMemo(() => {
    if (!prices) return null
    if (fuelType === 'petrol95') return region === 'coastal' ? prices.petrol95Coastal : prices.petrol95Inland
    if (fuelType === 'petrol93') return prices.petrol93Inland
    return region === 'coastal' ? prices.dieselCoastal : prices.dieselInland
  }, [fuelType, prices, region])

  async function handleCalculate() {
    setBusy(true)
    setError('')
    try {
      const resolvedOrigin = await geocodePlace(originText)
      const resolvedDestination = await geocodePlace(destinationText)
      const routeResult = await getRoute(resolvedOrigin, resolvedDestination)
      if (!pricePerLitre) throw new Error('No fuel price is available. Check the fuel-price API connection.')

      const tripResult = calculateTrip({
        distanceKm: routeResult.distanceKm,
        consumptionLPer100Km: vehicle.consumption,
        speedKmh: speed,
        pricePerLitre,
      })

      setOrigin(resolvedOrigin)
      setDestination(resolvedDestination)
      setRoute(routeResult)
      setResult(tripResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to calculate this trip.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Fuel size={20} /></div>
          <div>
            <strong>SA Fuel Calculator</strong>
            <span>South African trip planning</span>
          </div>
        </div>
        <div className="status-pill"><span className="status-dot" /> Free-tier stack</div>
      </header>

      <main className="content">
        <section className="hero">
          <div>
            <p className="eyebrow">PLAN YOUR DRIVE</p>
            <h1>Know the route. Know the fuel cost.</h1>
            <p className="hero-copy">Route-aware fuel estimates using your vehicle, fuel type and driving speed.</p>
          </div>
          <div className="hero-badge"><Sparkles size={17} /> No AI required for the core calculation</div>
        </section>

        <section className="card form-card">
          <div className="section-title"><Route size={18} /><span>Trip setup</span></div>
          <div className="form-grid two">
            <label>
              <span>From</span>
              <div className="input-with-icon"><MapPin size={17} /><input value={originText} onChange={(e) => setOriginText(e.target.value)} placeholder="Durban" /></div>
            </label>
            <label>
              <span>To</span>
              <div className="input-with-icon"><MapPin size={17} /><input value={destinationText} onChange={(e) => setDestinationText(e.target.value)} placeholder="Johannesburg" /></div>
            </label>
          </div>

          <div className="form-grid three">
            <label>
              <span><Car size={15} /> Vehicle</span>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                {vehicles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label>
              <span><Fuel size={15} /> Fuel</span>
              <select value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelOption)}>
                <option value="petrol95">Petrol 95</option>
                <option value="petrol93">Petrol 93</option>
                <option value="diesel">Diesel 50ppm</option>
              </select>
            </label>
            <label>
              <span>Price zone</span>
              <select value={region} onChange={(e) => setRegion(e.target.value as Region)}>
                <option value="coastal">Coastal</option>
                <option value="inland">Inland</option>
              </select>
            </label>
          </div>

          <div className="speed-block">
            <div className="speed-heading"><span><Gauge size={16} /> Average driving speed</span><strong>{speed} km/h</strong></div>
            <input type="range" min="60" max="130" step="5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
            <div className="range-labels"><span>60</span><span>100</span><span>130 km/h</span></div>
          </div>

          <div className="vehicle-meta">
            <span>{vehicle.label}</span>
            <span>Base estimate: {vehicle.consumption.toFixed(1)} L/100km</span>
            <span>Tank: {vehicle.tank} L</span>
          </div>

          <button className="primary-button" onClick={handleCalculate} disabled={busy || !pricePerLitre}>
            {busy ? 'Calculating route…' : 'Calculate trip'}
          </button>

          {priceError && <div className="notice warning"><TriangleAlert size={16} /> Fuel API: {priceError}</div>}
          {error && <div className="notice error"><TriangleAlert size={16} /> {error}</div>}
        </section>

        <section className="workspace">
          <div className="map-card card">
            <div className="map-header"><div><strong>Route map</strong><span>{route ? 'Calculated route' : 'Enter a trip to calculate the route'}</span></div><span className="map-chip">OpenStreetMap</span></div>
            <div className="map-wrap">
              <MapContainer center={[-29.0, 25.0]} zoom={5} scrollWheelZoom className="map">
                <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapViewport origin={origin} destination={destination} />
                {route?.coordinates?.length ? <Polyline positions={route.coordinates} pathOptions={{ weight: 5 }} /> : null}
              </MapContainer>
              {!route && <div className="map-empty"><MapPin size={20} /><span>Durban → Johannesburg is loaded as the demo trip.</span></div>}
            </div>
          </div>

          <aside className="summary-card card">
            <div className="summary-top"><div><p className="eyebrow">TRIP SUMMARY</p><h2>{result ? money(result.fuelCost) : '—'}</h2></div><div className="price-dot">R/L</div></div>
            <div className="summary-grid">
              <div><span>Distance</span><strong>{route ? `${Math.round(route.distanceKm)} km` : '—'}</strong></div>
              <div><span>Duration</span><strong>{route ? durationLabel(route.durationMinutes) : '—'}</strong></div>
              <div><span>Fuel used</span><strong>{result ? `${result.fuelRequired.toFixed(1)} L` : '—'}</strong></div>
              <div><span>Adjusted efficiency</span><strong>{result ? `${result.adjustedConsumption.toFixed(1)} L/100km` : '—'}</strong></div>
              <div><span>Cost / km</span><strong>{result ? `R${result.costPerKm.toFixed(2)}` : '—'}</strong></div>
              <div><span>Fuel price</span><strong>{pricePerLitre ? `R${pricePerLitre.toFixed(2)}` : '—'}</strong></div>
            </div>
            <div className="summary-note">Speed adjustment is a transparent planning heuristic, not a certified vehicle-efficiency test.</div>
            {prices && <div className="source-note">Price data: {prices.source} · {prices.month}</div>}
          </aside>
        </section>

        <section className="next-grid">
          <div className="card mini-card"><span className="mini-icon"><Fuel size={17} /></span><div><strong>Fuel price history</strong><p>Store monthly prices in Supabase so we can chart changes over time.</p></div></div>
          <div className="card mini-card"><span className="mini-icon"><Route size={17} /></span><div><strong>Smart routing</strong><p>Compare routes by distance, duration and estimated fuel spend.</p></div></div>
          <div className="card mini-card"><span className="mini-icon"><Sparkles size={17} /></span><div><strong>Optional AI</strong><p>Add trip recommendations later without making AI a dependency.</p></div></div>
        </section>
      </main>
      <footer>SA Fuel Calculator · Open data, free-tier services, South African focus</footer>
    </div>
  )
}
