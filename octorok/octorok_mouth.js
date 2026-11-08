function surface(rows, cols, point, normal, color) {
  const vertices = [], normals = [], colors = [], indices = [];

  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const v = i / rows, u = j / cols;
    const p = point(v, u);
    const n = normal(p, v, u);
    const length = Math.hypot(...n) || 1;

    vertices.push(...p);
    normals.push(...n.map(x => x / length));
    colors.push(...color);
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  return { vertices, normals, colors, indices };
}

export function generateOctorok_Snout(inside = false) {
  // Hyperboloid satu lembar: (x² + y²)/a² - z²/c² = 1.
  const a = inside ? .10 : .14;
  const c = .28, length = .53;
  const sign = inside ? -1 : 1;

  return surface(28, 48, (v, u) => {
    const z = v * length;
    const r = a * Math.sqrt(1 + (z / c) ** 2);
    const angle = u * 2 * Math.PI;

    return [r * Math.cos(angle), r * Math.sin(angle), z];
  }, ([x, y, z]) => [
    sign * x / a ** 2,
    sign * y / a ** 2,
    -sign * z / c ** 2
  ], inside ? [.26, .035, .009] : [.97, .13, .025]);
}

export function generateOctorok_MouthRim() {
  return surface(24, 48, (v, u) => {
    const a = u * 2 * Math.PI, b = v * 2 * Math.PI;
    const r = .285 + .075 * Math.cos(b);

    return [r * Math.cos(a), r * Math.sin(a), .075 * Math.sin(b)];
  }, (_, v, u) => [
    Math.cos(v * 2 * Math.PI) * Math.cos(u * 2 * Math.PI),
    Math.cos(v * 2 * Math.PI) * Math.sin(u * 2 * Math.PI),
    Math.sin(v * 2 * Math.PI)
  ], [1, .17, .035]);
}

export function generateOctorok_MouthHole() {
  return surface(1, 48, (v, u) => [
    .195 * v * Math.cos(u * 2 * Math.PI),
    .195 * v * Math.sin(u * 2 * Math.PI),
    0
  ], () => [0, 0, 1], [.012, .008, .006]);
}