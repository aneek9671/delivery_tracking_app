import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { setupSocket } from './socket';
import { tripRouter } from './routes/trip';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Setup Socket.IO
const io = setupSocket(httpServer);

// -----------------------------------------------------------
// Security Middleware
// -----------------------------------------------------------

// Helmet sets various HTTP security headers:
//  - X-Content-Type-Options: nosniff (prevents MIME-type sniffing)
//  - X-Frame-Options: SAMEORIGIN (prevents clickjacking)
//  - Strict-Transport-Security (enforces HTTPS after first visit)
//  - X-XSS-Protection, etc.
app.use(helmet());

// CORS — restrict which origins can call our REST API.
// Uses the same origin list as Socket.IO for consistency.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
}));

// Body parser with size limit — prevents large-payload DoS.
// A location update JSON is ~200 bytes; 10KB is extremely generous.
app.use(express.json({ limit: '10kb' }));

// -----------------------------------------------------------
// Routes
// -----------------------------------------------------------

app.use('/trip', tripRouter);

// Health check — useful for Railway/Render health probes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------
// 404 handler — anything that doesn't match a route
// -----------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// -----------------------------------------------------------
// Global error handler
// -----------------------------------------------------------
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  // Never leak stack traces or internal error details to the client
  res.status(500).json({ error: 'Internal server error' });
});

// -----------------------------------------------------------
// Start
// -----------------------------------------------------------

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`[Server] Backend is running on http://localhost:${PORT}`);
});

// Export for potential testing
export { app, httpServer, io };
