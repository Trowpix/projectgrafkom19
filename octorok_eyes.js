const unit = a => {
  const length = Math.hypot(...a) || 1;
  return a.map(x => x / length);
};

function surface(rows, cols, point, color) {
  const vertices = [], normals = [], colors = [], indices = [];

  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const v = i / rows, u = j / cols;
    const p = point(v, u);

    const a = point(Math.min(1, v + .001), u);
    const b = point(Math.max(0, v - .001), u);
    const c = point(v, Math.min(1, u + .001));
    const d = point(v, Math.max(0, u - .001));

    const x = a.map((q, k) => q - b[k]);
    const y = c.map((q, k) => q - d[k]);

    const n = unit([
      x[1] * y[2] - x[2] * y[1],
      x[2] * y[0] - x[0] * y[2],
      x[0] * y[1] - x[1] * y[0]
    ]);

    vertices.push(...p);
    normals.push(...n);
    colors.push(...color);
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  return { vertices, normals, colors, indices };
}

function ellipsoid(rx, ry, rz, color) {
  return surface(28, 40, (v, u) => {
    const a = (v - .5) * Math.PI, b = u * 2 * Math.PI;

    return [
      rx * Math.cos(a) * Math.cos(b),
      ry * Math.sin(a),
      rz * Math.cos(a) * Math.sin(b)
    ];
  }, color);
}

export function generateOctorok_Eye() {
  return ellipsoid(.222, .25, .145, [.98, .98, .92]);
}

export function generateOctorok_Pupil() {
  return ellipsoid(.141, .054, .025, [.018, .018, .018]);
}

export function generateOctorok_EyeFrame() {
  return surface(16, 40, (v, u) => {
    const a = u * 2 * Math.PI, b = v * 2 * Math.PI;
    const r = .241 + .046 * Math.cos(b);

    return [
      r * Math.cos(a),
      r * Math.sin(a),
      .046 * Math.sin(b)
    ];
  }, [.86, .075, .018]);
}

export function generateOctorok_Eyelid() {
  const points = [
    [-.25, .12, .04],
    [-.17, .35, .10],
    [.15, .34, .10],
    [.25, .12, .04]
  ];

  // Bézier kubik sebagai jalur kelopak.
  const at = t => {
    const s = 1 - t;
    return [0, 1, 2].map(k =>
      s ** 3 * points[0][k] +
      3 * s * s * t * points[1][k] +
      3 * s * t * t * points[2][k] +
      t ** 3 * points[3][k]
    );
  };

  return surface(32, 12, (v, u) => {
    const p = at(v);
    const a = at(Math.min(1, v + .001));
    const b = at(Math.max(0, v - .001));
    const tangent = unit(a.map((x, i) => x - b[i]));
    const n = unit([-tangent[1], tangent[0], 0]);

    const z = [
      tangent[1] * n[2] - tangent[2] * n[1],
      tangent[2] * n[0] - tangent[0] * n[2],
      tangent[0] * n[1] - tangent[1] * n[0]
    ];

    return p.map((x, i) =>
      x + .052 * (
        n[i] * Math.cos(u * 2 * Math.PI) +
        z[i] * Math.sin(u * 2 * Math.PI)
      )
    );
  }, [1, .19, .045]);
}