"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, useGLTF } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Glitch, Scanline } from "@react-three/postprocessing";
import { GlitchMode } from "postprocessing";
import * as THREE from "three";
import type { MentorId } from "@/lib/types";

// Drop a CC0 / CC-BY head into public/models and set its path here.
// Without one, a stylised bust is built from primitives.
const MODEL_URLS: Record<MentorId, string | null> = {
  coach: null,
  founder: null,
  scientist: null,
};

type Props = {
  mentor: MentorId;
  accent: string;
  active: boolean; // session connected
  getOutputVolume: () => number;
  getInputVolume: () => number;
  glitch: boolean; // Thinking: a client tool just ran
  celebrate: number; // bump to trigger the Celebrate burst
};

type Levels = { out: number; in: number; celebrate: number };

export default function Hologram(props: Props) {
  // Smoothed volumes shared by every animated piece of the scene.
  const levels = useRef<Levels>({ out: 0, in: 0, celebrate: 0 });

  useEffect(() => {
    if (props.celebrate) levels.current.celebrate = 1;
  }, [props.celebrate]);

  return (
    <Canvas camera={{ position: [0, 0, 3.1], fov: 40 }} dpr={[1, 1.5]} gl={{ antialias: false }}>
      <color attach="background" args={["#05060a"]} />
      <Driver {...props} levels={levels} />
      <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
        <Suspense fallback={null}>
          <Bust mentor={props.mentor} accent={props.accent} active={props.active} levels={levels} />
        </Suspense>
      </Float>
      <Projector accent={props.accent} levels={levels} />
      <Sparkles count={60} scale={[1.5, 2, 1.5]} position={[0, -0.2, 0]} size={2} speed={0.4} color={props.accent} opacity={0.7} />
      <Burst accent={props.accent} levels={levels} />
      <EffectComposer>
        <Bloom intensity={1.4} luminanceThreshold={0.1} mipmapBlur />
        <Scanline density={1.6} opacity={0.15} />
        <ChromaticAberration offset={[0.0008, 0.0008]} />
        <Glitch active={props.glitch} mode={GlitchMode.CONSTANT_MILD} delay={[0, 0]} duration={[0.3, 0.3]} strength={[0.1, 0.3]} />
      </EffectComposer>
    </Canvas>
  );
}

// Reads the agent's volumes once per frame and smooths them (lerp 0.2).
function Driver({ getOutputVolume, getInputVolume, active, levels }: Props & { levels: React.RefObject<Levels> }) {
  useFrame((_, dt) => {
    const l = levels.current;
    // Volumes can be NaN before the audio graph is ready; one NaN would
    // stick in the lerp and blank the whole canvas through bloom.
    const out = active ? safe(getOutputVolume) : 0;
    const inp = active ? safe(getInputVolume) : 0;
    l.out = THREE.MathUtils.lerp(l.out, Math.min(out * 1.5, 1), 0.2);
    l.in = THREE.MathUtils.lerp(l.in, Math.min(inp * 1.5, 1), 0.2);
    l.celebrate = Math.max(0, l.celebrate - dt * 0.8);
  });
  return null;
}

function safe(read: () => number) {
  try {
    const v = read();
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  } catch {
    return 0;
  }
}

// ---------- Hologram shader ----------
// Fresnel edge glow, scanlines moving up, slight transparency, flicker.
// Uses three's chunks so morph targets and skinning work on loaded GLBs.
const vertexShader = /* glsl */ `
  #include <common>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vWorldY;
  void main() {
    #include <beginnormal_vertex>
    #include <morphinstance_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <project_vertex>
    vNormal = normalize(transformedNormal);
    vViewDir = normalize(-mvPosition.xyz);
    vWorldY = (modelMatrix * vec4(transformed, 1.0)).y;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uGlow;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vWorldY;
  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 2.0);
    float scan = smoothstep(0.3, 0.7, sin(vWorldY * 140.0 - uTime * 4.0) * 0.5 + 0.5);
    float band = smoothstep(0.0, 0.04, abs(fract(vWorldY * 0.6 - uTime * 0.25) - 0.5));
    float flicker = 0.93 + 0.07 * sin(uTime * 37.0) * sin(uTime * 11.0);
    float alpha = (0.04 + fresnel * 0.8 + scan * 0.06) * mix(1.6, 1.0, band) * flicker * uOpacity;
    vec3 color = uColor * uGlow * (0.25 + fresnel * 1.6);
    gl_FragColor = vec4(color, alpha);
  }
`;

