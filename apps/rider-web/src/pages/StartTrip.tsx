import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike } from 'lucide-react';

export default function StartTrip() {
  const [riderName, setRiderName] = useState('');
  const [orderId, setOrderId] = useState('');
  const navigate = useNavigate();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderName.trim() || !orderId.trim()) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/trip/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riderName: riderName.trim(),
          orderId: orderId.trim(),
        }),
      });

      if (res.ok) {
        navigate(`/trip/${orderId.trim()}`);
      } else {
        const error = await res.json();
        alert(`Failed to start trip: ${JSON.stringify(error)}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error connecting to backend');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-dark-800 rounded-2xl shadow-xl p-8 border border-dark-700">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-500/10 p-4 rounded-full mb-4">
            <Bike className="w-10 h-10 text-brand-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Rider Portal</h1>
          <p className="text-dark-400 text-center text-sm">
            Start a new delivery trip to begin sharing your live location.
          </p>
        </div>

        <form onSubmit={handleStart} className="flex flex-col gap-4">
          <div>
            <label htmlFor="riderName" className="block text-sm font-medium text-dark-300 mb-1">
              Rider Name
            </label>
            <input
              id="riderName"
              type="text"
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-dark-900 border border-dark-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="orderId" className="block text-sm font-medium text-dark-300 mb-1">
              Order ID
            </label>
            <input
              id="orderId"
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g. ORD-12345"
              className="w-full bg-dark-900 border border-dark-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl px-4 py-3 mt-4 transition-colors shadow-lg shadow-brand-500/20"
          >
            Start Delivery
          </button>
        </form>
      </div>
    </div>
  );
}
