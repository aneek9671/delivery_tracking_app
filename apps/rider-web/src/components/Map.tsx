import { useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { Location } from '@delivery-tracker/types';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Default to Bangalore center if no location yet
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

/**
 * Inner component that handles smooth panning when the rider moves.
 * 
 * Why a separate component?
 * `useMap()` can only be called inside a child of <GoogleMap>. We need
 * a separate component to access the map instance and call panTo().
 */
function MapPanner({ riderLocation }: { riderLocation: Location }) {
  const map = useMap();
  const prevLocationRef = useRef<Location | null>(null);

  useEffect(() => {
    if (!map) return;

    const newPos = { lat: riderLocation.latitude, lng: riderLocation.longitude };

    // Only pan if the position has actually changed (avoid redundant animations)
    const prev = prevLocationRef.current;
    if (
      prev &&
      prev.latitude === riderLocation.latitude &&
      prev.longitude === riderLocation.longitude
    ) {
      return;
    }

    // panTo provides a smooth animation by default — no teleporting
    map.panTo(newPos);
    prevLocationRef.current = riderLocation;
  }, [riderLocation, map]);

  return null;
}

/**
 * Inner component that fetches and renders directions between rider and customer.
 */
function DirectionsRenderer({ riderLocation, customerLocation }: { riderLocation: Location; customerLocation: Location }) {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

  // Initialize service and renderer
  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(
      new routesLibrary.DirectionsRenderer({
        map,
        suppressMarkers: true, // We draw our own custom markers
        polylineOptions: {
          strokeColor: '#3b82f6', // Tailwind blue-500
          strokeOpacity: 0.8,
          strokeWeight: 5,
        },
      })
    );
  }, [routesLibrary, map]);

  // Request directions
  useEffect(() => {
    if (!directionsService || !directionsRenderer || !riderLocation || !customerLocation) return;

    directionsService.route(
      {
        origin: { lat: riderLocation.latitude, lng: riderLocation.longitude },
        destination: { lat: customerLocation.latitude, lng: customerLocation.longitude },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status === google.maps.DirectionsStatus.OK && response) {
          directionsRenderer.setDirections(response);
        } else {
          console.error('Directions request failed due to ' + status);
        }
      }
    );
    // Note: We only recalculate route if customerLocation changes, or initially. 
    // We intentionally don't put riderLocation here to prevent API spam while driving.
    // If you want live rerouting, you'd throttle this call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directionsService, directionsRenderer, customerLocation]);

  return null;
}

interface MapProps {
  riderLocation?: Location;
  customerLocation?: Location;
}

export default function Map({ riderLocation, customerLocation }: MapProps) {
  const center = riderLocation
    ? { lat: riderLocation.latitude, lng: riderLocation.longitude }
    : DEFAULT_CENTER;

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-dark-700 flex flex-col items-center justify-center bg-dark-800 text-dark-400">
        <p className="text-lg font-semibold mb-2">Google Maps API Key Missing</p>
        <p className="text-sm text-center max-w-sm">
          Set <code className="bg-dark-700 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in your{' '}
          <code className="bg-dark-700 px-1 rounded">.env</code> file to enable the map.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-dark-700 z-0 relative">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          defaultCenter={center}
          defaultZoom={15}
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%', minHeight: '400px' }}
        >
          {/* Rider marker — uses AdvancedMarker for smooth animation */}
          {riderLocation && (
            <>
              <AdvancedMarker
                position={{
                  lat: riderLocation.latitude,
                  lng: riderLocation.longitude,
                }}
                title="Rider"
              >
                {/* Custom rider icon: a pulsing green dot */}
                <div className="relative">
                  <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg" />
                  <div className="absolute inset-0 w-5 h-5 bg-green-500 rounded-full animate-ping opacity-50" />
                </div>
              </AdvancedMarker>
              <MapPanner riderLocation={riderLocation} />
            </>
          )}

          {/* Customer marker */}
          {customerLocation && (
            <AdvancedMarker
              position={{
                lat: customerLocation.latitude,
                lng: customerLocation.longitude,
              }}
              title="Delivery Location"
            >
              <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
            </AdvancedMarker>
          )}

          {/* Render Route if both locations exist */}
          {riderLocation && customerLocation && (
            <DirectionsRenderer riderLocation={riderLocation} customerLocation={customerLocation} />
          )}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