function useHologramMaterial(accent: string) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uColor: { value: new THREE.Color(accent) },
          uTime: { value: 0 },
          uGlow: { value: 0.6 },
          uOpacity: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    // Color is updated below so the material survives mentor changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    material.uniforms.uColor.value.set(accent);
  }, [accent, material]);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

// ---------- The head ----------
type BustProps = { mentor: MentorId; accent: string; active: boolean; levels: React.RefObject<Levels> };

function Bust(props: BustProps) {
  return MODEL_URLS[props.mentor] ? <ModelBust {...props} url={MODEL_URLS[props.mentor]!} /> : <PrimitiveBust {...props} />;
}

// Shared per-frame animation: glow pulse with voice, tilt while listening.
function useBustAnimation(material: THREE.ShaderMaterial, group: React.RefObject<THREE.Group | null>, { active, levels }: BustProps) {
  useFrame(({ clock }) => {
    const l = levels.current;
    const u = material.uniforms;
    u.uTime.value = clock.elapsedTime;
    const base = active ? 0.75 : 0.45; // Idle is dim
    u.uGlow.value = base + l.out * 1.5 + l.celebrate * 1.5;
    if (group.current) {
      const listening = active && l.out < 0.05;
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, listening ? 0.06 + l.in * 0.15 : 0, 0.05);
      group.current.rotation.y = Math.sin(clock.elapsedTime * 0.4) * 0.15;
    }
  });
}

function PrimitiveBust(props: BustProps) {
  const material = useHologramMaterial(props.accent);
  const group = useRef<THREE.Group>(null);
  const jaw = useRef<THREE.Group>(null);
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: props.accent, toneMapped: false }), [props.accent]);
  useEffect(() => () => eyeMat.dispose(), [eyeMat]);
  const wire = useMemo(
    () => new THREE.MeshBasicMaterial({ color: props.accent, wireframe: true, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending }),
    [props.accent],
  );
  useEffect(() => () => wire.dispose(), [wire]);

  useBustAnimation(material, group, props);
  useFrame(() => {
    if (jaw.current) jaw.current.rotation.x = THREE.MathUtils.lerp(jaw.current.rotation.x, props.levels.current.out * 0.35, 0.3);
  });

  return (
    <group ref={group} position={[0, 0.05, 0]}>
      {/* cranium */}
      <mesh material={material} position={[0, 0.22, 0]} scale={[0.82, 1, 0.92]}>
        <sphereGeometry args={[0.36, 48, 48]} />
      </mesh>
      <mesh material={wire} position={[0, 0.22, 0]} scale={[0.84, 1.02, 0.94]}>
        <icosahedronGeometry args={[0.36, 3]} />
      </mesh>
      {/* jaw pivots open with the voice */}
      <group ref={jaw} position={[0, 0.08, -0.04]}>
        <mesh material={material} position={[0, -0.1, 0.06]} scale={[0.62, 0.42, 0.72]}>
          <sphereGeometry args={[0.36, 40, 24, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65]} />
        </mesh>
      </group>
      {/* eyes */}
      <mesh material={eyeMat} position={[-0.1, 0.24, 0.3]}>
        <sphereGeometry args={[0.022, 16, 16]} />
      </mesh>
      <mesh material={eyeMat} position={[0.1, 0.24, 0.3]}>
        <sphereGeometry args={[0.022, 16, 16]} />
      </mesh>
      {/* nose */}
      <mesh material={material} position={[0, 0.17, 0.33]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[0.03, 0.1, 12]} />
      </mesh>
      {/* neck and shoulders */}
      <mesh material={material} position={[0, -0.2, -0.02]}>
        <cylinderGeometry args={[0.11, 0.14, 0.26, 32, 1, true]} />
      </mesh>
      <mesh material={material} position={[0, -0.45, -0.02]} scale={[1.6, 0.5, 0.8]}>
        <sphereGeometry args={[0.3, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </mesh>
      <MentorProp mentor={props.mentor} material={material} />
    </group>
  );
}

// One small prop per mentor so the heads read differently at a glance.
function MentorProp({ mentor, material }: { mentor: MentorId; material: THREE.Material }) {
  if (mentor === "scientist") {
    return (
      <group position={[0, 0.25, 0.31]}>
        <mesh material={material} position={[-0.1, 0, 0]}>
          <torusGeometry args={[0.055, 0.006, 8, 32]} />
        </mesh>
        <mesh material={material} position={[0.1, 0, 0]}>
          <torusGeometry args={[0.055, 0.006, 8, 32]} />
        </mesh>
        <mesh material={material} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.004, 0.004, 0.09, 6]} />
        </mesh>
      </group>
    );
  }
  if (mentor === "coach") {
    // headset mic
    return (
      <group>
        <mesh material={material} position={[0, 0.24, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.31, 0.008, 8, 48, Math.PI]} />
        </mesh>
        <mesh material={material} position={[-0.25, 0.08, 0.14]} rotation={[0.2, -0.9, 0.5]}>
          <cylinderGeometry args={[0.006, 0.006, 0.26, 6]} />
        </mesh>
        <mesh material={material} position={[-0.17, 0.0, 0.25]}>
          <sphereGeometry args={[0.022, 12, 12]} />
        </mesh>
      </group>
    );
  }
  // founder: open collar
  return (
    <mesh material={material} position={[0, -0.3, 0.02]} rotation={[0.15, 0, 0]}>
      <torusGeometry args={[0.16, 0.012, 8, 40, Math.PI * 1.4]} />
    </mesh>
  );
}

