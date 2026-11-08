// Matriks column-major; posisi vertex adalah vektor kolom.
const I = () => new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
]);

const mul = (a, b) => {
  const m = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++)
        m[4 * c + r] += a[4 * k + r] * b[4 * c + k];
  return m;
};

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];

const unit = a => {
  const l = Math.hypot(...a) || 1;
  return a.map(v => v / l);
};

const translation = ([x, y, z]) => {
  const m = I();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
};

const scaling = ([x, y, z]) => {
  const m = I();
  m[0] = x;
  m[5] = y;
  m[10] = z;
  return m;
};

function axisAngle(axis, a) {
  if (!Math.hypot(...axis)) return I();
  const [x, y, z] = unit(axis);
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c;

  return new Float32Array([
    c + x * x * t, y * x * t + z * s, z * x * t - y * s, 0,
    x * y * t - z * s, c + y * y * t, z * y * t + x * s, 0,
    x * z * t + y * s, y * z * t - x * s, c + z * z * t, 0,
    0, 0, 0, 1
  ]);
}

function compose(p, r, s, axis = [0, 1, 0], angle = 0) {
  const euler = mul(
    axisAngle([0, 1, 0], r[1]),
    mul(axisAngle([1, 0, 0], r[0]), axisAngle([0, 0, 1], r[2]))
  );
  return mul(translation(p), mul(euler, mul(axisAngle(axis, angle), scaling(s))));
}

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
}

function lookAt(eye, target) {
  const z = unit(sub(eye, target));
  const x = unit(cross([0, 1, 0], z));
  const y = cross(z, x);

  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
  ]);
}

// Inverse-transpose bagian linear agar pencahayaan tetap benar saat scaling.
function normalMatrix(m) {
  const a = Array.from(m.slice(0, 3));
  const b = Array.from(m.slice(4, 7));
  const c = Array.from(m.slice(8, 11));
  const cols = [cross(b, c), cross(c, a), cross(a, b)];
  const d = dot(a, cols[0]);

  return new Float32Array(
    Math.abs(d) < 1e-9
      ? [1, 0, 0, 0, 1, 0, 0, 0, 1]
      : cols.flat().map(v => v / d)
  );
}

export const LIBS = {
  identity: I, multiply: mul, compose, axisAngle, perspective,
  lookAt, normalMatrix, unit, cross, sub, dot
};