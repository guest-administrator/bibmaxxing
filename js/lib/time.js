/* =========================================================================
   Timer utilities for quiz/exam views.
   ========================================================================= */

export function formatMMSS(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

export function formatHMS(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h === 0) return `${m}:${r.toString().padStart(2, "0")}`;
  return `${h}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

/* countdown: calls onTick(remainingSec) every `stepMs`, and onEnd() once
   when remaining <= 0. Returns a stop() function. Resilient to tab sleep —
   each tick re-computes from wall-clock time, not an internal counter. */
export function countdown(endAtMs, onTick, onEnd, stepMs = 250) {
  let stopped = false;
  let ended = false;
  function tick() {
    if (stopped) return;
    const remMs = endAtMs - Date.now();
    const remSec = Math.max(0, Math.round(remMs / 1000));
    try { onTick(remSec); } catch (e) { console.error(e); }
    if (remMs <= 0) {
      if (!ended) { ended = true; try { onEnd(); } catch (e) { console.error(e); } }
      return;
    }
    setTimeout(tick, stepMs);
  }
  tick();
  return () => { stopped = true; };
}

/* relativeTime: human-friendly "in 3 days", "2 hours ago", "just now". */
export function relativeTime(ms, now = Date.now()) {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const s = Math.round(abs / 1000);
  const m = Math.round(s / 60);
  const h = Math.round(m / 60);
  const d = Math.round(h / 24);
  const future = diff >= 0;
  const word = (v, unit) => (future ? `in ${v} ${unit}` : `${v} ${unit} ago`);
  if (s < 30)  return "just now";
  if (s < 60)  return word(s, "sec");
  if (m < 60)  return word(m, "min");
  if (h < 24)  return word(h, h === 1 ? "hour" : "hours");
  if (d < 30)  return word(d, d === 1 ? "day" : "days");
  return new Date(ms).toLocaleDateString();
}
