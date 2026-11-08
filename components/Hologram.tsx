"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { Bloom, EffectComposer, Glitch } from "@react-three/postprocessing";
import { GlitchMode } from "postprocessing";
import * as THREE from "three";
import type { MentorId } from "@/lib/types";
import SkierAvatar from "@/components/SkierAvatar";
import { Burst, CHALK, Driver, Snow, prefersReducedMotion, type Levels } from "@/components/SceneBits";
import {
  BEANIE,
  FACES,
  MOUTH_Y,
  POINTED_BEARD,
  SHORT_HAIR,
  WILD_HAIR,
  browPoints,
  eyeAnchor,
  headGeometry,
  headPoint,
  lineTube,
  neckGeometry,
  shellGeometry,
  shouldersGeometry,
  surfaceTube,
} from "@/lib/android";

type Props = {
  mentor: MentorId;
  accent: string;
  active: boolean; // session connected
  getOutputVolume: () => number;
  getInputVolume: () => number;
  glitch: boolean; // Thinking: a client tool just ran
  celebrate: number; // bump to trigger the Celebrate burst
  ski?: boolean; // the student skis: beanie, goggles, gaiter and falling snow
};

const BOARD = "#223329"; // mid tone of the .board gradient
const METAL = "#7f878c";
const DARK_METAL = "#2b3034";

export default function Hologram(props: Props) {
  // The demo mood (the Enthusiast) and the Stickler are the ski racer, not a hologram.
  return props.mentor === "enthusiast" || props.mentor === "stickler" ? <SkierAvatar {...props} /> : <HologramScene {...props} />;
}

function HologramScene(props: Props) {
  // Smoothed volumes shared by every animated piece of the scene.
  const levels = useRef<Levels>({ out: 0, in: 0, celebrate: 0 });

  useEffect(() => {
    if (props.celebrate) levels.current.celebrate = 1;
  }, [props.celebrate]);

  return (
    <Canvas camera={{ position: [0, 0, 3.1], fov: 40 }} dpr={[1, 1.5]} gl={{ antialias: false }}>
      {/* Same slate as the board, so the teacher stands on it. */}
      <color attach="background" args={[BOARD]} />
      <Driver {...props} levels={levels} />
      <Float speed={1} rotationIntensity={0.06} floatIntensity={0.22}>
        <Android key={props.mentor} mentor={props.mentor} accent={props.accent} active={props.active} ski={!!props.ski} glitch={props.glitch} levels={levels} />
      </Float>
      <Projector accent={props.accent} levels={levels} />
      <Burst levels={levels} />
      {props.ski && <Snow />}
      <EffectComposer>
        <Bloom intensity={0.55} luminanceThreshold={0.8} mipmapBlur />
        <Glitch active={props.glitch} mode={GlitchMode.CONSTANT_MILD} delay={[0, 0]} duration={[0.3, 0.3]} strength={[0.1, 0.3]} />
      </EffectComposer>
    </Canvas>
  );
}

