/**
 * Reroute & Rapid Location Update Validation Script
 * 
 * This script simulates a rider who:
 *   1. Starts a trip
 *   2. Moves along a route (straight line)
 *   3. REROUTES — suddenly changes direction (simulating a wrong turn / detour)
 *   4. Sends rapid-fire updates (testing rate limiter behavior)
 * 
 * It connects a "rider" socket and a "customer" socket, and verifies:
 *   - Customer receives all non-rate-limited location updates
 *   - Location data is never corrupted during rapid direction changes
 *   - Rate limiter correctly drops excess updates without breaking the stream
 *   - Order state remains consistent after rerouting
 * 
 * Run: npx ts-node-dev src/test-reroute.ts
 * (Requires the backend to be running on port 3001)
 */

import { io as ioClient, Socket } from 'socket.io-client';
import { Location } from '@delivery-tracker/types';

const SERVER_URL = 'http://localhost:3001';
const ORDER_ID = 'test-reroute-001';
const RIDER_NAME = 'TestRider';

// Simulated route: Bangalore coordinates
// Phase 1: Rider goes north (normal route)
// Phase 2: Rider suddenly turns east (reroute!)
// Phase 3: Rapid-fire burst (tests rate limiter)

const ROUTE_PHASES: { label: string; points: [number, number][]; delayMs: number }[] = [
  {
    label: 'Phase 1 — Normal route (northbound)',
    points: [
      [12.9716, 77.5946],  // Start: Bangalore center
      [12.9730, 77.5946],
      [12.9745, 77.5946],
      [12.9760, 77.5946],
    ],
    delayMs: 2000, // 2s between updates (normal)
  },
  {
    label: 'Phase 2 — REROUTE (sudden eastbound turn)',
    points: [
      [12.9760, 77.5960],  // Rider turns east
      [12.9760, 77.5975],
      [12.9760, 77.5990],
    ],
    delayMs: 2000,
  },
  {
    label: 'Phase 3 — Rapid-fire burst (50ms intervals — tests rate limiter)',
    points: [
      [12.9760, 77.6005],
      [12.9760, 77.6010],
      [12.9760, 77.6015],
      [12.9760, 77.6020],
      [12.9760, 77.6025],
      [12.9760, 77.6030],
      [12.9760, 77.6035],
      [12.9760, 77.6040],
      [12.9760, 77.6045],
      [12.9760, 77.6050],
    ],
    delayMs: 50, // WAY too fast — should get rate-limited
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Reroute & Rapid Update Validation ===\n');

  // --- Step 1: Start the trip via REST ---
  console.log('[1] Starting trip via POST /trip/start...');
  const startRes = await fetch(`${SERVER_URL}/trip/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: ORDER_ID, riderName: RIDER_NAME }),
  });
  const startData = await startRes.json();
  console.log(`    Response: ${startRes.status} — order status: ${startData.order?.status}\n`);

  if (!startRes.ok) {
    console.error('    FAIL: Could not start trip. Is the backend running?');
    process.exit(1);
  }

  // --- Step 2: Connect sockets ---
  console.log('[2] Connecting rider & customer sockets...');

  const riderSocket = ioClient(SERVER_URL);
  const customerSocket = ioClient(SERVER_URL);

  await Promise.all([
    new Promise<void>(resolve => riderSocket.on('connect', resolve)),
    new Promise<void>(resolve => customerSocket.on('connect', resolve)),
  ]);

  console.log(`    Rider socket:    ${riderSocket.id}`);
  console.log(`    Customer socket: ${customerSocket.id}\n`);

  // Customer joins the order room
  customerSocket.emit('join-order', ORDER_ID);
  await sleep(100); // Let the join propagate

  // --- Step 3: Track what the customer receives ---
  const receivedLocations: Location[] = [];
  let errorMessages: string[] = [];

  customerSocket.on('location-updated', (loc: Location) => {
    receivedLocations.push(loc);
  });

  customerSocket.on('error', (msg: string) => {
    errorMessages.push(msg);
  });

  // --- Step 4: Run through route phases ---
  let totalSent = 0;

  for (const phase of ROUTE_PHASES) {
    console.log(`[→] ${phase.label}`);
    console.log(`    Sending ${phase.points.length} updates at ${phase.delayMs}ms intervals...`);

    for (const [lat, lng] of phase.points) {
      const location: Location = {
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        timestamp: Date.now(),
      };
      riderSocket.emit('location-update', ORDER_ID, location);
      totalSent++;
      await sleep(phase.delayMs);
    }

    console.log(`    Sent. Customer has received ${receivedLocations.length} updates so far.\n`);
  }

  // Give a moment for any remaining broadcasts to arrive
  await sleep(500);

  // --- Step 5: Validate results ---
  console.log('=== RESULTS ===\n');

  console.log(`Total updates SENT by rider:       ${totalSent}`);
  console.log(`Total updates RECEIVED by customer: ${receivedLocations.length}`);
  console.log(`Updates dropped (rate-limited):     ${totalSent - receivedLocations.length}`);
  console.log(`Error messages received:            ${errorMessages.length}`);

  // Validation checks
  const checks: { name: string; pass: boolean; detail: string }[] = [];

  // Check 1: Customer received the normal-speed updates (phases 1 & 2)
  const normalPhaseCount = ROUTE_PHASES[0].points.length + ROUTE_PHASES[1].points.length;
  checks.push({
    name: 'Normal-speed updates delivered',
    pass: receivedLocations.length >= normalPhaseCount,
    detail: `Expected at least ${normalPhaseCount}, got ${receivedLocations.length}`,
  });

  // Check 2: Rate limiter dropped SOME of the rapid-fire burst (phase 3)
  const rapidPhaseCount = ROUTE_PHASES[2].points.length;
  const droppedCount = totalSent - receivedLocations.length;
  checks.push({
    name: 'Rate limiter dropped rapid-fire excess',
    pass: droppedCount > 0,
    detail: `${droppedCount} of ${rapidPhaseCount} rapid updates were dropped`,
  });

  // Check 3: No data corruption — all received locations have valid lat/lng
  const allValid = receivedLocations.every(
    loc => loc.latitude >= -90 && loc.latitude <= 90 &&
           loc.longitude >= -180 && loc.longitude <= 180 &&
           typeof loc.accuracy === 'number' &&
           typeof loc.timestamp === 'number'
  );
  checks.push({
    name: 'No data corruption in received locations',
    pass: allValid,
    detail: allValid ? 'All locations have valid fields' : 'CORRUPTED DATA FOUND',
  });

  // Check 4: Reroute is seamless — the direction change (Phase 1→2) didn't cause errors
  checks.push({
    name: 'No errors during reroute',
    pass: errorMessages.length === 0,
    detail: errorMessages.length === 0 ? 'Zero errors' : `Errors: ${errorMessages.join(', ')}`,
  });

  // Check 5: Location ordering — timestamps are monotonically increasing
  let isOrdered = true;
  for (let i = 1; i < receivedLocations.length; i++) {
    if (receivedLocations[i].timestamp < receivedLocations[i - 1].timestamp) {
      isOrdered = false;
      break;
    }
  }
  checks.push({
    name: 'Locations received in chronological order',
    pass: isOrdered,
    detail: isOrdered ? 'Timestamps are monotonically increasing' : 'OUT OF ORDER detected',
  });

  // Check 6: Verify order state via REST
  const orderRes = await fetch(`${SERVER_URL}/trip/${ORDER_ID}`);
  const orderData = await orderRes.json();
  const lastReceivedLoc = receivedLocations[receivedLocations.length - 1];
  checks.push({
    name: 'Order state is consistent',
    pass: orderData.order?.status === 'WAITING',
    detail: `Status: ${orderData.order?.status}`,
  });

  // Print results
  console.log('\n--- Checks ---');
  let allPassed = true;
  for (const check of checks) {
    const icon = check.pass ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    console.log(`   ${check.detail}`);
    if (!check.pass) allPassed = false;
  }

  console.log(`\n${allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}\n`);

  // Cleanup
  riderSocket.disconnect();
  customerSocket.disconnect();
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
