const unit = a => {
  const length = Math.hypot(...a) || 1;
  return a.map(x => x / length);
};

export function generateOctorok_Tentacle() {
  const points = [
    [0, 0, 0],
    [0, -.34, .35],
    [0, -.61, .78],
    [0, -.34, .99]
  ];

  const at = t => {
    const s = 1 - t;
    return [0, 1, 2].map(k =>
      s ** 3 * points[0][k] +
      3 * s * s * t * points[1][k] +
      3 * s * t * t * points[2][k] +
      t ** 3 * points[3][k]
    );
  };

  const vertices = [], normals = [], colors = [], indices = [];
  const rows = 40, cols = 16;

  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const v = i / rows, a = j / cols * 2 * Math.PI;
    const p = at(v);
    const q = at(Math.min(1, v + .001));
    const r = at(Math.max(0, v - .001));

    const t = unit(q.map((x, k) => x - r[k]));
    const n = [1, 0, 0];
    const b = [0, t[2], -t[1]];
    const radius = .18 * (1 - .38 * v);

    const direction = n.map((x, k) =>
      x * Math.cos(a) + b[k] * Math.sin(a)
    );

    vertices.push(...p.map((x, k) => x + radius * direction[k]));
    normals.push(...direction);
    colors.push(.98, .15, .025);
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  return { vertices, normals, colors, indices };
}

export function generateOctorok_Tip() {
  const vertices = [], normals = [], colors = [], indices = [];
  const rows = 12, cols = 32;
  const radius = .14, height = .31;

  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const v = i / rows, a = j / cols * 2 * Math.PI;

    // Radius berkurang sampai nol di puncak cone.
    vertices.push(
      radius * (1 - v) * Math.cos(a),
      height * v,
      radius * (1 - v) * Math.sin(a)
    );

    normals.push(...unit([Math.cos(a), radius / height, Math.sin(a)]));
    colors.push(.94, .87, .25);
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  return { vertices, normals, colors, indices };
}