import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MentorId } from "@/lib/types";

// The hologram's head is one sphere pushed into the shape of a face, in head
// space: x to the student's right, y up, z towards the student. Features are
// placed in the sphere's unit coordinates, so y = 0 is the eye line.

export type Face = {
  jaw: number; // jaw width, 1 = as wide as the skull
  nose: number;
  lips: number;
  cheek: number;
  smile: number; // mouth corners, negative turns them down
  browY: number; // brow height above its rest line
  browTilt: number; // positive: inner ends low, stern. negative: worried, open.
  browLift: number; // one brow higher than the other, the sceptic's look
  lid: number; // 1 = wide open, 0 = half closed
  skin: string;
  jacket: string;
  hair: string;
};

export const FACES: Record<MentorId, Face> = {
  stickler: { jaw: 0.74, nose: 1.08, lips: 0.72, cheek: 1.15, smile: -0.05, browY: -0.012, browTilt: 0.34, browLift: 0, lid: 0.6, skin: "#d8d2c8", jacket: "#3b4763", hair: "#4a2b33" },
  chill: { jaw: 0.84, nose: 0.92, lips: 1.05, cheek: 0.85, smile: 0.11, browY: 0.004, browTilt: -0.08, browLift: 0, lid: 0.66, skin: "#dcd4c6", jacket: "#2f6a55", hair: "#2c3a33" },
  philosopher: { jaw: 0.76, nose: 1.16, lips: 0.82, cheek: 1, smile: 0, browY: 0.006, browTilt: -0.1, browLift: 0.022, lid: 0.72, skin: "#d6d0cc", jacket: "#4e4580", hair: "#584f7e" },
  enthusiast: { jaw: 0.82, nose: 0.96, lips: 1.1, cheek: 0.9, smile: 0.16, browY: 0.022, browTilt: -0.2, browLift: 0, lid: 1, skin: "#ddd3c2", jacket: "#7d5621", hair: "#8a5a12" },
};

// The Stickler: a lean, young Nordic ski racer. High cheekbones, long straight
// nose, narrow defined jaw, thin lips, level gaze.

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const bump = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);
const both = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => bump(x, y, cx, cy, sx, sy) + bump(x, y, -cx, cy, sx, sy);

export const MOUTH_Y = -0.52;
export const mouthLine = (x: number, smile: number) => MOUTH_Y + smile * x * x * 7;

// A sphere tapers to a point at the chin. A face doesn't: it holds its width
// down to the jaw, then rounds off. This is the width of the face at height y.
const lowerFace = (y: number) => Math.pow(1 - Math.abs(y) ** 2.8, 1 / 2.4);

// A point on the skin, from a unit direction.
export function headPoint(x: number, y: number, z: number, f: Face, out = new THREE.Vector3()) {
  const front = smooth(-0.05, 0.55, z);
  const fuller = y < 0 ? Math.min(2.2, lowerFace(y) / Math.max(0.05, Math.sqrt(1 - y * y))) : 1;
  const taper = mix(f.jaw, 1, smooth(-0.95, 0.05, y));
  const px = x * 0.32 * taper * fuller;
  let pz = z * 0.37;
  if (z < 0) pz *= mix(0.72, 1, smooth(-0.9, 0.1, y));
  else pz *= fuller * mix(0.9, 1, smooth(-1, -0.2, y));
  // Keep the chin up under the mouth instead of falling away along the sphere.
  pz += front * 0.045 * smooth(-0.42, -0.95, y);

  const line = mouthLine(x, f.smile);
  const lipY = y - (line - MOUTH_Y);
  let dz = 0;
  dz -= 0.036 * both(x, y, 0.44, 0.04, 0.2, 0.1); // eye sockets
  dz += 0.016 * both(x, y, 0.36, 0.19, 0.3, 0.06); // brow ridge
  dz += 0.01 * bump(x, y, 0, 0.42, 0.6, 0.25); // forehead
  dz += 0.022 * f.nose * bump(x, y, 0, 0, 0.05, 0.16); // bridge
  dz += 0.062 * f.nose * bump(x, y, 0, -0.2, 0.066, 0.12); // nose
  dz += 0.024 * f.nose * bump(x, y, 0, -0.27, 0.052, 0.05); // tip
  dz += 0.019 * both(x, y, 0.095, -0.3, 0.046, 0.04); // wings of the nose
  dz -= 0.01 * bump(x, y, 0, -0.385, 0.12, 0.026); // under the nose
  dz += 0.019 * f.lips * bump(x, lipY, 0, -0.482, 0.2, 0.032); // upper lip
  dz += 0.021 * f.lips * bump(x, lipY, 0, -0.565, 0.17, 0.04); // lower lip
  dz -= 0.006 * bump(x, y, 0, line, 0.22, 0.016); // where the lips meet
  dz -= 0.006 * bump(x, y, 0, -0.66, 0.13, 0.035); // under the lip
  dz += 0.024 * bump(x, y, 0, -0.8, 0.2, 0.09); // chin
  dz += 0.015 * f.cheek * both(x, y, 0.58, -0.14, 0.22, 0.14); // cheekbones
  dz -= 0.008 * f.cheek * both(x, y, 0.58, -0.47, 0.16, 0.17); // hollows of the cheeks
  dz += 0.009 * f.smile * 6 * both(x, y, 0.38, -0.36, 0.15, 0.1); // smile lifts the cheeks
  pz += dz * front;

  return out.set(px, y * 0.43, pz);
}

function unitSphere(widthSegments: number, heightSegments: number) {
  // The pole faces the student, so the mesh is densest across the face.
  const sphere = new THREE.SphereGeometry(1, widthSegments, heightSegments);
  sphere.rotateX(Math.PI / 2);
  sphere.deleteAttribute("uv");
  sphere.deleteAttribute("normal");
  const geometry = mergeVertices(sphere, 1e-4);
  sphere.dispose();
  return geometry;
}