// ---------- Shaders ----------
// A solid, softly lit figure made of light. It keeps the hologram's tells
// (rim glow, drifting scanlines, chalk dust on the shadow side, drawn in from
// the base up), while the shading gives it the weight of a real person.
const vertexShader = /* glsl */ `
  #ifdef HEAD
    attribute vec3 aRest;
    attribute float aJaw;
    uniform float uJaw;
  #endif
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vWorldY;
  varying vec3 vRest;
  void main() {
    vec3 p = position;
    #ifdef HEAD
      p.y -= uJaw * aJaw * 0.036;
      p.z -= uJaw * aJaw * 0.008;
      vRest = aRest;
    #else
      vRest = position;
    #endif
    vec4 world = modelMatrix * vec4(p, 1.0);
    vec4 mv = viewMatrix * world;
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    vWorldY = world.y;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uTone;
  uniform vec3 uJacket;
  uniform float uTime;
  uniform float uGlow;
  uniform float uReveal;
  uniform float uJaw;
  uniform float uSmile;
  uniform float uKnit;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vWorldY;
  varying vec3 vRest;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float front = vWorldY - uReveal;
    if (front > 0.0) discard;
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(vViewDir);
    vec3 tone = uTone;
    float seam = 0.0;
    float dark = 0.0;
    float teeth = 0.0;

    #ifdef BODY
      // Skin in the open V of a jacket, a thin glowing line at the lapels.
      float ax = abs(vRest.x);
      float neck = -0.29 - 0.19 * max(0.0, 1.0 - ax / 0.17);
      float w = fwidth(vRest.y) * 1.5;
      float jacket = smoothstep(neck + w, neck - w, vRest.y);
      tone = mix(tone, uJacket, jacket);
      seam = 1.0 - smoothstep(0.0, w * 1.2, abs(vRest.y - neck));
    #endif

    #ifdef HEAD
      vec3 r = vRest;
      // Face plate: a hairline seam round the face is the one honest robot tell.
      float plate = length(vec2(r.x / 0.8, (r.y + 0.1) / 0.92)) - 1.0;
      float pw = fwidth(plate) * 1.2;
      float faceSide = smoothstep(0.02, 0.2, r.z);
      seam = (1.0 - smoothstep(0.0, pw, abs(plate))) * faceSide;
      // Behind the plate the shell turns a shade more like metal.
      tone *= mix(1.0, 0.84, smoothstep(-pw, pw, plate) * faceSide + (1.0 - faceSide));
      // Temple panel line.
      float temple = (1.0 - smoothstep(0.0, fwidth(r.y) * 1.2, abs(r.y - 0.06))) * step(0.0, plate) * faceSide;
      seam = max(seam, temple * 0.6);
      // Lips: slightly deeper in tone, no paint.
      float line = ${MOUTH_Y.toFixed(3)} + uSmile * r.x * r.x * 7.0;
      float lips = (1.0 - smoothstep(0.8, 1.0, length(vec2(r.x / 0.22, (r.y - line + 0.005) / 0.08)))) * faceSide;
      tone = mix(tone, tone * vec3(0.72, 0.62, 0.62), lips * 0.75);
      // The mouth: a fine line at rest, opening with the jaw.
      float open = smoothstep(0.01, 0.2, uJaw);
      float halfH = mix(0.0042, 0.0165, open);
      float mx = abs(r.x) / mix(0.2, 0.165, open);
      float my = abs(r.y - (line - 0.015 * open)) / halfH;
      dark = (1.0 - smoothstep(0.75, 1.0, length(vec2(mx, my)))) * faceSide;
      // A hint of upper teeth, only once the mouth is open.
      teeth = smoothstep(0.1, 0.45, (r.y - (line - 0.015 * open)) / halfH) * open;
    #endif

    #ifdef HAIR
      // Combed strands instead of a moulded plastic cap.
      tone *= 0.72 + 0.28 * (0.5 + 0.5 * sin(vRest.x * 240.0 + vRest.z * 170.0 + sin(vRest.y * 26.0) * 3.0));
    #endif

    #ifdef KNIT
      tone *= 0.82 + 0.18 * smoothstep(-0.5, 0.5, sin(vRest.y * 260.0 + sin(vRest.x * 90.0) * 0.5));
    #endif

    vec3 key = normalize(vec3(-0.45, 0.7, 0.62));
    vec3 fill = normalize(vec3(0.72, 0.05, 0.5));
    float wrap = clamp(dot(n, key) * 0.62 + 0.38, 0.0, 1.0);
    float side = clamp(dot(n, fill) * 0.5 + 0.5, 0.0, 1.0);
    float light = 0.14 + wrap * wrap * 0.8 + side * side * 0.13;
    vec3 col = tone * light;
    // Light thrown up from the projector.
    float under = clamp(-n.y, 0.0, 1.0);
    col += uColor * under * under * (0.05 + uGlow * 0.04);
    // Soft, ceramic highlight.
    vec3 h = normalize(key + v);
    float gloss = 0.2;
    #ifdef HAIR
      gloss = 0.05;
    #endif
    col += vec3(pow(max(dot(n, h), 0.0), 42.0) * gloss);
    // Rim in the mentor's colour.
    float fres = pow(1.0 - abs(dot(n, v)), 3.6);
    col += uColor * fres * (0.14 + uGlow * 0.34);

    // Seams catch the voice.
    col = mix(col, col * 0.3, seam * 0.75);
    col += uColor * seam * (0.1 + uGlow * 0.5);
    // Inside of the mouth: dark, with a low glow when speaking.
    col = mix(col, mix(vec3(0.012, 0.016, 0.018) + uColor * 0.06 * uJaw, vec3(0.62, 0.62, 0.58), teeth), dark);

    // Chalk dust gathers in the shadows.
    vec2 px = gl_FragCoord.xy;
    float grain = hash(floor(px / 1.6) + floor(uTime * 7.0));
    col *= mix(0.86 + 0.14 * grain, 1.0, wrap);
    // Scanlines and the faintest flicker.
    col *= 0.975 + 0.025 * sin(vWorldY * 200.0 - uTime * 2.4);
    col *= 0.985 + 0.015 * sin(uTime * 37.0) * sin(uTime * 11.0);
    // The line being drawn right now.
    float edge = smoothstep(-0.07, 0.0, front) * step(0.35, grain);
    col += vec3(0.95, 0.93, 0.88) * edge * 1.2;

    float alpha = 0.97;
    #ifdef BODY
      alpha *= smoothstep(-0.84, -0.6, vWorldY);
    #endif
    gl_FragColor = vec4(col, alpha);
  }
`;

