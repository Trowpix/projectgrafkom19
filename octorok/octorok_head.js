function surface(rows, cols, point, normal) {
  const vertices = [], normals = [], colors = [], indices = [];

  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const v = i / rows, u = j / cols;
    const p = point(v, u);
    const n = normal(p, v, u);
    const length = Math.hypot(...n) || 1;

    vertices.push(...p);
    normals.push(...n.map(x => x / length));
    colors.push(.96, .115, .035);
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  return { vertices, normals, colors, indices };
}

export function generateOctorok_HeadLower() {
  const rx = .94, ry = .76, rz = .79, cut = .52;

  return surface(36, 48, (v, u) => {
    const a = -Math.PI / 2 + v * (Math.asin(cut) + Math.PI / 2);
    const b = u * 2 * Math.PI;

    return [
      rx * Math.cos(a) * Math.cos(b),
      ry * Math.sin(a),
      rz * Math.cos(a) * Math.sin(b)
    ];
  }, ([x, y, z]) => [x / rx ** 2, y / ry ** 2, z / rz ** 2]);
}

export function generateOctorok_HeadUpper() {
  const cut = .52;
  const k = Math.sqrt(1 - cut * cut);
  const rx = .94 * k, rz = .79 * k;
  const height = .76 * (1 - cut * cut) / (2 * cut);

  return surface(32, 48, (v, u) => {
    const a = u * 2 * Math.PI;

    // Elliptic paraboloid: y = height * (1 - x²/rx² - z²/rz²).
    return [
      rx * v * Math.cos(a),
      height * (1 - v * v),
      rz * v * Math.sin(a)
    ];
  }, ([x, , z]) => [2 * height * x / rx ** 2, 1, 2 * height * z / rz ** 2]);
}

// Ellipsoid kecil untuk wajah di belakang mata dan moncong.
export function generateOctorok_Face() {
  return surface(28, 40, (v, u) => {
    const a = (v - .5) * Math.PI, b = u * 2 * Math.PI;

    return [
      .54 * Math.cos(a) * Math.cos(b),
      .46 * Math.sin(a),
      .49 * Math.cos(a) * Math.sin(b)
    ];
  }, ([x, y, z]) => [x / .54 ** 2, y / .46 ** 2, z / .49 ** 2]);
}