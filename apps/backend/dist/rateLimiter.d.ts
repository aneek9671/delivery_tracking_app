/**
 * Simple token-bucket rate limiter per socket per action.
 * Prevents a single client from flooding the server with events.
 */
export declare class SocketRateLimiter {
    private buckets;
    private maxTokens;
    private refillRateMs;
    constructor(maxTokens?: number, refillRateMs?: number);
    allow(socketId: string, action: string): boolean;
    cleanup(socketId: string): void;
}
export declare const locationRateLimiter: SocketRateLimiter;
export declare const statusRateLimiter: SocketRateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map