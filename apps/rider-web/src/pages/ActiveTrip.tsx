import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Navigation, PackageCheck, CheckCircle2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, Location, OrderStatus } from '@delivery-tracker/types';

export default function ActiveTrip() {
  const { orderId } = useParams<{ orderId: string }>();
  const [status, setStatus] = useState<OrderStatus>('WAITING');
  const [connected, setConnected] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | null>(null);

  // Use a ref to access the latest status inside the geolocation callback
  // without re-running the useEffect and reconnecting the socket/GPS watcher
  const statusRef = useRef<OrderStatus>(status);
  statusRef.current = status;

  useEffect(() => {
    if (!orderId) return;

    // 1. Fetch current status
    fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/trip/${orderId}`)
      .then(res => res.json())
      .then(data => {
        if (data.order) setStatus(data.order.status);
      })
      .catch(console.error);

    // 2. Setup Socket.IO
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    );

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('status-updated', (newStatus) => {
      setStatus(newStatus);
    });

    // 3. Setup GPS Watcher
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLoc: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        setLocation(newLoc);
        setLocationError(null);

        // Only stream location if connected and not delivered
        if (socket.connected && statusRef.current !== 'DELIVERED') {
          socket.emit('location-update', orderId, newLoc);
        }
      },
      (error) => {
        console.error('GPS Error:', error);
        setLocationError(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.disconnect();
    };
  }, [orderId]); // Empty dependency array: only run once on mount

  const updateStatus = async (newStatus: OrderStatus) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/trip/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        
        // Also emit via socket for real-time updates to customer
        const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');
        if (newStatus === 'PICKED_UP') socket.emit('trip-picked', orderId!);
        if (newStatus === 'DELIVERED') socket.emit('trip-complete', orderId!);
        setTimeout(() => socket.disconnect(), 1000);
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <header className="bg-dark-800 border-b border-dark-700 p-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-dark-700 rounded-lg transition-colors text-dark-300 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-white leading-tight">Active Trip: {orderId}</h1>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-500' : 'bg-red-500'}`}></span>
              <span className="text-dark-400">{connected ? 'Connected' : 'Reconnecting...'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col gap-4">
        {/* Status Card */}
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${status === 'DELIVERED' ? 'bg-green-500/10 text-green-500' : 'bg-brand-500/10 text-brand-500'}`}>
              {status === 'DELIVERED' ? <CheckCircle2 className="w-6 h-6" /> : <Navigation className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <p className="text-sm text-dark-400 mb-1">GPS Status</p>
              <h2 className="text-xl font-bold text-white">
                {status === 'DELIVERED' ? 'Trip Completed' : locationError ? 'GPS Lost' : 'Streaming Live'}
              </h2>
              {locationError && <p className="text-red-400 text-sm mt-2">{locationError}</p>}
            </div>
          </div>

          {location && status !== 'DELIVERED' && (
            <div className="mt-6 p-4 bg-dark-900 rounded-xl border border-dark-700 flex justify-between items-center">
              <div>
                <p className="text-xs text-dark-400 mb-1">Coordinates</p>
                <p className="text-sm font-mono text-white">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-dark-400 mb-1">Accuracy</p>
                <p className="text-sm font-mono text-white">±{Math.round(location.accuracy)}m</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Action Footer */}
      {status !== 'DELIVERED' && (
        <footer className="bg-dark-800 border-t border-dark-700 p-4 sticky bottom-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="max-w-md mx-auto">
            {status === 'WAITING' && (
              <button
                onClick={() => updateStatus('PICKED_UP')}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl px-4 py-4 transition-colors flex items-center justify-center gap-2"
              >
                <PackageCheck className="w-5 h-5" />
                Parcel Picked Up
              </button>
            )}
            
            {status === 'PICKED_UP' && (
              <button
                onClick={() => updateStatus('OUT_FOR_DELIVERY')}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl px-4 py-4 transition-colors flex items-center justify-center gap-2"
              >
                <Navigation className="w-5 h-5" />
                Start Route
              </button>
            )}

            {status === 'OUT_FOR_DELIVERY' && (
              <button
                onClick={() => updateStatus('DELIVERED')}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl px-4 py-4 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                <CheckCircle2 className="w-5 h-5" />
                Complete Delivery
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
