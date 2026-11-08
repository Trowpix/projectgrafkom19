// Menyusun permukaan parametrik menjadi mesh segitiga.
export function grid(rows, cols, point, color, normal = () => [0, 1, 0]) {
  const vertices = [], normals = [], colors = [], indices = [];

  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const v = i / rows, u = j / cols;
    const p = point(v, u);
    const n = normal(p, v, u);
    const length = Math.hypot(...n) || 1;

    vertices.push(...p);
    normals.push(...n.map(x => x / length));
    colors.push(...(typeof color === 'function' ? color(p, v, u) : color));
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  return { vertices, normals, colors, indices };
}

export function ground() {
  return grid(
    30, 30,
    (v, u) => [(u - .5) * 24, -.025, (v - .5) * 22],
    ([x, , z]) => {
      const t = .5 + .5 * Math.sin(x * .7) * Math.cos(z * .6);
      return [.20 + t * .055, .32 + t * .09, .11 + t * .025];
    }
  );
}

export function ellipsoid(rx, ry, rz, color) {
  return grid(14, 24, (v, u) => {
    const a = (v - .5) * Math.PI, b = u * 2 * Math.PI;
    return [
      rx * Math.cos(a) * Math.cos(b),
      ry * Math.sin(a),
      rz * Math.cos(a) * Math.sin(b)
    ];
  }, color, ([x, y, z]) => [
    x / rx ** 2, y / ry ** 2, z / rz ** 2
  ]);
}

export function trunk() {
  return grid(8, 16, (v, u) => {
    const a = u * 2 * Math.PI;
    const r = .30 * (1 - .38 * v);
    return [r * Math.cos(a), v * 3.8, r * Math.sin(a)];
  }, (_, v, u) => {
    const shade = .84 + .16 * Math.sin(u * Math.PI * 12);
    return [
      (.28 + .04 * v) * shade,
      (.16 + .02 * v) * shade,
      .065 * shade
    ];
  }, ([x, , z]) => [x, .009, z]);
}

// Pita memanjang untuk jalan dan sungai.
// center(z) menentukan lekukan sepanjang jalur.
export function ribbon(center, halfWidth, y, color) {
  return grid(70, 1, (v, u) => {
    const z = 9 - v * 19;
    return [center(z) + (u * 2 - 1) * halfWidth, y, z];
  }, color);
}