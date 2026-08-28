export type FuelType = 'petrol95' | 'petrol93' | 'diesel'

export type CalculationInput = {
  distanceKm: number
  consumptionLPer100Km: number
  speedKmh: number
  pricePerLitre: number
}

export type TripResult = {
  adjustedConsumption: number
  fuelRequired: number
  fuelCost: number
  costPerKm: number
}

/**
 * Planning heuristic inspired by the idea that speed affects fuel use.
 * It is deliberately transparent, not a laboratory-grade efficiency model.
 */
export function speedFactor(speedKmh: number): number {
  const speed = Math.max(40, Math.min(150, speedKmh))
  if (speed <= 100) return 1 + (100 - speed) * 0.002
  return 1 + (speed - 100) * 0.006
}

export function calculateTrip(input: CalculationInput): TripResult {
  const adjustedConsumption = input.consumptionLPer100Km * speedFactor(input.speedKmh)
  const fuelRequired = (input.distanceKm / 100) * adjustedConsumption
  const fuelCost = fuelRequired * input.pricePerLitre
  const costPerKm = input.distanceKm > 0 ? fuelCost / input.distanceKm : 0

  return {
    adjustedConsumption,
    fuelRequired,
    fuelCost,
    costPerKm,
  }
}
