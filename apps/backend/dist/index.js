"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.httpServer = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_1 = require("./socket");
const trip_1 = require("./routes/trip");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
// Setup Socket.IO
const io = (0, socket_1.setupSocket)(httpServer);
exports.io = io;
// -----------------------------------------------------------
// Security Middleware
// -----------------------------------------------------------
// Helmet sets various HTTP security headers:
//  - X-Content-Type-Options: nosniff (prevents MIME-type sniffing)
//  - X-Frame-Options: SAMEORIGIN (prevents clickjacking)
//  - Strict-Transport-Security (enforces HTTPS after first visit)
//  - X-XSS-Protection, etc.
app.use((0, helmet_1.default)());
// CORS — restrict which origins can call our REST API.
// Uses the same origin list as Socket.IO for consistency.
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
}));
// Body parser with size limit — prevents large-payload DoS.
// A location update JSON is ~200 bytes; 10KB is extremely generous.
app.use(express_1.default.json({ limit: '10kb' }));
// -----------------------------------------------------------
// Routes
// -----------------------------------------------------------
app.use('/trip', trip_1.tripRouter);
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
app.use((err, _req, res, _next) => {
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
