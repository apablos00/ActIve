"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Burst, Driver, prefersReducedMotion, type Levels } from "@/components/SceneBits";

// The ski racer is real footage of him talking, cut out of its background. While the
// agent's voice is present the footage plays, and when the voice stops it runs on to the
// next frame with a closed mouth and rests there, breathing and blinking. The canvas is
// transparent with no post-processing, so the real chalkboard stays still behind him.

type Props = {
  active: boolean;
  getOutputVolume: () => number;
  getInputVolume: () => number;
  celebrate: number;
};

// Colour sits in the top half of each video frame and the cut-out mask in the bottom
// half, which lets one ordinary video carry transparency in every browser.
const SOURCES: [string, string][] = [
  ["/avatars/skier-talking.webm", "video/webm"],
  ["/avatars/skier-talking.mp4", "video/mp4"],
];
const [W, H] = [1320, 810]; // one half of the video, in pixels
const FPS = 24;
const CLIP_FRAMES = 239; // the clip runs forward then backward, so the loop has no jump
const SOURCE_SCALE = 0.75; // the video's scale against the original 1080p clip

// Closed-mouth frames of the clip: frame, then where the head has moved to (1080p pixels).
const RESTS: [number, number, number][] = [
  [29, -4, -15], [39, 1, 0], [48, 0, 0], [72, -10, -3], [81, -8, -12], [101, -7, -15], [141, 2, -26],
  [152, -2, -10], [168, -12, -26], [178, 1, -8], [199, 3, -28], [209, 6, -33], [227, -2, -27],
];
const REST_STOPS = RESTS.flatMap(([f, dx, dy]) => {
  const back = (CLIP_FRAMES - 1) * 2 - f;
  return [
    { t: (f + 0.5) / FPS, dx, dy },
    { t: (back + 0.5) / FPS, dx, dy },
  ];
});

const VOICE_ON = 0.02; // below this the agent counts as silent
const VOICE_HOLD = 0.35; // seconds of quiet before he stops, so he talks through small pauses
const SETTLE_RATE = 1.5; // runs on a little faster to the next rest frame

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uBlink;
  uniform vec2 uHead;
  varying vec2 vUv;

  const vec2 SIZE = vec2(${W.toFixed(1)}, ${H.toFixed(1)});
  const vec4 EYE_L = vec4(678.0, 256.5, 26.0, 18.0);
  const vec4 EYE_R = vec4(767.0, 247.5, 27.0, 18.0);

  vec3 colorAt(vec2 uv) {
    return texture2D(uMap, vec2(uv.x, 0.502 + uv.y * 0.498)).rgb;
  }

  vec3 blink(vec3 col, vec2 p, vec4 eye) {
    vec2 center = eye.xy + uHead;
    vec2 d = (p - center) / eye.zw;
    float inside = 1.0 - smoothstep(0.86, 1.04, length(d));
    if (inside <= 0.0) return col;
    float line = -1.1 + 2.2 * uBlink;
    float cover = 1.0 - smoothstep(line - 0.05, line + 0.05, d.y);
    // The lid is the skin right above this eye, carried down.
    vec2 lidP = vec2(p.x, center.y - eye.w - 1.0);
    vec3 lid = colorAt(vec2(lidP.x / SIZE.x, 1.0 - lidP.y / SIZE.y));
    col = mix(col, lid, cover * inside);
    float lash = 1.0 - smoothstep(0.0, 0.14, abs(d.y - line));
    return mix(col, col * 0.42, lash * inside);
  }

  void main() {
    vec3 col = colorAt(vUv);
    float a = texture2D(uMap, vec2(vUv.x, vUv.y * 0.498)).g;
    if (uBlink > 0.0) {
      vec2 p = vec2(vUv.x, 1.0 - vUv.y) * SIZE;
      col = blink(col, p, EYE_L);
      col = blink(col, p, EYE_R);
    }
    gl_FragColor = vec4(col * a, a) * uOpacity;
  }
