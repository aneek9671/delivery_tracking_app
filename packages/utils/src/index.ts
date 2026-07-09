import type { Location } from '@delivery-tracker/types';

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(loc1: Location, loc2: Location): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);
  const lat1 = toRad(loc1.latitude);
  const lat2 = toRad(loc2.latitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
}

function toRad(value: number) {
  return value * Math.PI / 180;
}

/**
 * Calculates ETA based on average speed.
 * The architecture is designed to easily swap this out with Google Maps / Mapbox
 * Directions API later without changing the function signature for callers.
 * 
 * @param distanceKm The remaining distance in kilometers
 * @param averageSpeedKmph Average speed of the rider in km/h (default: 25)
 * @returns ETA in minutes
 */
export function calculateEtaMinutes(distanceKm: number, averageSpeedKmph: number = 25): number {
  if (distanceKm <= 0) return 0;
  const hours = distanceKm / averageSpeedKmph;
  return Math.ceil(hours * 60);
}
