import type { Location } from '@delivery-tracker/types';
/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @returns Distance in kilometers
 */
export declare function calculateDistanceKm(loc1: Location, loc2: Location): number;
/**
 * Calculates ETA based on average speed.
 * The architecture is designed to easily swap this out with Google Maps / Mapbox
 * Directions API later without changing the function signature for callers.
 *
 * @param distanceKm The remaining distance in kilometers
 * @param averageSpeedKmph Average speed of the rider in km/h (default: 25)
 * @returns ETA in minutes
 */
export declare function calculateEtaMinutes(distanceKm: number, averageSpeedKmph?: number): number;