export function headGeometry(f: Face) {
  const geometry = unitSphere(240, 190);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const rest = new Float32Array(pos.count * 3);
  const jaw = new Float32Array(pos.count);
  const d = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    headPoint(d.x, d.y, d.z, f, p);
    pos.setXYZ(i, p.x, p.y, p.z);
    rest[i * 3] = d.x;
    rest[i * 3 + 1] = d.y;
    rest[i * 3 + 2] = d.z;
    // Below the lips the jaw follows the voice, fading out towards the ears.
    const line = mouthLine(d.x, f.smile);
    jaw[i] = smooth(line, line - 0.03, d.y) * smooth(0.95, 0.42, Math.abs(d.x)) * smooth(-0.1, 0.3, d.z);
  }
  geometry.setAttribute("aRest", new THREE.BufferAttribute(rest, 3));
  geometry.setAttribute("aJaw", new THREE.BufferAttribute(jaw, 1));
  geometry.computeVertexNormals();
  return geometry;
}

// A layer over the skin: hair, a beard, a hat. Where `out` is zero it sinks just
// under the skin and can't be seen.
export type Shell = (x: number, y: number, z: number) => { out: number; down?: number };

export function shellGeometry(f: Face, shell: Shell, widthSegments = 170, heightSegments = 130) {
  const geometry = unitSphere(widthSegments, heightSegments);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const d = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    headPoint(d.x, d.y, d.z, f, p);
    const { out, down = 0 } = shell(d.x, d.y, d.z);
    n.copy(p).normalize();
    p.addScaledVector(n, out - 0.012 * (1 - smooth(0, 0.012, out)));
    p.y -= down;
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Hair grows above a hairline that drops towards the temples and round the back.
function hairMask(x: number, y: number, z: number, front: number) {
  const ax = Math.abs(x);
  // Nearly level across the forehead, falling only at the temples.
  const line = mix(-0.5, front - 0.16 * ax * ax - 0.62 * smooth(0.55, 1, ax), smooth(-0.35, 0.2, z));
  return smooth(line - 0.012, line + 0.03, y);
}

export const SHORT_HAIR: Shell = (x, y, z) => {
  const lumps = Math.sin(x * 9 + y * 4) * Math.sin(y * 8 - z * 5) * 0.007;
  return { out: hairMask(x, y, z, 0.58) * (0.034 + lumps) };
};

export const WILD_HAIR: Shell = (x, y, z) => {
  const tufts = Math.max(0, Math.sin(x * 19 + 1.3) * Math.sin(y * 17 + 2.1) * Math.sin(z * 18 + 0.4));
  const waves = 0.5 + 0.5 * Math.sin(x * 7 - y * 8 + z * 6);
  return { out: hairMask(x, y, z, 0.6) * (0.055 + waves * 0.05 + tufts ** 1.25 * 0.05) };
};

export const POINTED_BEARD: Shell = (x, y, z) => {
  const ax = Math.abs(x);
  // A rounded patch hugging the chin, not a bib.
  const reach = Math.hypot(ax / 0.36, (y + 0.86) / 0.25);
  const mask = smooth(1.06, 0.84, reach) * smooth(0.02, 0.22, z);
  const tip = mask * Math.exp(-((x / 0.22) ** 2)) * smooth(-0.7, -1, y);
  return { out: mask * 0.016 + tip * 0.03, down: tip * 0.12 };
};

// Crown of a knitted hat, with a thicker folded cuff above the brows.
export const BEANIE: Shell = (x, y) => {
  const mask = smooth(0.4, 0.42, y);
  const cuff = smooth(0.66, 0.62, y);
  return { out: mask * (0.04 + cuff * 0.024) };
};

export function eyeAnchor(f: Face, side: 1 | -1) {
  const x = side * 0.44;
  const y = 0.04;
  return headPoint(x, y, Math.sqrt(1 - x * x - y * y), f);
}

// A curve laid on the skin, from points given in face coordinates.
export function surfaceTube(f: Face, points: [number, number][], radius: number, lift = 0.006) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y]) => {
      const p = headPoint(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y)), f);
      p.z += lift;
      return p;
    }),
  );
  return new THREE.TubeGeometry(curve, 28, radius, 8, false);
}

export function browPoints(f: Face, side: 1 | -1): [number, number][] {
  const lift = side === 1 ? f.browLift : 0;
  return Array.from({ length: 7 }, (_, i) => {
    const s = i / 6;
    return [side * (0.17 + 0.46 * s), 0.2 + 0.04 * Math.sin(s * Math.PI * 0.92) + f.browTilt * 0.2 * (s - 0.5) + (f.browY + lift) / 0.45] as [number, number];
  });
}

export function lineTube(from: THREE.Vector3Tuple, to: THREE.Vector3Tuple, radius: number) {
  return new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(...from), new THREE.Vector3(...to)), 1, radius, 8, false);
}

// Neck and shoulders, turned on a lathe and pressed flat front to back.
export function neckGeometry() {
  const profile = [
    [0.118, 0.1],
    [0.116, -0.08],
    [0.122, -0.2],
    [0.135, -0.26],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(profile, 48);
}

export function shouldersGeometry() {
  const curve = new THREE.SplineCurve(
    [
      [0.13, -0.235],
      [0.17, -0.285],
      [0.28, -0.335],
      [0.42, -0.385],
      [0.52, -0.47],
      [0.56, -0.6],
      [0.57, -0.82],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
  );
  return new THREE.LatheGeometry(curve.getPoints(48), 96);
}
