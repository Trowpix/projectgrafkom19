import { aimRotation, ellipsoid, ellipticCone, ellipticParaboloid } from './majora_quadric.js';
import { maskFront, maskNormal } from './majora_mask.js';

const white = [.96, .96, .98];
const yellow = [.98, .82, .12];
const black = [.06, .05, .08];

// Garis wajah: rantai ellipsoid tipis yang menempel pada permukaan topeng.
const lines = [
  { name: 'garis-dagu', color: white, width: .07, points: [[-.46, -.98], [-.24, -.66], [0, -.22], [.24, -.66], [.46, -.98]] },
  { name: 'garis-hidung', color: white, width: .06, points: [[-.42, 1.18], [-.16, .92], [-.10, .42], [-.07, -.04], [.07, -.04], [.10, .42], [.16, .92], [.42, 1.18]] },
  { name: 'garis-hidung-dalam', color: black, width: .06, points: [[-.10, .80], [-.04, .04], [.04, .04], [.10, .80]] }
];

const sideLines = [
  { name: 'garis-pipi', color: white, width: .065, points: [[.98, -.36], [.62, -.46], [.44, -.68], [.58, -.92]] }
];

// Segitiga dahi: cone dengan 3 sisi; titik hitam: tutup paraboloid.
const triangles = [[.62, 1.02], [.96, 1.08], [1.30, 1.00]];
const dots = [
  [.09, -.16],
  [.075, -.52], [.075, -.66], [.075, -.80], [.075, -.94]
];

function surfaceStep(x, y, lift) {
  return { position: [x, y, maskFront(x, y) + lift], aim: aimRotation(maskNormal(x, y)) };
}

function lineSegments(line, stroke, lift, mirror = 1) {
  return line.points.slice(1).map(([bx, by], i) => {
    const ax = line.points[i][0] * mirror, ay = line.points[i][1];
    const dx = bx * mirror - ax, dy = by - ay;
    const { position, aim } = surfaceStep(ax + dx / 2, ay + dy / 2, lift);

    return {
      name: line.name + '-' + (mirror > 0 ? '' : 'kiri-') + (i + 1),
      mesh: stroke,
      position,
      rotation: [aim[0], aim[1], Math.atan2(dy, dx)],
      scale: [Math.hypot(dx, dy) * .66, line.width / 2, .025]
    };
  });
}

export function generateMajora_FacePatterns() {
  const strokes = new Map([white, black].map(c => [c, ellipsoid(1, 1, 1, () => c, 10, 16)]));
  const triangle = ellipticCone(.15, .15, .04, [0, 1], () => yellow, 1, 3);
  const stud = ellipticParaboloid(.32, .32, [0, .2], () => black);
  const patterns = [];

  for (const line of lines) {
    patterns.push(...lineSegments(line, strokes.get(line.color), .012));
  }

  for (const line of sideLines) {
    for (const side of [-1, 1]) {
      patterns.push(...lineSegments(line, strokes.get(line.color), .012, side));
    }
  }

  for (const side of [-1, 1]) {
    triangles.forEach(([x, y], i) => {
      const { position, aim } = surfaceStep(side * x, y, .04);

      patterns.push({
        name: 'segitiga-' + side + '-' + (i + 1),
        mesh: triangle,
        position,
        // Puncak menghadap keluar; putaran 30 derajat membuat satu sudut menunjuk ke atas.
        rotation: [aim[0] + Math.PI, aim[1], -Math.PI / 6],
        scale: [1, 1, 1]
      });
    });

    dots.forEach(([x, y], i) => {
      const { position, aim } = surfaceStep(side * x, y, .035);

      patterns.push({
        name: 'titik-' + side + '-' + (i + 1),
        mesh: stud,
        position,
        rotation: [aim[0] + Math.PI, aim[1], 0],
        scale: [1, 1, 1]
      });
    });
  }

  return patterns;
}