`;

function Figure({ levels, calm }: { levels: React.RefObject<Levels>; calm: boolean }) {
  const viewport = useThree((s) => s.viewport);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        premultipliedAlpha: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uMap: { value: null },
          uOpacity: { value: 0 },
          uBlink: { value: 0 },
          uHead: { value: new THREE.Vector2() },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    const el = document.createElement("video");
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = "auto";
    for (const [src, type] of SOURCES) {
      const source = document.createElement("source");
      source.src = src;
      source.type = type;
      el.appendChild(source);
    }
    const texture = new THREE.VideoTexture(el);
    texture.colorSpace = THREE.NoColorSpace; // straight through, so the colours stay as filmed
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    material.uniforms.uMap.value = texture;

    // He waits on the first closed-mouth frame until the agent speaks.
    const first = REST_STOPS[0];
    const seek = () => {
      el.currentTime = first.t;
    };
    const ready = () => {
      material.uniforms.uHead.value.set(first.dx * SOURCE_SCALE, first.dy * SOURCE_SCALE);
      setVideo(el);
    };
    el.addEventListener("loadedmetadata", seek, { once: true });
    el.addEventListener("seeked", ready, { once: true });
    el.load();

    return () => {
      el.pause();
      el.removeEventListener("loadedmetadata", seek);
      el.removeEventListener("seeked", ready);
      el.removeAttribute("src");
      el.replaceChildren();
      el.load();
      material.uniforms.uMap.value = null;
      texture.dispose();
    };
  }, [material]);

  const group = useRef<THREE.Group>(null);
  const motion = useRef({ intro: 0, quiet: VOICE_HOLD, resting: true, blinkAt: 1.5 + Math.random() * 2 });

  // The clip's left edge cuts through the skis, so it stays on the board's left edge.
  // The bottom edge cuts through his waist, so it stays on the board's bottom edge.
  const k = Math.min(viewport.width / W, (viewport.height * 0.94) / H);

  useFrame(({ clock }, dt) => {
    if (!video) return;
    const u = material.uniforms;
    const m = motion.current;
    const t = clock.elapsedTime;

    m.intro = Math.min(1, m.intro + Math.min(dt, 0.05) / 0.25);
    u.uOpacity.value = m.intro;

    m.quiet = levels.current.out > VOICE_ON ? 0 : m.quiet + dt;
    if (m.quiet < VOICE_HOLD) {
      m.resting = false;
      video.playbackRate = 1;
      u.uBlink.value = 0;
      if (video.paused) void video.play().catch(() => {});
    } else if (!m.resting) {
      video.playbackRate = SETTLE_RATE;
      const stop = REST_STOPS.find((s) => Math.abs(video.currentTime - s.t) < 0.05);
      if (stop) {
        video.pause();
        video.currentTime = stop.t;
        u.uHead.value.set(stop.dx * SOURCE_SCALE, stop.dy * SOURCE_SCALE);
        m.resting = true;
        m.blinkAt = t + 1.2 + Math.random() * 2;
      }
    }

    if (calm) return;

    // Footage already blinks and breathes while it plays; at rest these keep him alive.
    if (m.resting) {
      const since = t - m.blinkAt;
      u.uBlink.value = since < 0 ? 0 : Math.max(0, 1 - Math.abs(since / 0.075 - 1));
      if (since > 0.16) m.blinkAt = t + 2.4 + Math.random() * 3.2;
    }
    if (group.current) group.current.scale.y = 1 + (Math.sin(t * 1.25) + 1) * 0.0022;
  });

  return (
    <group ref={group} position={[-viewport.width / 2, -viewport.height / 2, 0]}>
      <mesh material={material} position={[(W * k) / 2, (H * k) / 2, 0]} scale={[W * k, H * k, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}

export default function SkierAvatar({ active, getOutputVolume, getInputVolume, celebrate }: Props) {
  const levels = useRef<Levels>({ out: 0, in: 0, celebrate: 0 });
  const calm = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    if (celebrate > 0) levels.current.celebrate = 1;
  }, [celebrate]);

  return (
    <Canvas
      camera={{ position: [0, 0, 3.1], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      flat
      // The board's soft edge mask would fade his skis and poles: show the whole figure.
      style={{ maskImage: "none", WebkitMaskImage: "none" }}
      role="img"
      aria-label="Your teacher, a ski racer in a Norwegian race suit"
    >
      <Driver getOutputVolume={getOutputVolume} getInputVolume={getInputVolume} active={active} levels={levels} />
      <Figure levels={levels} calm={calm} />
      <Burst levels={levels} />
    </Canvas>
  );
}
