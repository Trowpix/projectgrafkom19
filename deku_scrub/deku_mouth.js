const TAU = 2 * Math.PI;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Ketiga bagian mulut punya rumus bentuk sendiri,
// tetapi semuanya disusun menjadi mesh dengan cara ini.
function surface(rows, cols, point, { normal, color, flip = false }) {
  const vertices = [], normals = [], colors = [], indices = [];

  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const v = i / rows, u = j / cols, p = point(v, u);
    vertices.push(...p);

    const n = normal(p, v, u);
    const length = Math.hypot(...n) || 1;
    normals.push(...n.map(x => x / length));
    colors.push(...(typeof color === 'function' ? color(p, v, u) : color));
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(...(
      flip ? [a, a + 1, b, a + 1, b + 1, b] : [a, b, a + 1, a + 1, b, b + 1]
    ));
  }

  return { vertices, normals, colors, indices };
}

export function hyperboloidRadius(r0, r1, length, z) {
  return Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * (z / length) ** 2);
}

// Moncong: hyperboloid satu lembar, dipotong sepanjang sumbu Z.
export function generateDeku_Snout(r0, r1, length, inside = false) {
  const c2 = length ** 2 / ((r1 / r0) ** 2 - 1);
  const sign = inside ? -1 : 1;

  return surface(28, 48, (v, u) => {
    const z = length * v;
    const r = hyperboloidRadius(r0, r1, length, z);
    const a = TAU * u;
    return [r * Math.cos(a), r * Math.sin(a), z];
  }, {
    flip: !inside,
    normal: ([x, y, z]) => [
      sign * x / r0 ** 2,
      sign * y / r0 ** 2,
      -sign * z / c2
    ],
    color: (_, v) => inside
      ? mix([.025, .015, .009], [.15, .08, .037], v)
      : mix([.38, .20, .072], [.68, .43, .20], v)
  });
}

// Torus: cincin di ujung moncong.
export function generateDeku_MouthRim(radius, tube) {
  return surface(24, 48, (v, u) => {
    const a = TAU * u, b = TAU * v;
    const r = radius + tube * Math.cos(b);
    return [r * Math.cos(a), r * Math.sin(a), tube * Math.sin(b)];
  }, {
    flip: true,
    normal: (_, v, u) => [
      Math.cos(TAU * v) * Math.cos(TAU * u),
      Math.cos(TAU * v) * Math.sin(TAU * u),
      Math.sin(TAU * v)
    ],
    color: (_, v) => mix([.51, .286, .116], [.75, .484, .237], .5 + .5 * Math.sin(TAU * v))
  });
}

// Disk gelap di bagian belakang rongga mulut.
export function generateDeku_MouthHole(radius) {
  return surface(1, 48, (v, u) => [
    v * radius * Math.cos(TAU * u),
    v * radius * Math.sin(TAU * u),
    0
  ], {
    normal: () => [0, 0, 1],
    color: [.015, .011, .009]
  });
}