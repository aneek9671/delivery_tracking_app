"use strict";
/**
 * Rate limiter for Socket.IO events.
 *
 * Why this exists:
 * A rider's browser Geolocation API can fire watchPosition callbacks many times
 * per second (especially on Android). Without server-side throttling, a single
 * client can flood the server with location-update events, wasting CPU on
 * repository writes and broadcasting stale data to customers.
 *
 * This is a per-socket, per-event sliding-window rate limiter. It tracks the
 * last N timestamps and rejects events that exceed the configured rate.
 *
 * Performance note: We use a simple array-based window rather than a token
 * bucket because the expected cardinality is tiny (one entry per event per
 * socket) and the window sizes are small (< 20 entries).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusRateLimiter = exports.locationRateLimiter = exports.SocketRateLimiter = void 0;
class SocketRateLimiter {
    config;
    /** Map<socketId:eventName, timestamps[]> */
    windows = new Map();
    constructor(config) {
        this.config = config;
    }
    /**
     * Returns true if the event should be ALLOWED, false if it should be REJECTED.
     */
    allow(socketId, eventName) {
        const key = `${socketId}:${eventName}`;
        const now = Date.now();
        const cutoff = now - this.config.windowMs;
        let timestamps = this.windows.get(key);
        if (!timestamps) {
            timestamps = [];
            this.windows.set(key, timestamps);
        }
        // Evict expired timestamps
        while (timestamps.length > 0 && timestamps[0] < cutoff) {
            timestamps.shift();
        }
        if (timestamps.length >= this.config.maxEvents) {
            return false; // Rate limited
        }
        timestamps.push(now);
        return true;
    }
    /**
     * Clean up all windows for a disconnected socket.
     * Called on socket disconnect to prevent memory leaks.
     */
    cleanup(socketId) {
        // Delete all keys that start with this socketId
        for (const key of this.windows.keys()) {
            if (key.startsWith(`${socketId}:`)) {
                this.windows.delete(key);
            }
        }
    }
}
exports.SocketRateLimiter = SocketRateLimiter;
// Allow max 1 location-update per second per socket (rider sends every 2-5s,
// so this is generous). This prevents malicious flooding without dropping
// legitimate updates.
exports.locationRateLimiter = new SocketRateLimiter({
    maxEvents: 2,
    windowMs: 1000,
});
// Status changes are rare (3 per trip). Allow 5 per 10 seconds to be safe.
exports.statusRateLimiter = new SocketRateLimiter({
    maxEvents: 5,
    windowMs: 10_000,
});
