import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Navigation } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, Location, OrderStatus } from '@delivery-tracker/types';
import { calculateDistanceKm, calculateEtaMinutes } from '@delivery-tracker/utils';
import Map from '../components/Map';

export default function TrackOrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [status, setStatus] = useState<OrderStatus>('WAITING');
  const [riderLocation, setRiderLocation] = useState<Location | undefined>();
  const [customerLocation, setCustomerLocation] = useState<Location | undefined>();
  const [connected, setConnected] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!orderId) return;
    fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/trip/${orderId}`)
      .then(res => res.json())
      .then(data => {
        if (data.order) {
          setStatus(data.order.status);
          if (data.order.customerLocation) setCustomerLocation(data.order.customerLocation);
          if (data.order.riderLocation) setRiderLocation(data.order.riderLocation);
        }
      })
      .catch(console.error);
  }, [orderId]);

  useEffect(() => {
    if (riderLocation && customerLocation) {
      const dist = calculateDistanceKm(riderLocation, customerLocation);
      setDistanceKm(dist);
      setEtaMinutes(calculateEtaMinutes(dist));
    }
  }, [riderLocation, customerLocation]);

  useEffect(() => {
    if (!orderId) return;
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    );
    socket.on('connect', () => { setConnected(true); socket.emit('join-order', orderId); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('location-updated', (loc) => setRiderLocation(loc));
    socket.on('status-updated', (newStatus) => setStatus(newStatus));
    return () => { socket.emit('leave-order', orderId); socket.disconnect(); };
  }, [orderId]);

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <header className="bg-dark-800 border-b border-dark-700 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-dark-700 rounded-lg transition-colors text-dark-300 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-white leading-tight">Order #{orderId}</h1>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-500' : 'bg-red-500'}`}></span>
              <span className="text-dark-400">{connected ? 'Live Tracking' : 'Connecting...'}</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col gap-4">
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-dark-400 mb-1">Current Status</p>
              <h2 className="text-2xl font-bold text-brand-500">{status.replace(/_/g, ' ')}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-dark-400 mb-1">Estimated Arrival</p>
              <div className="flex items-center justify-end gap-1 text-white font-semibold">
                <Clock className="w-4 h-4 text-brand-500" />
                <span>{etaMinutes !== null ? `${etaMinutes} min` : '-- min'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-[400px]">
          <Map riderLocation={riderLocation} customerLocation={customerLocation} />
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-500">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Distance Remaining</p>
              <p className="font-semibold text-white">
                {distanceKm !== null ? `${distanceKm.toFixed(1)} km` : 'Calculating...'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-dark-400">Last updated</p>
            <p className="text-sm text-white">
              {riderLocation ? new Date(riderLocation.timestamp).toLocaleTimeString() : 'Waiting for GPS...'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
