export function generateDeku_Body() {
  const [rx, ry, rz] = [.41, .43, .39];
  const dark = [.20, .102, .048], light = [.39, .24, .102];
  const rows = 32, cols = 48;
  const vertices = [], normals = [], colors = [], indices = [];

  for (let i = 0; i <= rows; i++) {
    const v = i / rows, a = -Math.PI / 2 + Math.PI * v;

    for (let j = 0; j <= cols; j++) {
      const b = 2 * Math.PI * (j / cols);

      // Rumus ellipsoid badan.
      const x = rx * Math.cos(a) * Math.cos(b);
      const y = ry * Math.sin(a);
      const z = rz * Math.cos(a) * Math.sin(b);
      vertices.push(x, y, z);

      const n = [x / rx ** 2, y / ry ** 2, z / rz ** 2];
      const length = Math.hypot(...n) || 1;
      normals.push(...n.map(k => k / length));
      colors.push(...dark.map((k, c) => k + (light[c] - k) * v));
    }
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  return { vertices, normals, colors, indices };
}