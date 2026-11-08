import { ellipsoid, ellipticCone } from './majora_quadric.js';

const lobe = { x: .78, y: .62, rx: 1.02, ry: .98, rz: .46 };
const face = { y: .05, rx: 1.12, ry: 1.15, rz: .60 };
const chin = { apexY: -1.85, height: 2.25, rx: 1.55, rz: .56, top: .68 };
const backColor = [.18, .08, .26];

// Dua lobus atas topeng, ungu gelap ke arah tepi.
export function generateMajora_Lobe() {
  return ellipsoid(lobe.rx, lobe.ry, lobe.rz, (t, [x, y, z]) => {
    if (z < 0) return backColor;

    const k = .72 + .28 * Math.max(0, 1 - Math.hypot(x / lobe.rx, y / lobe.ry));
    return [.46 * k, .13 * k, .68 * k];
  });
}

// Bagian tengah wajah.
export function generateMajora_Face() {
  return ellipsoid(face.rx, face.ry, face.rz, (t, [x, y, z]) => {
    if (z < 0) return backColor;

    const k = .78 + .22 * Math.max(0, 1 - Math.hypot(x / face.rx, y / face.ry));
    return [.86 * k, .08 * k, .26 * k];
  });
}

// Dagu runcing: titik puncak cone berada di ujung bawah topeng.
// Pangkalnya berhenti di dalam ellipsoid wajah agar tidak terlihat.
export function generateMajora_Chin() {
  return ellipticCone(chin.rx, chin.rz, chin.height, [0, chin.top], (t, [, y]) => {
    if (y > 0) return backColor; // Setelah rotasi, y lokal positif menghadap belakang.

    const k = .62 + .32 * t;
    return [.86 * k, .08 * k, .26 * k];
  }, 24, 64);
}

export const chinPlacement = { position: [0, chin.apexY, 0], rotation: [-Math.PI / 2, 0, 0] };
export const lobePlacement = side => [side * lobe.x, lobe.y, 0];
export const facePlacement = [0, face.y, 0];

function capZ(x, y, cx, cy, rx, ry, rz) {
  const d = 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2;
  return d > 0 ? rz * Math.sqrt(d) : 0;
}

// Kedalaman permukaan depan topeng pada koordinat (x, y).
export function maskFront(x, y) {
  const t = (y - chin.apexY) / chin.height;
  const cone = t > 0 && t <= chin.top ? capZ(x, 0, 0, 0, chin.rx * t, 1, chin.rz * t) : 0;

  return Math.max(
    cone,
    capZ(x, y, 0, face.y, face.rx, face.ry, face.rz),
    capZ(x, y, lobe.x, lobe.y, lobe.rx, lobe.ry, lobe.rz),
    capZ(x, y, -lobe.x, lobe.y, lobe.rx, lobe.ry, lobe.rz)
  );
}

export function maskNormal(x, y) {
  const e = .01;
  return [
    (maskFront(x - e, y) - maskFront(x + e, y)) / (2 * e),
    (maskFront(x, y - e) - maskFront(x, y + e)) / (2 * e),
    1
  ];
}
