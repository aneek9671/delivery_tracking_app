import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';

export default function Dashboard() {
  const [orderId, setOrderId] = useState('');
  const navigate = useNavigate();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderId.trim()) {
      navigate(`/track/${orderId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-dark-800 rounded-2xl shadow-xl p-8 border border-dark-700">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-500/10 p-4 rounded-full mb-4">
            <PackageSearch className="w-10 h-10 text-brand-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Track Your Delivery</h1>
          <p className="text-dark-400 text-center text-sm">
            Enter your order ID below to see live updates and track your rider in real-time.
          </p>
        </div>

        <form onSubmit={handleTrack} className="flex flex-col gap-4">
          <div>
            <label htmlFor="orderId" className="sr-only">Order ID</label>
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
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl px-4 py-3 transition-colors shadow-lg shadow-brand-500/20"
          >
            Track Order
          </button>
        </form>
      </div>
    </div>
  );
}
