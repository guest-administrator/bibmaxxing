#!/usr/bin/env node
// Node port of tests/srs.test.html. Pure-function SM-2 SRS coverage.
// Imports the live module so any regression in js/srs.js is caught here.

import { initCard, review, RATE, daysUntil, DAY_MS } from "../js/srs.js";

let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log(`  FAIL  ${name}  --  ${err.message || err}`);
  }
}

function assert(cond, msg)            { if (!cond) throw new Error(msg || "assertion failed"); }
function assertEqual(a, b, msg)       { if (a !== b) throw new Error(`${msg || "expected equal"}  --  actual=${JSON.stringify(a)} expected=${JSON.stringify(b)}`); }
function assertClose(a, b, eps, msg)  { if (Math.abs(a - b) > eps) throw new Error(`${msg || "expected close"}  --  actual=${a} expected=${b} +/-${eps}`); }

console.log("SRS (SM-2) unit tests");
console.log("======================");

// --- Init ---
test("initCard: fresh card has SM-2 defaults", () => {
  const c = initCard();
  assertEqual(c.ease, 2.5);
  assertEqual(c.interval, 0);
  assertEqual(c.repetitions, 0);
  assertEqual(c.lastReviewed, null);
  assertEqual(c.nextDue, null);
});

// --- First review ---
test("first Good review: interval=1, reps=1, ease unchanged", () => {
  const now = 1_000_000_000_000;
  const c = review(initCard(), RATE.GOOD, now);
  assertEqual(c.repetitions, 1);
  assertEqual(c.interval, 1);
  assertClose(c.ease, 2.5, 0.001);
  assertEqual(c.lastReviewed, now);
  assertEqual(c.nextDue, now + 1 * DAY_MS);
});

test("first Easy review: reps=1, interval=1, ease increases", () => {
  const c = review(initCard(), RATE.EASY, 1_000_000_000_000);
  assertEqual(c.repetitions, 1);
  assertEqual(c.interval, 1);
  assert(c.ease > 2.5);
  assertClose(c.ease, 2.6, 0.001);
});

test("first Hard review: reps=1, interval=1, ease decreases", () => {
  const c = review(initCard(), RATE.HARD, 1_000_000_000_000);
  assertEqual(c.repetitions, 1);
  assertEqual(c.interval, 1);
  assert(c.ease < 2.5);
  assertClose(c.ease, 2.36, 0.001);
});

// --- Second review ---
test("second Good review: interval=6, reps=2", () => {
  const now = 1_000_000_000_000;
  let c = review(initCard(), RATE.GOOD, now);
  c = review(c, RATE.GOOD, now + DAY_MS);
  assertEqual(c.repetitions, 2);
  assertEqual(c.interval, 6);
  assertEqual(c.nextDue, now + DAY_MS + 6 * DAY_MS);
});

// --- Third review uses ease ---
test("third Good review: interval = round(prev * ease)", () => {
  const now = 1_000_000_000_000;
  let c = review(initCard(), RATE.GOOD, now);
  c = review(c, RATE.GOOD, now + DAY_MS);
  const preEase = c.ease;
  c = review(c, RATE.GOOD, now + 7 * DAY_MS);
  assertEqual(c.repetitions, 3);
  assertEqual(c.interval, Math.round(6 * preEase));
});

// --- Again resets ---
test("Again at rep=3 resets reps to 0, interval to 1, ease drops", () => {
  const now = 1_000_000_000_000;
  let c = review(initCard(), RATE.GOOD, now);
  c = review(c, RATE.GOOD, now + DAY_MS);
  c = review(c, RATE.GOOD, now + 7 * DAY_MS);
  const preEase = c.ease;
  c = review(c, RATE.AGAIN, now + 30 * DAY_MS);
  assertEqual(c.repetitions, 0);
  assertEqual(c.interval, 1);
  assert(c.ease < preEase);
});

test("Again after mature card still schedules tomorrow", () => {
  const now = 1_000_000_000_000;
  let c = review(initCard(), RATE.GOOD, now);
  c = review(c, RATE.GOOD, now + DAY_MS);
  c = review(c, RATE.GOOD, now + 7 * DAY_MS);
  c = review(c, RATE.GOOD, now + 30 * DAY_MS);
  c = review(c, RATE.AGAIN, now + 60 * DAY_MS);
  assertEqual(c.nextDue, now + 60 * DAY_MS + 1 * DAY_MS);
  assertEqual(c.lastReviewed, now + 60 * DAY_MS);
});

// --- Ease clamp ---
test("ease clamps at 1.3 after many Again ratings", () => {
  const now = 1_000_000_000_000;
  let c = initCard();
  for (let i = 0; i < 20; i++) c = review(c, RATE.AGAIN, now + i * DAY_MS);
  assert(c.ease >= 1.3);
  assertEqual(c.ease, 1.3);
});

// --- Interval ceiling ---
test("interval ceiling: never exceeds 365 days", () => {
  const now = 1_000_000_000_000;
  let c = initCard();
  for (let i = 0; i < 50; i++) c = review(c, RATE.EASY, now + i * DAY_MS);
  assert(c.interval <= 365);
});

// --- daysUntil ---
test("daysUntil: due-today returns 0", () => {
  const now = 1_000_000_000_000;
  assertEqual(daysUntil({ nextDue: now }, now), 0);
});
test("daysUntil: 3 days future returns 3", () => {
  const now = 1_000_000_000_000;
  assertEqual(daysUntil({ nextDue: now + 3 * DAY_MS }, now), 3);
});
test("daysUntil: overdue card returns negative", () => {
  const now = 1_000_000_000_000;
  assertEqual(daysUntil({ nextDue: now - 2 * DAY_MS }, now), -2);
});
test("daysUntil: null card treated as due now", () => {
  assertEqual(daysUntil({ nextDue: null }, 1_000_000_000_000), 0);
});

// --- Purity ---
test("review() is pure: same inputs produce same outputs", () => {
  const c1 = review(initCard(), RATE.GOOD, 1_000_000_000_000);
  const c2 = review(initCard(), RATE.GOOD, 1_000_000_000_000);
  assertEqual(JSON.stringify(c1), JSON.stringify(c2));
});
test("review() does not mutate input card", () => {
  const a = initCard();
  const before = JSON.stringify(a);
  review(a, RATE.GOOD, 1_000_000_000_000);
  assertEqual(JSON.stringify(a), before);
});

console.log("======================");
console.log(`${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.error(`  - ${f.name}: ${f.err.message}`);
  process.exit(1);
}
process.exit(0);
