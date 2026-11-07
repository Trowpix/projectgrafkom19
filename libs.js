// Matriks menggunakan susunan column-major.
const identity = () => new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
]);

function multiply(a, b) {
  const result = new Float32Array(16);

  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) {
        result[col * 4 + row] +=
          a[k * 4 + row] * b[col * 4 + k];
      }
    }
  }

  return result;
}

const sub = (a, b) => a.map((value, i) => value - b[i]);

const dot = (a, b) =>
  a.reduce((sum, value, i) => sum + value * b[i], 0);

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];

function unit(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map(value => value / length);
}

function translation([x, y, z]) {
  const matrix = identity();

  matrix[12] = x;
  matrix[13] = y;
  matrix[14] = z;

  return matrix;
}

function scaling([x, y, z]) {
  const matrix = identity();

  matrix[0] = x;
  matrix[5] = y;
  matrix[10] = z;

  return matrix;
}

// Rotasi terhadap sumbu yang ditentukan.
function axisAngle(axis, angle) {
  if (!Math.hypot(...axis)) return identity();

  const [x, y, z] = unit(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;

  return new Float32Array([
    c + x * x * t,
    y * x * t + z * s,
    z * x * t - y * s,
    0,

    x * y * t - z * s,
    c + y * y * t,
    z * y * t + x * s,
    0,

    x * z * t + y * s,
    y * z * t - x * s,
    c + z * z * t,
    0,

    0, 0, 0, 1
  ]);
}

// Menggabungkan translasi, rotasi, dan skala.
function compose(position, rotation, scale, axis = [0, 1, 0], angle = 0) {
  const eulerRotation = multiply(
    axisAngle([0, 1, 0], rotation[1]),
    multiply(
      axisAngle([1, 0, 0], rotation[0]),
      axisAngle([0, 0, 1], rotation[2])
    )
  );

  return multiply(
    translation(position),
    multiply(
      eulerRotation,
      multiply(axisAngle(axis, angle), scaling(scale))
    )
  );
}

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);

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

// Inverse-transpose agar arah normal tetap benar saat scaling.
function normalMatrix(matrix) {
  const a = Array.from(matrix.slice(0, 3));
  const b = Array.from(matrix.slice(4, 7));
  const c = Array.from(matrix.slice(8, 11));

  const columns = [
    cross(b, c),
    cross(c, a),
    cross(a, b)
  ];

  const determinant = dot(a, columns[0]);

  if (Math.abs(determinant) < 1e-9) {
    return new Float32Array([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ]);
  }

  return new Float32Array(
    columns.flat().map(value => value / determinant)
  );
}

export const LIBS = {
  identity,
  multiply,
  compose,
  axisAngle,
  perspective,
  lookAt,
  normalMatrix,
  unit,
  cross,
  sub,
  dot
};