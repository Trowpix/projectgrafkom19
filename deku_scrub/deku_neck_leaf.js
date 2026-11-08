const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];

function bezier([a, b, c, d], t) {
  const s = 1 - t;
  return a.map((x, i) =>
    s ** 3 * x + 3 * s * s * t * b[i] + 3 * s * t * t * c[i] + t ** 3 * d[i]
  );
}

export function generateDeku_NeckLeaf(i) {
  const length = i % 2 ? .65 : .76;
  const width = i % 2 ? .27 : .33;
  const bend = -.30;
  const color = i % 2 ? [.139, .39, .19] : [.206, .53, .22];

  // Dua tepi Bézier, kemudian isi permukaan di antaranya.
  const left = [
    [0, 0, 0], [-width, .16, length * .23],
    [-width, bend * .45, length * .71], [0, bend, length]
  ];
  const right = left.map(([x, y, z]) => [-x, y, z]);

  function point(v, u) {
    const p = mix(bezier(left, v), bezier(right, v), u);
    p[1] += .115 * Math.sin(Math.PI * v) * Math.pow(1 - Math.abs(2 * u - 1), 1.2);
    return p;
  }

  const rows = 30, cols = 18;
  const vertices = [], normals = [], colors = [], indices = [];

  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    const v = r / rows, u = c / cols;
    vertices.push(...point(v, u));

    const dv = sub(point(Math.min(1, v + .001), u), point(Math.max(0, v - .001), u));
    const du = sub(point(v, Math.min(1, u + .001)), point(v, Math.max(0, u - .001)));
    const n = cross(dv, du);
    const normalLength = Math.hypot(...n) || 1;
    normals.push(...n.map(x => x / normalLength));

    const edge = Math.abs(u - .5) * 2;
    const vein = Math.exp(-Math.pow((u - .5) * 32, 2));
    colors.push(...mix(color, [.54, .75, .18], .34 * v + .17 * vein - .09 * edge));
  }

  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const a = r * (cols + 1) + c, b = a + cols + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  return { vertices, normals, colors, indices };
}