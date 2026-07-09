import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Navigation, PackageCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, Location, OrderStatus } from '@delivery-tracker/types';

export default function ActiveTrip() {
  const { orderId } = useParams<{ orderId: string }>();
  const [status, setStatus] = useState<OrderStatus>('WAITING');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentLoc, setCurrentLoc] = useState<Location | null>(null);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  // Use a ref for status so the geolocation callback always reads the latest
  // value without needing status in the useEffect dependency array.
  const statusRef = useRef<OrderStatus>(status);
  statusRef.current = status;

  useEffect(() => {
    if (!orderId) return;

    // 1. Connect Socket — only once per orderId
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    );
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('status-updated', (s) => setStatus(s));

    // 2. Start Geolocation Tracking — only once per orderId
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
    } else {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const loc: Location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          setCurrentLoc(loc);
          setLocationError(null);

          // Read status from ref (not stale closure) to decide whether to emit
          if (socket.connected && statusRef.current !== 'DELIVERED') {
            socket.emit('location-update', orderId, loc);
          }
        },
        (err) => setLocationError(err.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]); // Only reconnect if orderId changes — NOT on status change

  const updateStatus = useCallback(async (newStatus: OrderStatus) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/trip/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: newStatus }),
        }
      );
      if (res.ok) {
        setStatus(newStatus);
        // Also emit via socket so customers get the update instantly
        if (socketRef.current?.connected) {
          if (newStatus === 'PICKED_UP') socketRef.current.emit('trip-picked', orderId!);
          if (newStatus === 'DELIVERED') socketRef.current.emit('trip-complete', orderId!);
        }
      }
    } catch (err) {
      console.error('[ActiveTrip] Failed to update status:', err);
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <header className="bg-dark-800 border-b border-dark-700 p-4 sticky top-0">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-dark-700 rounded-lg text-dark-300">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-white">Active Trip: {orderId}</h1>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-500' : 'bg-red-500'}`}></span>
              <span className="text-dark-400">{connected ? 'Connected' : 'Reconnecting...'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col gap-4">

        {locationError && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex gap-3 text-red-500">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{locationError}</p>
          </div>
        )}

        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-full ${currentLoc ? 'bg-brand-500/20 text-brand-500' : 'bg-dark-700 text-dark-400'}`}>
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-dark-400">GPS Status</p>
              <p className="font-bold text-white">
                {currentLoc ? 'Streaming Live' : 'Waiting for GPS...'}
              </p>
            </div>
          </div>

          {currentLoc && (
            <div className="grid grid-cols-2 gap-4 bg-dark-900 rounded-xl p-4 border border-dark-700">
              <div>
                <p className="text-xs text-dark-400 mb-1">Coordinates</p>
                <p className="text-sm text-white font-mono">
                  {currentLoc.latitude.toFixed(4)}, {currentLoc.longitude.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-xs text-dark-400 mb-1">Accuracy</p>
                <p className="text-sm text-white font-mono">
                  ±{Math.round(currentLoc.accuracy)}m
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {status === 'WAITING' && (
            <button
              onClick={() => updateStatus('PICKED_UP')}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-500/20"
            >
              <PackageCheck className="w-5 h-5" />
              Parcel Picked Up
            </button>
          )}

          {status === 'PICKED_UP' && (
            <button
              onClick={() => updateStatus('OUT_FOR_DELIVERY')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              <Navigation className="w-5 h-5" />
              Start Driving (Out for Delivery)
            </button>
          )}

          {status === 'OUT_FOR_DELIVERY' && (
            <button
              onClick={() => updateStatus('DELIVERED')}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"
            >
              <CheckCircle2 className="w-5 h-5" />
              Complete Delivery
            </button>
          )}

          {status === 'DELIVERED' && (
            <div className="bg-green-500/20 text-green-500 border border-green-500/50 p-4 rounded-xl text-center font-bold">
              Delivery Completed! 🎉
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
