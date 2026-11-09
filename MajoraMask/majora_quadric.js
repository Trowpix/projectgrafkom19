// Rumus kuadrik dari tabel materi. Sumbu utama setiap kuadrik adalah z.
// Normal dihitung dari gradien persamaan implisit, jadi tidak ada garis sambungan.
export function surface(rows, cols, [vMin, vMax], point, paint) {
  const vertices = [], normals = [], colors = [], indices = [];

  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const v = vMin + (vMax - vMin) * t;

    for (let j = 0; j <= cols; j++) {
      const u = -Math.PI + 2 * Math.PI * (j / cols);
      const { p, n } = point(u, v);
      const length = Math.hypot(...n) || 1;

      vertices.push(...p);
      normals.push(...n.map(k => k / length));
      colors.push(...paint(t, p));
    }
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  return { vertices, normals, colors, indices };
}

// x = a cos(v) cos(u), y = b cos(v) sin(u), z = c sin(v)
export function ellipsoid(a, b, c, paint, rows = 48, cols = 64) {
  return surface(rows, cols, [-Math.PI / 2, Math.PI / 2], (u, v) => {
    const p = [
      a * Math.cos(v) * Math.cos(u),
      b * Math.cos(v) * Math.sin(u),
      c * Math.sin(v)
    ];
    return { p, n: [p[0] / a ** 2, p[1] / b ** 2, p[2] / c ** 2] };
  }, paint);
}

// x = a sec(v) cos(u), y = b sec(v) sin(u), z = c tan(v)
export function hyperboloid(a, b, c, range, paint, rows = 16, cols = 64) {
  return surface(rows, cols, range, (u, v) => {
    const sec = 1 / Math.cos(v);
    const p = [a * sec * Math.cos(u), b * sec * Math.sin(u), c * Math.tan(v)];
    return { p, n: [p[0] / a ** 2, p[1] / b ** 2, -p[2] / c ** 2] };
  }, paint);
}

// x = a v cos(u), y = b v sin(u), z = c v
export function ellipticCone(a, b, c, range, paint, rows = 20, cols = 32) {
  return surface(rows, cols, range, (u, v) => ({
    p: [a * v * Math.cos(u), b * v * Math.sin(u), c * v],
    n: [Math.cos(u) / a, Math.sin(u) / b, -1 / c]
  }), paint);
}

// x = a v cos(u), y = b v sin(u), z = v^2
export function ellipticParaboloid(a, b, range, paint, rows = 10, cols = 24) {
  return surface(rows, cols, range, (u, v) => {
    const p = [a * v * Math.cos(u), b * v * Math.sin(u), v * v];
    return { p, n: [2 * p[0] / a ** 2, 2 * p[1] / b ** 2, -1] };
  }, paint);
}

// Rotasi Euler yang mengarahkan sumbu z lokal ke arah tertentu.
export function aimRotation([x, y, z]) {
  return [Math.asin(-y / Math.hypot(x, y, z)), Math.atan2(x, z), 0];
}
