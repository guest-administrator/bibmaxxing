/* =========================================================================
   SM-2 spaced repetition — pure functions, no DOM, no IO.
   Tested in tests/srs.test.html.
   ========================================================================= */

export const DAY_MS = 24 * 60 * 60 * 1000;

export const RATE = Object.freeze({
  AGAIN: 0,
  HARD:  3,
  GOOD:  4,
  EASY:  5,
});

const EASE_MIN = 1.3;
const INTERVAL_MAX_DAYS = 365;

export function initCard() {
  return {
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    lastReviewed: null,
    nextDue: null,
  };
}

export function review(card, rating, now = Date.now()) {
  const q = rating | 0;
  let { ease, interval, repetitions } = card;

  if (q >= 3) {
    const next = repetitions + 1;
    if (next === 1)      interval = 1;
    else if (next === 2) interval = 6;
    else                 interval = Math.round(interval * ease);
    repetitions = next;
  } else {
    repetitions = 0;
    interval = 1;
  }

  if (interval > INTERVAL_MAX_DAYS) interval = INTERVAL_MAX_DAYS;

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < EASE_MIN) ease = EASE_MIN;

  return {
    ease,
    interval,
    repetitions,
    lastReviewed: now,
    nextDue: now + interval * DAY_MS,
  };
}

export function daysUntil(card, now = Date.now()) {
  if (card.nextDue == null) return 0;
  return Math.round((card.nextDue - now) / DAY_MS);
}

export function isDue(card, now = Date.now()) {
  if (card.nextDue == null) return true;
  return card.nextDue <= now;
}

export function previewIntervals(card) {
  const labels = { 0: "<1d", 3: null, 4: null, 5: null };
  for (const r of [RATE.HARD, RATE.GOOD, RATE.EASY]) {
    const next = review(card, r, 0);
    labels[r] = next.interval === 1 ? "1d" : `${next.interval}d`;
  }
  labels[RATE.AGAIN] = "<1d";
  return labels;
}
