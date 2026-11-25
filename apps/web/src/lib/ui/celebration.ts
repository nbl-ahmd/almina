// Success feedback shared by the storefront flows: a short synthesized chime, a light haptic, and a confetti burst.
// Everything here is decorative and best effort. Nothing waits on it, nothing fails if a browser lacks the API,
// and reduced motion removes the burst. No audio files ship: the chime is two sine notes from the Web Audio API.

let audio: AudioContext | null = null;

export function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}

/** Call inside the click that starts a purchase, so the later chime is allowed to play (browser autoplay rules). */
export function primeAudio() {
  try {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    audio ??= new Context();
    if (audio.state === 'suspended') void audio.resume();
  } catch { /* No audio on this device. */ }
}

/** A soft rising chime: "order placed" uses three notes, smaller successes two. Quiet (peak gain 0.12) and under 0.8s. */
export function playChime(kind: 'order' | 'small' = 'small') {
  try {
    if (!audio) primeAudio();
    if (!audio || audio.state !== 'running') return;
    const notes = kind === 'order' ? [784, 988, 1319] : [880, 1175]; // G5 B5 E6 / A5 D6
    const start = audio.currentTime + 0.02;
    notes.forEach((frequency, index) => {
      const at = start + index * 0.11;
      const oscillator = audio!.createOscillator(), gain = audio!.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(kind === 'order' ? 0.12 : 0.08, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + (index === notes.length - 1 ? 0.55 : 0.28));
      oscillator.connect(gain).connect(audio!.destination);
      oscillator.start(at); oscillator.stop(at + 0.6);
    });
  } catch { /* Silent is fine. */ }
}

/** Android and some browsers support short vibrations; iOS Safari ignores this. */
export function haptic(pattern: number | number[] = 10) {
  try { navigator.vibrate?.(pattern); } catch { /* Not supported. */ }
}

const confettiColours = ['#DA3729', '#FF5443', '#CFFF00', '#1B7A3E', '#FFB020', '#FFFFFF'];

/** Confetti from an element's centre (or a point). Particles are absolutely positioned spans animated with WAAPI on
 *  transform and opacity only, then removed. `spread` widens the cone; `count` stays small so it is cheap. */
export function burst(origin: Element | { x: number; y: number }, { count = 24, spread = 1, power = 1 } = {}) {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const point = 'getBoundingClientRect' in origin ? (() => { const r = origin.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })() : origin;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.className = 'qc-confetti';
  (document.querySelector('.storefront-shell') ?? document.body).appendChild(layer);
  let pending = count;
  for (let index = 0; index < count; index++) {
    const piece = document.createElement('span');
    const size = 5 + Math.random() * 5;
    piece.style.cssText = `left:${point.x}px;top:${point.y}px;width:${size}px;height:${size * (Math.random() > .5 ? 1 : 2.2)}px;background:${confettiColours[index % confettiColours.length]};border-radius:${Math.random() > .6 ? '50%' : '2px'}`;
    layer.appendChild(piece);
    const angle = (-90 + (Math.random() - .5) * 140 * spread) * Math.PI / 180;
    const distance = (90 + Math.random() * 140) * power;
    const dx = Math.cos(angle) * distance, dy = Math.sin(angle) * distance;
    const fall = 120 + Math.random() * 160;
    const spin = (Math.random() - .5) * 720;
    const animation = piece.animate([
      { transform: 'translate(-50%, -50%) rotate(0deg) scale(.6)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${spin / 2}deg) scale(1)`, opacity: 1, offset: .45 },
      { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + fall}px)) rotate(${spin}deg) scale(.9)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'forwards' });
    animation.onfinish = () => { if (--pending === 0) layer.remove(); };
  }
}

/** A small "bump" on an element (scale up and back), interruptible because it is a WAAPI animation. */
export function bump(element: Element | null, scale = 1.06) {
  if (!element || prefersReducedMotion()) return;
  try { element.animate([{ transform: 'scale(1)' }, { transform: `scale(${scale})` }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.23, 1, .32, 1)' }); } catch { /* Old browser. */ }
}
