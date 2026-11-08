const TAU = 2 * Math.PI;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const sub = (a, b) => a.map((x, i) => x - b[i]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const unit = a => {
  const l = Math.hypot(...a) || 1;
  return a.map(v => v / l);
};

// Menyusun titik, normal, warna, dan indeks segitiga untuk bagian kepala.
function surface(rows, cols, point, { normal, color, flip = false }) {
  const vertices = [], normals = [], colors = [], indices = [];

  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const v = i / rows, u = j / cols, p = point(v, u);
    vertices.push(...p);

    const dv = sub(point(Math.min(1, v + .001), u), point(Math.max(0, v - .001), u));
    const du = sub(point(v, Math.min(1, u + .001)), point(v, Math.max(0, u - .001)));
    const n = normal ? normal(p, v, u) : cross(dv, du).map(x => flip ? -x : x);

    normals.push(...unit(n));
    colors.push(...(typeof color === 'function' ? color(p, v, u) : color));
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(...(
      flip ? [a, a + 1, b, a + 1, b + 1, b] : [a, b, a + 1, a + 1, b, b + 1]
    ));
  }

  return { vertices, normals, colors, indices };
}

function ellipsoid([rx, ry, rz], color, latMin = -Math.PI / 2, latMax = Math.PI / 2) {
  return surface(32, 48, (v, u) => {
    const a = latMin + (latMax - latMin) * v, b = TAU * u;
    return [
      rx * Math.cos(a) * Math.cos(b),
      ry * Math.sin(a),
      rz * Math.cos(a) * Math.sin(b)
    ];
  }, { normal: ([x, y, z]) => [x / rx ** 2, y / ry ** 2, z / rz ** 2], color });
}

function headColor(config) {
  const down = config.headR[1], up = config.topHeight ?? down;

  return ([x, y, z]) => {
    const a = Math.atan2(x, z);
    const streak = Math.pow(.5 + .5 * Math.sin(a * 13 + y * 1.3), 9);
    const t = Math.max(0, Math.min(1, (y + down) / (down + up)));

    return mix([.53, .328, .132], [.104, .123, .128], Math.pow(t, .69))
      .map(c => c * (1 - .16 * streak));
  };
}

export function generateDeku_HeadKiri(config) {
  const [rx, , rz] = config.headR;
  const up = config.topHeight;
  const wood = headColor(config);

  // Bawah: setengah ellipsoid. Atas: elliptic paraboloid.
  // Keduanya bertemu di y = 0.
  const bottom = ellipsoid(config.headR, wood, -Math.PI / 2, 0);
  const top = surface(38, 48, (v, u) => {
    const a = TAU * u;
    return [rx * v * Math.cos(a), up * (1 - v * v), rz * v * Math.sin(a)];
  }, {
    flip: true,
    color: wood,
    normal: ([x, , z], v) => [
      2 * up * x / rx ** 2,
      Math.min(1, (1 - v) * 10),
      2 * up * z / rz ** 2
    ]
  });

  return [
    { name: 'head-lower-ellipsoid', mesh: bottom },
    { name: 'head-upper-paraboloid', mesh: top }
  ];
}

export function generateDeku_HeadTengah(config) {
  return [{ name: 'head-ellipsoid', mesh: ellipsoid(config.headR, headColor(config)) }];
}

export function generateDeku_HeadKanan(config) {
  return [{ name: 'head-ellipsoid', mesh: ellipsoid(config.headR, headColor(config)) }];
}

// Menghitung Z permukaan depan untuk posisi mata dan moncong.
export function headFront(config, x, y) {
  const [rx, ry, rz] = config.headR;
  const h = config.variant === 'kiri' && y > 0
    ? y / config.topHeight
    : (y / ry) ** 2;

  return rz * Math.sqrt(Math.max(.01, 1 - (x / rx) ** 2 - h));
}

function bezier([a, b, c, d], t) {
  const s = 1 - t;
  return a.map((x, i) =>
    s ** 3 * x + 3 * s * s * t * b[i] + 3 * s * t * t * c[i] + t ** 3 * d[i]
  );
}

// Sulur pipi kiri: tabung runcing yang mengikuti kurva Bézier.
export function generateDeku_Cheek(side) {
  const points = [
    [side * .245, -.35, .66],
    [side * .58, -.49, .70],
    [side * 1.18, -.47, .49],
    [side * 1.13, .01, .37]
  ];

  return surface(30, 16, (v, u) => {
    const p = bezier(points, v);
    const d = unit(sub(
      bezier(points, Math.min(1, v + .001)),
      bezier(points, Math.max(0, v - .001))
    ));
    const n = unit(cross(d, [0, 0, 1]));
    const b = cross(d, n), a = TAU * u;
    const r = .09 * (1 - .97 * v);

    return p.map((x, i) => x + r * (n[i] * Math.cos(a) + b[i] * Math.sin(a)));
  }, { color: [.38, .68, .21], flip: true });
}