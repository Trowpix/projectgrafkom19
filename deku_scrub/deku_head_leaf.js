const TAU = 2 * Math.PI;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const sub = (a, b) => a.map((x, i) => x - b[i]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];

function surface(rows, cols, point, { normal, color, flip = false, keep }) {
  const vertices = [], normals = [], colors = [], indices = [];

  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const v = i / rows, u = j / cols, p = point(v, u);
    vertices.push(...p);

    const dv = sub(point(Math.min(1, v + .001), u), point(Math.max(0, v - .001), u));
    const du = sub(point(v, Math.min(1, u + .001)), point(v, Math.max(0, u - .001)));
    const n = normal ? normal(p, v, u) : cross(dv, du).map(x => flip ? -x : x);
    const length = Math.hypot(...n) || 1;

    normals.push(...n.map(x => x / length));
    colors.push(...(typeof color === 'function' ? color(p, v, u) : color));
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    if (keep && !keep((i + .5) / rows, (j + .5) / cols)) continue;

    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(...(
      flip ? [a, a + 1, b, a + 1, b + 1, b] : [a, b, a + 1, a + 1, b, b + 1]
    ));
  }

  return { vertices, normals, colors, indices };
}

function bezier([a, b, c, d], t) {
  const s = 1 - t;
  return a.map((x, i) =>
    s ** 3 * x + 3 * s * s * t * b[i] + 3 * s * t * t * c[i] + t ** 3 * d[i]
  );
}

// Kiri: daun memanjang dengan dua tepi Bézier.
export function generateDeku_HeadLeafKiri(i = 0) {
  const length = i % 2 ? .82 : 1.15;
  const width = i % 2 ? .32 : .30;
  const bend = -.09;
  const color = [.19, .55, .26];
  const left = [
    [0, 0, 0], [-width, .16, length * .23],
    [-width, bend * .45, length * .71], [0, bend, length]
  ];
  const right = left.map(([x, y, z]) => [-x, y, z]);

  return surface(30, 18, (v, u) => {
    const p = mix(bezier(left, v), bezier(right, v), u);
    p[1] += .115 * Math.sin(Math.PI * v) * Math.pow(1 - Math.abs(2 * u - 1), 1.2);
    return p;
  }, {
    color: (_, v, u) => {
      const edge = Math.abs(u - .5) * 2;
      const vein = Math.exp(-Math.pow((u - .5) * 32, 2));
      return mix(color, [.54, .75, .18], .34 * v + .17 * vein - .09 * edge);
    }
  });
}

// Tengah: daun besar dengan lubang dan lekukan di tepinya.
export function generateDeku_HeadLeafTengah() {
  const left = [[0, 0, 0], [-1.12, .41, 0], [-1.0, 1.24, 0], [-.30, 1.45, 0]];
  const right = [[0, 0, 0], [.97, .26, 0], [.79, 1.29, 0], [-.30, 1.45, 0]];

  const point = (v, u) => {
    const p = mix(bezier(left, v), bezier(right, v), u);
    p[2] = .16 * Math.sin(Math.PI * v) * (1 - Math.abs(2 * u - 1) ** 1.4)
      + .045 * p[0];
    return p;
  };

  return surface(180, 130, point, {
    flip: true,
    color: (_, v, u) => mix(
      [.18, .53, .21],
      [.63, .51, .205],
      v ** 4 + .22 * Math.exp(-((u - .50) ** 2) * 560)
    ),
    keep: (v, u) => {
      const [x, y] = point(v, u);
      const hole = ((x - .215) / .136) ** 2 + ((y - 1.04) / .145) ** 2 < 1;
      const notch = ((x + .72) / .37) ** 2 + ((y - 1.00) / .31) ** 2 < 1;
      const lowerNotch = ((x + .57) / .19) ** 2 + ((y - .40) / .12) ** 2 < 1;
      return !hole && !notch && !lowerNotch;
    }
  });
}

// Kanan: satu kuncup ellipsoid, dipasang dua kali di dekuModel.js.
export function generateDeku_HeadLeafKanan() {
  const [rx, ry, rz] = [.39, .41, .36];

  return surface(32, 48, (v, u) => {
    const a = -Math.PI / 2 + Math.PI * v, b = TAU * u;
    return [
      rx * Math.cos(a) * Math.cos(b),
      ry * Math.sin(a),
      rz * Math.cos(a) * Math.sin(b)
    ];
  }, {
    normal: ([x, y, z]) => [x / rx ** 2, y / ry ** 2, z / rz ** 2],
    color: (_, v, u) => {
      const phase = u * 3 + v * .65;
      const stripe = Math.pow(.5 + .5 * Math.cos(2 * Math.PI * phase), 22);
      return mix([.09, .30, .113], [.48, .74, .24], .55 * v + .24 * stripe);
    }
  });
}

// Tangkai berbentuk tabung. Ukurannya diatur saat dirakit.
export function generateDeku_Stem(radius, height) {
  return surface(5, 32, (v, u) => [
    radius * Math.cos(TAU * u),
    height * v,
    radius * Math.sin(TAU * u)
  ], {
    normal: ([x, , z]) => [x, 0, z],
    color: [.22, .49, .14]
  });
}