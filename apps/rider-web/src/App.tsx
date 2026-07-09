import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StartTrip from './pages/StartTrip';
import ActiveTrip from './pages/ActiveTrip';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartTrip />} />
        <Route path="/trip/:orderId" element={<ActiveTrip />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
