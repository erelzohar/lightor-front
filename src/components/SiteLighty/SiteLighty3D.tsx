import { useEffect, useRef, useState } from 'react';
import {
  AnimationMixer,
  LoopOnce,
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
 * while an answer is on its way. Loaded only when a visitor opens the chat
 * (three.js and the 1.3 MB model never reach a page nobody asks on). Without
 * WebGL, or with reduced motion, the caller keeps the still image.
 */

type Clip = 'idle' | 'wave' | 'talk';

const FOV = 30;
// The model is 1 tall, feet at 0; the frame keeps the wave's lean in view.
const VIEW_H = 1.22;
const VIEW_W = 1.5;
const LOOK_Y = 0.55;

export default function SiteLighty3D({ talking, onReady, className = '' }: { talking: boolean; onReady?: () => void; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const talkingRef = useRef(talking);
  const onReadyRef = useRef(onReady);
  const ctlRef = useRef<((on: boolean) => void) | null>(null);
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

    const play = (name: Clip, once = false) => {
      const next = actions[name];
      if (!next || !mixer) return;
      oneShot = once;
      if (next === current) return;
      next.reset();
      next.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      if (current) next.crossFadeFrom(current, 0.3, false);
      next.play();
      current = next;
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
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
        if (clip.name === 'idle' || clip.name === 'wave' || clip.name === 'talk') actions[clip.name] = mixer.clipAction(clip);
      }
      mixer.addEventListener('finished', (e) => {
        if (e.action === current) play(talkingRef.current ? 'talk' : 'idle');
      });
      ctlRef.current = (on) => { if (on || !oneShot) play(on ? 'talk' : 'idle'); };
      play(talkingRef.current ? 'talk' : 'wave', !talkingRef.current);
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
    ctlRef.current?.(talking);
  }, [talking]);

  return <div ref={hostRef} className={className} aria-hidden="true" style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.4s ease' }} />;
}
