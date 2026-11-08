export function generateDeku_Eyes(tall) {
  const rx = tall ? .13 : .145;
  const ry = tall ? .208 : .181;
  const rz = .063; // Radius depan-belakang kecil supaya mata pipih.

  const rows = 32, cols = 48;
  const vertices = [], normals = [], colors = [], indices = [];

  for (let i = 0; i <= rows; i++) {
    const a = -Math.PI / 2 + Math.PI * (i / rows);

    for (let j = 0; j <= cols; j++) {
      const b = 2 * Math.PI * (j / cols);

      // Rumus ellipsoid mata.
      const x = rx * Math.cos(a) * Math.cos(b);
      const y = ry * Math.sin(a);
      const z = rz * Math.cos(a) * Math.sin(b);

      vertices.push(x, y, z);
      colors.push(1, .84, .21);

      const n = [x / rx ** 2, y / ry ** 2, z / rz ** 2];
      const length = Math.hypot(...n) || 1;
      normals.push(...n.map(k => k / length));
    }
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  return { vertices, normals, colors, indices };
}