// The eye: glowing iris with a camera-shutter pattern, the other robot tell.
const eyeFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGlow;
  uniform float uReveal;
  uniform float uPupil;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vWorldY;
  varying vec3 vRest;
  void main() {
    if (vWorldY - uReveal > 0.0) discard;
    vec3 p = normalize(vRest);
    float r = length(p.xy);
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vViewDir);
    float shade = 0.5 + 0.5 * clamp(dot(n, normalize(vec3(-0.3, 0.75, 0.6))), 0.0, 1.0);
    vec3 col = vec3(0.68, 0.67, 0.64) * shade;
    if (p.z > 0.0) {
      float ang = atan(p.y, p.x);
      float blades = 0.5 + 0.5 * sin(ang * 12.0 + r * 30.0);
      float iris = 1.0 - smoothstep(0.6, 0.64, r);
      vec3 irisCol = uColor * (0.28 + 0.22 * blades * smoothstep(0.2, 0.6, r));
      irisCol += uColor * (1.0 - smoothstep(0.0, 0.05, abs(r - 0.59))) * (0.5 + uGlow * 0.5);
      col = mix(col, irisCol, iris);
      float pupil = 1.0 - smoothstep(uPupil, uPupil + 0.025, r);
      col = mix(col, vec3(0.006) + uColor * 0.12 * uGlow, pupil);
    }
    // The wet glint that makes an eye feel alive.
    vec3 h = normalize(normalize(vec3(-0.45, 0.7, 0.62)) + v);
    col += vec3(pow(max(dot(n, h), 0.0), 220.0)) * 1.1;
    gl_FragColor = vec4(col, 1.0);
  }
