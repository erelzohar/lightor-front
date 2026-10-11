/** LT-240 — Vanta's UMD bundles draw with the globals `window.THREE` (every
 *  effect) and `window.p5` (topology, trunk). They used to be classic
 *  parser-blocking <script>s in index.html's head, so every tenant page waited
 *  for ~1 MB of CDN code before its first paint. Now the hero injects them
 *  right before importing its effect.
 *
 *  Pinned versions: Vanta 0.5.24 works with three r134 and p5 1.x. The npm
 *  `three`/`p5` in package.json are much newer (0.18x / 2.x) and are not what
 *  Vanta was built against, so keep these CDN builds.
 *
 *  The globals must exist before the Vanta module is evaluated — each bundle
 *  reads `window.THREE` / `window.p5` once, at import time. */
export const THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
export const P5_SRC = 'https://cdn.jsdelivr.net/npm/p5@1.9.3/lib/p5.min.js';

/** Effects drawn by p5. They still need THREE: Vanta's base class sets up a
 *  three.js scene for every effect. */
const P5_EFFECTS = new Set(['topology', 'trunk']);

export const vantaScriptsFor = (effect: string): string[] =>
  P5_EFFECTS.has(effect) ? [THREE_SRC, P5_SRC] : [THREE_SRC];

const pending = new Map<string, Promise<void>>();

const loadScript = (src: string): Promise<void> => {
  const existing = pending.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Forget the failure so a later hero mount (or a preview re-render) can retry.
      pending.delete(src);
      script.remove();
      reject(new Error(`failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
  pending.set(src, promise);
  return promise;
};

export const loadVantaDeps = (effect: string): Promise<void> =>
  Promise.all(vantaScriptsFor(effect).map(loadScript)).then(() => undefined);
