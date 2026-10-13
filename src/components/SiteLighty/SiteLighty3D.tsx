import { useEffect, useRef, useState } from 'react';
import {
  AnimationMixer,
  LoopOnce,
  LoopPingPong,
  LoopRepeat,
  Mesh,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from 'three';
import type { AnimationAction, Material } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import modelUrl from '../../assets/lighty-support.glb?url';

/**
 * LT-302: the support Lighty (headset, white shirt — Erel's image, a Meshy
 * model with idle / wave / talk; meshy_output/lightor-mascot/support) at the
 * top of the site's assistant. He waves when the chat opens, idles, and talks
 * while an answer is on its way. Without WebGL, or with reduced motion, the
 * caller keeps the still image.
 * LT-312: he is also the corner button on a Plus site, which can be dragged —
 * picked up, he throws the dashboard Lighty's tantrum in the air (`drag`,
 * retargeted onto this rig by meshy_output/lightor-mascot/scripts/retarget.py,
 * played back and forth as it has no seamless loop point). `waveKey` waves once
 * each time it changes (his hello beside the button).
 */

type Clip = 'idle' | 'wave' | 'talk' | 'drag';
const CLIPS: Clip[] = ['idle', 'wave', 'talk', 'drag'];
// Enough for an 80 px character; half the work of every frame.
const FRAME_MS = 1000 / 30;

interface SiteLighty3DProps {
  talking?: boolean;
  dragging?: boolean;
  /** Wave on load (the chat opening) rather than start idle. */
  greet?: boolean;
  /** Each change after the first plays one wave. */
  waveKey?: number;
  onReady?: () => void;
  className?: string;
}

const FOV = 30;
// The model is 1 tall, feet at 0; the frame keeps the wave's lean in view.
const VIEW_H = 1.22;
const VIEW_W = 1.5;
const LOOK_Y = 0.55;

export default function SiteLighty3D({ talking = false, dragging = false, greet = false, waveKey = 0, onReady, className = '' }: SiteLighty3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const talkingRef = useRef(talking);
  const draggingRef = useRef(dragging);
  const greetRef = useRef(greet);
  const onReadyRef = useRef(onReady);
  const ctlRef = useRef<{ base: () => void; wave: () => void } | null>(null);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !('WebGLRenderingContext' in window)) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    const canvas = renderer.domElement;
    Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' });
    host.appendChild(canvas);

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    pmrem.dispose();

    const camera = new PerspectiveCamera(FOV, 1, 0.1, 20);
    let running = false;
    const fit = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const tan = Math.tan((FOV / 2) * Math.PI / 180);
      const d = Math.max(VIEW_H / (2 * tan), VIEW_W / (2 * tan * camera.aspect));
      camera.position.set(0, LOOK_Y + 0.05, d);
      camera.lookAt(0, LOOK_Y, 0);
      camera.updateProjectionMatrix();
      if (!running) renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    fit();

    let disposed = false;
    let raf = 0;
    let last = 0;
    let mixer: AnimationMixer | null = null;
    const actions: Partial<Record<Clip, AnimationAction>> = {};
    let current: AnimationAction | null = null;
    let oneShot = false;

    const play = (name: Clip, once = false, fade = 0.3) => {
      const next = actions[name];
      if (!next || !mixer) return;
      oneShot = once;
      if (next === current) return;
      next.reset();
      next.setLoop(once ? LoopOnce : name === 'drag' ? LoopPingPong : LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      if (current) next.crossFadeFrom(current, fade, false);
      next.play();
      current = next;
    };
    const base = (): Clip => (draggingRef.current ? 'drag' : talkingRef.current ? 'talk' : 'idle');
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (last && now - last < FRAME_MS - 2) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      mixer?.update(dt);
      renderer.render(scene, camera);
    };

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(modelUrl, (gltf) => {
      if (disposed) return;
      scene.add(gltf.scene);
      mixer = new AnimationMixer(gltf.scene);
      for (const clip of gltf.animations) {
        if (CLIPS.includes(clip.name as Clip)) actions[clip.name as Clip] = mixer.clipAction(clip);
      }
      mixer.addEventListener('finished', (e) => {
        if (e.action === current) play(base());
      });
      ctlRef.current = {
        // A wave in progress finishes first, unless he is picked up or starts talking.
        base: () => { if (draggingRef.current || talkingRef.current || !oneShot) play(base(), false, draggingRef.current ? 0.15 : 0.3); },
        wave: () => { if (!draggingRef.current && !talkingRef.current) play('wave', true); },
      };
      if (greetRef.current && base() === 'idle') play('wave', true);
      else play(base());
      setReady(true);
      onReadyRef.current?.();
      running = true;
      raf = requestAnimationFrame(frame);
    }, undefined, () => {
      // No model, no 3D: the still image stays.
    });

    return () => {
      disposed = true;
      running = false;
      ctlRef.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mixer?.stopAllAction();
      scene.traverse((obj) => {
        if (!(obj instanceof Mesh)) return;
        obj.geometry.dispose();
        const mats: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          for (const value of Object.values(m)) if (value instanceof Texture) value.dispose();
          m.dispose();
        }
      });
      envMap.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  useEffect(() => {
    talkingRef.current = talking;
    draggingRef.current = dragging;
    ctlRef.current?.base();
  }, [talking, dragging]);

  const firstWave = useRef(waveKey);
  useEffect(() => {
    if (waveKey !== firstWave.current) ctlRef.current?.wave();
  }, [waveKey]);

  return <div ref={hostRef} className={className} aria-hidden="true" style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.4s ease' }} />;
}