function ModelBust(props: BustProps & { url: string }) {
  const { scene } = useGLTF(props.url);
  const material = useHologramMaterial(props.accent);
  const group = useRef<THREE.Group>(null);

  // Swap every material for the hologram shader and find a mouth morph.
  const { model, mouth } = useMemo(() => {
    const model = scene.clone(true);
    let mouth: { mesh: THREE.Mesh; index: number } | null = null;
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.material = material;
      const dict = o.morphTargetDictionary;
      if (!mouth && dict) {
        const key = Object.keys(dict).find((k) => /jaw|mouth|aa|viseme_aa/i.test(k));
        if (key !== undefined) mouth = { mesh: o, index: dict[key] };
      }
    });
    // Fit the model to roughly 1 unit tall, centered.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = 1.1 / Math.max(size.y, 0.001);
    model.scale.setScalar(scale);
    model.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(scale));
    return { model, mouth: mouth as { mesh: THREE.Mesh; index: number } | null };
  }, [scene, material]);

  useBustAnimation(material, group, props);
  useFrame(() => {
    if (mouth?.mesh.morphTargetInfluences) mouth.mesh.morphTargetInfluences[mouth.index] = props.levels.current.out;
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

// ---------- Projector disc ----------
function Projector({ accent, levels }: { accent: string; levels: React.RefObject<Levels> }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const disc = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const l = levels.current;
    rings.current.forEach((r, i) => {
      if (!r) return;
      // Ripples speed up and spread with the student's voice.
      const t = (clock.elapsedTime * (0.35 + l.in * 0.8) + i / 3) % 1;
      r.scale.setScalar(0.5 + t * (0.9 + l.in * 0.6));
      (r.material as THREE.MeshBasicMaterial).opacity = (1 - t) * (0.25 + l.in * 0.6);
    });
    if (disc.current) disc.current.opacity = 0.35 + l.out * 0.4 + l.celebrate * 0.5;
  });
  return (
    <group position={[0, -0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[0.45, 64]} />
        <meshBasicMaterial ref={disc} color={accent} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.47, 0.5, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => void (rings.current[i] = m)}>
          <ringGeometry args={[0.48, 0.5, 64]} />
          <meshBasicMaterial color={accent} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Celebrate burst ----------
function Burst({ accent, levels }: { accent: string; levels: React.RefObject<Levels> }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const c = levels.current.celebrate;
    if (!group.current) return;
    group.current.visible = c > 0.01;
    group.current.scale.setScalar(1 + (1 - c) * 0.8);
  });
  return (
    <group ref={group} visible={false}>
      <Sparkles count={120} scale={[2.2, 2.2, 2.2]} size={6} speed={2.5} color={accent} />
    </group>
  );
}
