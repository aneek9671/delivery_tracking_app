import { z } from 'zod';
export declare const LocationSchema: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    accuracy: z.ZodNumber;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
}, {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
}>;
export declare const OrderIdSchema: z.ZodString;
export declare const RiderNameSchema: z.ZodString;
//# sourceMappingURL=validation.d.ts.map