`;

type Shared = {
  uColor: { value: THREE.Color };
  uTime: { value: number };
  uGlow: { value: number };
  uReveal: { value: number };
  uJaw: { value: number };
  uSmile: { value: number };
  uPupil: { value: number };
};

function linearColor(a: string, tint?: THREE.Color, amount = 0) {
  const c = new THREE.Color(a);
  return tint ? c.lerp(tint, amount) : c;
}

function skinMaterial(shared: Shared, tone: THREE.Color, jacket: THREE.Color, define?: "HEAD" | "BODY" | "KNIT" | "HAIR", opts: { doubleSide?: boolean } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    defines: define ? { [define]: 1 } : {},
    uniforms: { ...shared, uTone: { value: tone }, uJacket: { value: jacket }, uKnit: { value: 0 } },
    transparent: true,
    depthWrite: true,
    side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
}

// ---------- The android ----------
type AndroidProps = { mentor: MentorId; accent: string; active: boolean; ski: boolean; glitch: boolean; levels: React.RefObject<Levels> };

const DRAW_S = 2.2; // how long the figure takes to draw in, from the base up
const LID_OPEN = (lid: number) => THREE.MathUtils.lerp(0.02, -0.5, lid);
const LID_SHUT = 0.42;

function Android({ mentor, accent, active, ski, glitch, levels }: AndroidProps) {
  const f = FACES[mentor];
  const shared = useMemo<Shared>(
    () => ({
      uColor: { value: new THREE.Color(accent) },
      uTime: { value: 0 },
      uGlow: { value: 0.4 },
      uReveal: { value: -2 },
      uJaw: { value: 0 },
      uSmile: { value: f.smile },
      uPupil: { value: 0.2 },
    }),
    // Colour follows the accent below; a new mentor remounts this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    shared.uColor.value.set(accent);
  }, [accent, shared]);

  const parts = useMemo(() => {
    const tint = new THREE.Color(accent);
    const skin = linearColor(f.skin, tint, 0.06);
    const hair = linearColor(f.hair);
    const metal = linearColor(METAL, tint, 0.08);
    const darkMetal = linearColor(DARK_METAL);
    const jacket = linearColor(f.jacket);
    const glowMaterial = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
    const eyeMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: eyeFragmentShader,
      uniforms: { ...shared },
    });
    return {
      headGeo: headGeometry(f),
      neckGeo: neckGeometry(),
      shouldersGeo: shouldersGeometry(),
      browGeo: [surfaceTube(f, browPoints(f, -1), 0.0085), surfaceTube(f, browPoints(f, 1), 0.0085)],
      eyeGeo: new THREE.SphereGeometry(0.058, 32, 24),
      lidUp: new THREE.SphereGeometry(0.0625, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      lidDown: new THREE.SphereGeometry(0.062, 32, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      head: skinMaterial(shared, skin, jacket, "HEAD"),
      body: skinMaterial(shared, skin, jacket, "BODY"),
      lid: skinMaterial(shared, skin.clone().multiplyScalar(0.93), jacket, undefined, { doubleSide: true }),
      hair: skinMaterial(shared, hair, jacket, "HAIR"),
      knit: skinMaterial(shared, linearColor(accent).multiplyScalar(0.62), jacket, "KNIT"),
      jacket: skinMaterial(shared, jacket, jacket),
      metal: skinMaterial(shared, metal, jacket),
      darkMetal: skinMaterial(shared, darkMetal, jacket),
      lens: skinMaterial(shared, linearColor(accent).multiplyScalar(0.3), jacket),
      glowMaterial,
      eyeMaterial,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentor, accent, shared]);

  useEffect(
    () => () => {
      for (const v of Object.values(parts)) {
        if (Array.isArray(v)) v.forEach((g) => g.dispose());
        else v.dispose();
      }
    },
    [parts],
  );

  const pivot = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const brows = useRef<THREE.Group>(null);
  const eyes = useRef<(THREE.Mesh | null)[]>([]);
  const uppers = useRef<(THREE.Mesh | null)[]>([]);
  const lowers = useRef<(THREE.Mesh | null)[]>([]);

  const anim = useRef({
    drawFrom: null as number | null,
    nextBlink: 2,
    blinkAt: -10,
    nextLook: 1,
    lookX: 0,
    lookY: 0,
    eyeX: 0,
    eyeY: 0,
    jaw: 0,
    brow: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
  });

  // Draw in on first view, and again when the session starts.
  useEffect(() => {
    anim.current.drawFrom = null;
  }, [active]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const a = anim.current;
    const l = levels.current;
    const lerp = THREE.MathUtils.lerp;
    const reduced = prefersReducedMotion();
    const speaking = active && l.out > 0.04;
    const listening = active && !speaking;

    if (a.drawFrom === null) a.drawFrom = t;
    const drawn = Math.min(1, (t - a.drawFrom) / DRAW_S);
    shared.uTime.value = t;
    shared.uReveal.value = reduced ? 2 : -1.1 + (1 - Math.pow(1 - drawn, 3)) * 2.6;
    shared.uGlow.value = (active ? 0.65 : 0.32) + l.out * 1.3 + l.celebrate * 1.4;
    parts.glowMaterial.color.set(accent).multiplyScalar(0.7 + shared.uGlow.value * 1.2);

    // Talking: a syllable rhythm over the voice's loudness, so the mouth never
    // just opens and closes with volume.
    const syllables = 0.62 + 0.38 * Math.sin(t * 15.5) * Math.sin(t * 6.7 + 1.1);
    const jawTarget = Math.min(1, l.out * 1.5 * syllables + l.celebrate * 0.35);
    a.jaw = lerp(a.jaw, jawTarget, 0.38);
    shared.uJaw.value = a.jaw;
    shared.uPupil.value = 0.25 + l.out * 0.05 + (listening ? 0.02 : 0);

    // Blinks: quick to close, slower to open, now and then.
    if (t > a.nextBlink) {
      a.blinkAt = t;
      a.nextBlink = t + 2 + Math.random() * 4;
    }
    const since = t - a.blinkAt;
    const blink = reduced ? 0 : since < 0.07 ? since / 0.07 : since < 0.2 ? 1 - (since - 0.07) / 0.13 : 0;
    const wide = l.celebrate * 0.5 + (listening ? 0.08 : 0) + l.out * 0.08;
    const open = LID_OPEN(Math.min(1, f.lid + wide));
    uppers.current.forEach((m) => {
      if (m) m.rotation.x = lerp(open, LID_SHUT, blink);
    });
    lowers.current.forEach((m) => {
      if (m) m.rotation.x = lerp(0.44, 0.34, blink) - f.smile * 0.9;
    });

    // Eyes dart, the head follows slowly: that lag is most of what reads as alive.
    if (!reduced && t > a.nextLook) {
      const away = speaking ? 0.14 : listening ? 0.05 : 0.22;
      a.lookX = (Math.random() - 0.5) * away * 2;
      a.lookY = (Math.random() - 0.5) * away;
      a.nextLook = t + 0.9 + Math.random() * 2.8;
    }
    const lookY = glitch ? 0.3 : a.lookY;
    const lookX = glitch ? -0.26 : a.lookX;
    a.eyeX = lerp(a.eyeX, lookX, 0.3);
    a.eyeY = lerp(a.eyeY, lookY, 0.3);
    eyes.current.forEach((m) => {
      if (m) m.rotation.set(-a.eyeY, a.eyeX, 0);
    });

    // Brows lift on loud moments and when something lands.
    a.brow = lerp(a.brow, l.out * 0.014 + l.celebrate * 0.02 + (glitch ? 0.012 : 0) + (listening ? 0.004 : 0), 0.14);
    if (brows.current) brows.current.position.y = a.brow;

    // Head: tilts in to listen, nods on the beat of speech, drifts when idle.
    if (pivot.current) {
      const idle = reduced ? 0 : 1;
      const yawGoal = idle * (Math.sin(t * 0.37) * 0.09 + Math.sin(t * 0.13 + 1) * 0.05) + a.lookX * 0.45;
      const pitchGoal = idle * (Math.sin(t * 0.29) * 0.02 + l.out * 0.06 * Math.sin(t * 5.3)) - a.lookY * 0.2 + (listening ? 0.03 + l.in * 0.05 : 0);
      const rollGoal = idle * Math.sin(t * 0.21) * 0.014 + (listening ? 0.05 + l.in * 0.09 : 0);
      a.yaw = lerp(a.yaw, yawGoal, 0.05);
      a.pitch = lerp(a.pitch, pitchGoal, 0.08);
      a.roll = lerp(a.roll, rollGoal, 0.05);
      pivot.current.rotation.set(a.pitch, a.yaw, a.roll);
    }
    // Breathing.
    if (torso.current && !reduced) {
      const breath = Math.sin(t * 1.15);
      torso.current.scale.set(1 + breath * 0.004, 1 + breath * 0.006, 1 + breath * 0.008);
    }
  });

  const hideHair = ski;
  const leftEye = useMemo(() => eyeAnchor(f, -1), [f]);
  const rightEye = useMemo(() => eyeAnchor(f, 1), [f]);

  return (
    <group position={[0, -0.03, 0]}>
      {/* Neck, jointed like a machine, and the shoulders under it. */}
      <group ref={torso}>
        <mesh geometry={parts.shouldersGeo} material={parts.body} scale={[1, 1, 0.5]} />
        {/* Chest core */}
        <group position={[0, -0.445, 0.225]} rotation={[1.32, 0, 0]}>
          <mesh material={parts.darkMetal}>
            <cylinderGeometry args={[0.03, 0.032, 0.012, 32]} />
          </mesh>
          <mesh material={parts.glowMaterial} position={[0, 0.007, 0]}>
            <cylinderGeometry args={[0.017, 0.017, 0.004, 24]} />
          </mesh>
        </group>
        <mesh geometry={parts.neckGeo} material={parts.body} />
        {[-0.255, -0.215].map((y, i) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={parts.metal}>
            <torusGeometry args={[0.134 - i * 0.008, 0.0065, 8, 48]} />
          </mesh>
        ))}
        <mesh position={[0, -0.235, 0]} rotation={[Math.PI / 2, 0, 0]} material={parts.glowMaterial}>
          <torusGeometry args={[0.127, 0.0022, 6, 48]} />
        </mesh>
                {ski && (
          <mesh position={[0, -0.215, 0]} material={parts.knit}>
            <cylinderGeometry args={[0.13, 0.16, 0.13, 40, 3]} />
          </mesh>
        )}
      </group>

      {/* Everything above the neck turns together. */}
      <group ref={pivot} position={[0, -0.1, 0]}>
        <group position={[0, 0.42, 0]}>
          <mesh geometry={parts.headGeo} material={parts.head} />

          {[leftEye, rightEye].map((p, i) => (
            <group key={i} position={[p.x, p.y + 0.002, p.z - 0.04]}>
              <mesh ref={(m) => void (eyes.current[i] = m)} geometry={parts.eyeGeo} material={parts.eyeMaterial} />
              <mesh ref={(m) => void (uppers.current[i] = m)} geometry={parts.lidUp} material={parts.lid} scale={[1.26, 1, 1]} />
              <mesh ref={(m) => void (lowers.current[i] = m)} geometry={parts.lidDown} material={parts.lid} scale={[1.26, 1, 1]} />
            </group>
          ))}

          <group ref={brows}>
            {parts.browGeo.map((g, i) => (
              <mesh key={i} geometry={g} material={parts.hair} />
            ))}
          </group>

          <EarModules f={f} parts={parts} />
          <Features mentor={mentor} f={f} parts={parts} hideHair={hideHair} />
          {ski && <Beanie f={f} parts={parts} />}
          {ski && <Goggles f={f} parts={parts} />}
                    {mentor === "chill" && <Headphones f={f} parts={parts} />}
        </group>
      </group>
    </group>
  );
}

type Materials = {
  hair: THREE.Material;
  knit: THREE.Material;
  metal: THREE.Material;
  darkMetal: THREE.Material;
  lens: THREE.Material;
  jacket: THREE.Material;
  glowMaterial: THREE.Material;
};
type PartProps = { f: (typeof FACES)[MentorId]; parts: Materials };

// Discs where a person has ears, with a thin ring of light.
function EarModules({ f, parts }: PartProps) {
  return (
    <>
      {[1, -1].map((side) => {
        const p = headPoint(side * 0.998, -0.04, -0.05, f);
        return (
          <group key={side} position={[p.x + side * 0.004, p.y, p.z]} rotation={[0, 0, Math.PI / 2]}>
            <mesh material={parts.metal}>
              <cylinderGeometry args={[0.052, 0.058, 0.022, 32]} />
            </mesh>
            <mesh material={parts.glowMaterial} position={[0, side * 0.0115 * -1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.032, 0.0024, 6, 32]} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// Hair and beard: each teacher's silhouette at a glance.
function Features({ mentor, f, parts, hideHair }: { mentor: MentorId; hideHair: boolean } & PartProps) {
  const geometry = useMemo(() => {
    if (mentor === "philosopher") return shellGeometry(f, POINTED_BEARD);
    if (hideHair) return null;
    if (mentor === "chill") return shellGeometry(f, SHORT_HAIR);
    if (mentor === "enthusiast") return shellGeometry(f, WILD_HAIR, 240, 180);
    return null;
  }, [mentor, f, hideHair]);
  const moustache = useMemo(
    () =>
      mentor === "philosopher"
        ? surfaceTube(
            f,
            [
              [-0.19, -0.5],
              [-0.1, -0.435],
              [0, -0.425],
              [0.1, -0.435],
              [0.19, -0.5],
            ],
            0.0085,
            0.001,
          )
        : null,
    [mentor, f],
  );
  useEffect(
    () => () => {
      geometry?.dispose();
      moustache?.dispose();
    },
    [geometry, moustache],
  );
  return (
    <>
      {geometry && <mesh geometry={geometry} material={parts.hair} />}
      {moustache && <mesh geometry={moustache} material={parts.hair} />}
    </>
  );
}

function Beanie({ f, parts }: PartProps) {
  const geometry = useMemo(() => shellGeometry(f, BEANIE, 220, 170), [f]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      <mesh geometry={geometry} material={parts.knit} />
      <mesh position={[0, 0.52, -0.015]} material={parts.knit}>
        <icosahedronGeometry args={[0.07, 3]} />
      </mesh>
    </>
  );
}

function Headphones({ f, parts }: PartProps) {
  const ear = useMemo(() => headPoint(0.998, -0.04, -0.05, f), [f]);
  const x = ear.x + 0.028;
  return (
    <>
      <mesh position={[0, ear.y, ear.z]} scale={[1, 1.5, 1]} material={parts.darkMetal}>
        <torusGeometry args={[x, 0.012, 10, 64, Math.PI]} />
      </mesh>
      {[1, -1].map((side) => (
        <group key={side} position={[side * x, ear.y, ear.z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={parts.darkMetal}>
            <cylinderGeometry args={[0.078, 0.078, 0.046, 32]} />
          </mesh>
          <mesh material={parts.glowMaterial} position={[0, -side * 0.024, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.05, 0.003, 6, 32]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// Goggles pushed up on the hat: strap, frame, tinted lens.
function Goggles({ f, parts }: PartProps) {
  const p = useMemo(() => headPoint(0, 0.56, 0.828, f), [f]);
  return (
    <group>
      <mesh position={[0, p.y, -0.01]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.2, 1]} material={parts.darkMetal}>
        <torusGeometry args={[0.325, 0.012, 8, 64]} />
      </mesh>
      <group position={[0, p.y + 0.01, p.z + 0.055]} rotation={[-0.4, 0, 0]}>
        <mesh scale={[1, 0.46, 0.34]} material={parts.darkMetal}>
          <torusGeometry args={[0.15, 0.02, 10, 40]} />
        </mesh>
        <mesh scale={[1, 0.46, 0.2]} material={parts.lens}>
          <sphereGeometry args={[0.145, 32, 16]} />
        </mesh>
      </group>
    </group>
  );
}

// ---------- Chalk base ----------
// Two wobbly hand-drawn loops instead of a neon disc. The student's voice
// sends ripples out in the mentor's colour; the mentor's voice lights the base.
function wobblyLoop(radius: number, seed: number, turns = 1.08) {
  const pts: THREE.Vector3[] = [];
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 * turns + seed;
    const r = radius * (1 + 0.025 * Math.sin(a * 3 + seed * 5) + 0.015 * Math.sin(a * 7 + seed));
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function Projector({ accent, levels }: { accent: string; levels: React.RefObject<Levels> }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const loopMat = useMemo(() => new THREE.LineBasicMaterial({ color: CHALK, transparent: true, opacity: 0.7 }), []);
  const loops = useMemo(() => [wobblyLoop(0.62, 0.3), wobblyLoop(0.59, 2.1, 1.02)].map((g) => new THREE.Line(g, loopMat)), [loopMat]);
  useEffect(
    () => () => {
      loops.forEach((l) => l.geometry.dispose());
      loopMat.dispose();
    },
    [loops, loopMat],
  );
  useFrame(({ clock }) => {
    const l = levels.current;
    rings.current.forEach((r, i) => {
      if (!r) return;
      // Ripples speed up and spread with the student's voice.
      const t = (clock.elapsedTime * (0.35 + l.in * 0.8) + i / 3) % 1;
      r.scale.setScalar(0.62 + t * (0.9 + l.in * 0.6));
      (r.material as THREE.MeshBasicMaterial).opacity = (1 - t) * (0.05 + l.in * 0.6);
    });
    if (glow.current) glow.current.opacity = 0.004 + l.out * 0.03 + l.celebrate * 0.12;
    loopMat.opacity = 0.55 + l.out * 0.4;
  });
  return (
    <group position={[0, -0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[0.6, 64]} />
        <meshBasicMaterial ref={glow} color={accent} transparent opacity={0.004} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {loops.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => void (rings.current[i] = m)}>
          <ringGeometry args={[0.49, 0.5, 64]} />
          <meshBasicMaterial color={accent} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
