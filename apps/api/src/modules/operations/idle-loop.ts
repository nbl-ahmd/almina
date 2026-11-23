/** A timed worker that costs almost nothing while there is no work. After a run that found nothing the next run waits
 *  twice as long, up to `maxMs`; a run that did work resets to `minMs`. Used for workers whose work is not triggered by an
 *  order, so an empty database is not asked "anything to do?" every second all day (each question is outbound traffic). */
export function idleBackoffLoop(run: () => Promise<boolean | void>, options: { minMs: number; maxMs: number; immediate?: boolean }) {
  const { minMs, maxMs, immediate = true } = options;
  let stopped = false, delay = minMs, timer: ReturnType<typeof setTimeout> | undefined, active: Promise<void> | undefined;
  function schedule(ms: number) {
    if (stopped) return;
    timer = setTimeout(() => { active = step().finally(() => { active = undefined; }); }, ms);
    timer.unref?.();
  }
  async function step() {
    let worked = false;
    try { worked = (await run()) === true; } catch { /* The worker reports its own failures. */ }
    delay = worked ? minMs : Math.min(maxMs, delay * 2);
    schedule(delay);
  }
  if (immediate) active = step().finally(() => { active = undefined; }); else schedule(delay);
  return { stop: async () => { stopped = true; clearTimeout(timer); await active; } };
}
