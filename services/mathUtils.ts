import { Coordinates } from '../types';

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function toDeg(value: number): number {
  return (value * 180) / Math.PI;
}

// Haversine formula for distance in meters
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = toRad(coord1.latitude);
  const φ2 = toRad(coord2.latitude);
  const Δφ = toRad(coord2.latitude - coord1.latitude);
  const Δλ = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Calculate bearing from point A to B in degrees (0-360)
export const calculateBearing = (start: Coordinates, end: Coordinates): number => {
  const startLat = toRad(start.latitude);
  const startLng = toRad(start.longitude);
  const endLat = toRad(end.latitude);
  const endLng = toRad(end.longitude);

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
};

// Helper to format speed from m/s to km/h or min/km
export const formatSpeed = (speedMs: number | null, mode: 'CYCLING' | 'RUNNING'): string => {
  if (speedMs === null || speedMs < 0) return '0.0';
  if (mode === 'CYCLING') {
    return (speedMs * 3.6).toFixed(1); // km/h
  } else {
    // Pace for running (min/km)
    if (speedMs === 0) return '0:00';
    const minPerKm = 16.6667 / speedMs;
    const minutes = Math.floor(minPerKm);
    const seconds = Math.round((minPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
};