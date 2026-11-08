"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

// Pieces shared by every teacher's 3D scene.

export type Levels = { out: number; in: number; celebrate: number };

export const CHALK = "#f1eee4";

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function safe(read: () => number) {
  try {
    const v = read();
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  } catch {
    return 0;
  }
}

// Reads the agent's volumes once per frame and smooths them (lerp 0.2).
export function Driver({
  getOutputVolume,
  getInputVolume,
  active,
  levels,
}: {
  getOutputVolume: () => number;
  getInputVolume: () => number;
  active: boolean;
  levels: React.RefObject<Levels>;
}) {
  useFrame((_, dt) => {
    const l = levels.current;
    // Volumes can be NaN before the audio graph is ready; one NaN would
    // stick in the lerp and blank the whole canvas.
    const out = active ? safe(getOutputVolume) : 0;
    const inp = active ? safe(getInputVolume) : 0;
    l.out = THREE.MathUtils.lerp(l.out, Math.min(out * 1.5, 1), 0.2);
    l.in = THREE.MathUtils.lerp(l.in, Math.min(inp * 1.5, 1), 0.2);
    l.celebrate = Math.max(0, l.celebrate - dt * 0.8);
  });
  return null;
}

// Slow snow drifting past the teacher.
const FLAKES = 160;
export function Snow() {
  const points = useRef<THREE.Points>(null);
  const { geometry, drift } = useMemo(() => {
    const pos = new Float32Array(FLAKES * 3);
    const drift = new Float32Array(FLAKES);
    for (let i = 0; i < FLAKES; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3.4;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2.6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
      drift[i] = 0.08 + Math.random() * 0.14;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { geometry, drift };
  }, []);
  const material = useMemo(
    () => new THREE.PointsMaterial({ color: CHALK, size: 0.018, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }, dt) => {
    if (prefersReducedMotion()) return;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < FLAKES; i++) {
      let y = pos.getY(i) - drift[i] * step;
      if (y < -1.3) y = 1.3;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(clock.elapsedTime * 0.6 + i) * 0.0006);
    }
    pos.needsUpdate = true;
  });
  return <points ref={points} geometry={geometry} material={material} />;
}

// A puff of chalk dust, like clapping two erasers.
export function Burst({ levels }: { levels: React.RefObject<Levels> }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const c = levels.current.celebrate;
    if (!group.current) return;
    group.current.visible = c > 0.01;
    group.current.scale.setScalar(1 + (1 - c) * 0.8);
  });
  return (
    <group ref={group} visible={false}>
      <Sparkles count={140} scale={[2.2, 2.2, 2.2]} size={5} speed={2.5} color={CHALK} />
    </group>
  );
}
