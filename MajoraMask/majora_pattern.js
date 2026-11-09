import { aimRotation, ellipticCone, ellipticParaboloid, surface } from './majora_quadric.js';
import { maskFront, maskNormal } from './majora_mask.js';

const white = [.96, .96, .98];
const yellow = [.98, .82, .12];
const black = [.06, .05, .08];

// Garis wajah: kurva Bézier kubik 3D dengan empat titik kontrol [x, y].
// Kedalaman z tiap titik kontrol diambil dari permukaan topeng.
const lines = [
  { name: 'garis-dagu', color: white, width: .07, mirror: true, points: [[0, -.22], [.16, -.38], [.20, -.80], [.46, -.98]] },
  { name: 'garis-hidung', color: white, width: .06, mirror: true, points: [[.42, 1.18], [.12, 1.00], [.13, .45], [.07, -.04]] },
  { name: 'garis-hidung-bawah', color: white, width: .06, points: [[-.07, -.04], [-.03, -.09], [.03, -.09], [.07, -.04]] },
  { name: 'garis-hidung-dalam', color: black, width: .06, points: [[-.10, .80], [-.06, -.22], [.06, -.22], [.10, .80]] },
  { name: 'garis-pipi', color: white, width: .065, mirror: true, points: [[.98, -.36], [.50, -.40], [.30, -.75], [.58, -.92]] }
];

const lineLift = .012;

// Segitiga dahi: cone dengan 3 sisi; titik hitam: tutup paraboloid.
const triangles = [[.62, 1.02], [.96, 1.08], [1.30, 1.00]];
const dots = [
  [.09, -.16],
  [.075, -.52], [.075, -.66], [.075, -.80], [.075, -.94]
];

function surfaceStep(x, y, lift) {
  return { position: [x, y, maskFront(x, y) + lift], aim: aimRotation(maskNormal(x, y)) };
}

// B(t) = s^3 P0 + 3 s^2 t P1 + 3 s t^2 P2 + t^3 P3, dengan s = 1 - t.
function bezier([a, b, c, d], t) {
  const s = 1 - t;
  return a.map((k, i) =>
    s ** 3 * k + 3 * s * s * t * b[i] + 3 * s * t * t * c[i] + t ** 3 * d[i]
  );
}

function unit(v) {
  const length = Math.hypot(...v) || 1;
  return v.map(k => k / length);
}

function cross([ax, ay, az], [bx, by, bz]) {
  return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
}

// Tabung runcing yang mengikuti kurva Bézier di permukaan topeng.
function bezierLine(line, mirror) {
  const control = line.points.map(([x, y]) => [x * mirror, y, maskFront(x * mirror, y) + lineLift]);

  const path = v => {
    const p = bezier(control, v);

    // Topeng cembung, jadi kurva dijaga agar tidak tenggelam ke dalamnya.
    p[2] = Math.max(p[2], maskFront(p[0], p[1]) + lineLift);
    return p;
  };

  // Vertex dibuat relatif terhadap tengah kurva, titik acuan jarak pisah.
  const center = path(.5);

  const mesh = surface(36, 10, [0, 1], (u, v) => {
    const ahead = path(Math.min(1, v + .001)), behind = path(Math.max(0, v - .001));
    const tangent = unit(ahead.map((k, i) => k - behind[i]));
    const n = unit(cross(tangent, [0, 0, 1]));
    const b = cross(tangent, n);
    const direction = n.map((k, i) => k * Math.cos(u) + b[i] * Math.sin(u));
    const radius = line.width / 2 * Math.sqrt(Math.sin(Math.PI * v));
    const point = path(v);

    return { p: point.map((k, i) => k - center[i] + radius * direction[i]), n: direction };
  }, () => line.color);

  return {
    name: line.name + (mirror > 0 ? '' : '-kiri'),
    mesh,
    position: center,
    rotation: [0, 0, 0],
    scale: [1, 1, 1]
  };
}

// Garis tipis sepanjang sumbu z lokal, penanda sumbu.
export function generateMajora_AxisLine(color, halfLength = 4.5, radius = .02) {
  return surface(1, 16, [-1, 1], (u, v) => ({
    p: [radius * Math.cos(u), radius * Math.sin(u), halfLength * v],
    n: [Math.cos(u), Math.sin(u), 0]
  }), () => color);
}

export function generateMajora_FacePatterns() {
  const triangle = ellipticCone(.15, .15, .04, [0, 1], () => yellow, 1, 3);
  const stud = ellipticParaboloid(.32, .32, [0, .2], () => black);
  const patterns = [];

  for (const line of lines) {
    for (const mirror of line.mirror ? [1, -1] : [1]) {
      patterns.push(bezierLine(line, mirror));
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
