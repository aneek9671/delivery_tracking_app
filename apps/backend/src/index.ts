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

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '10kb' }));

// -----------------------------------------------------------
// Routes
// -----------------------------------------------------------

app.use('/trip', tripRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// -----------------------------------------------------------
// Start
// -----------------------------------------------------------

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`[Server] Backend is running on http://localhost:${PORT}`);
});

export { io };
