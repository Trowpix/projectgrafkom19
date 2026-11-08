const unit = a => {
  const length = Math.hypot(...a) || 1;
  return a.map(x => x / length);
};

const RED = [.98, .15, .025];
const YELLOW = [.94, .87, .25];

const END_RADIUS = .18 * (1 - .38);
const TIP_HEIGHT = .31;

function addFaces(indices, rows, cols) {
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + cols + 1;

      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
}

// Menghaluskan perubahan radius menjelang ujung cone.
function radiusAt(t) {
  if (t <= .75) {
    return .18 * (1 - .38 * t);
  }

  const span = .25;
  const s = (t - .75) / span;
  const start = .18 * (1 - .38 * .75);

  const d0 = -.18 * .38;
  const endSpeed = 3 * Math.hypot(.27, .21);
  const d1 = -END_RADIUS / TIP_HEIGHT * endSpeed;

  // Interpolasi Hermite untuk menyamakan kemiringan sambungan.
  return (
    (2 * s ** 3 - 3 * s * s + 1) * start +
    (s ** 3 - 2 * s * s + s) * span * d0 +
    (-2 * s ** 3 + 3 * s * s) * END_RADIUS +
    (s ** 3 - s * s) * span * d1
  );
}

export function generateOctorok_Tentacle() {
  const points = [
    [0, 0, 0],
    [0, -.34, .35],
    [0, -.61, .78],
    [0, -.34, .99]
  ];

  // Posisi sepanjang kurva Bézier.
  const at = t => {
    const s = 1 - t;

    return [0, 1, 2].map(k =>
      s ** 3 * points[0][k] +
      3 * s * s * t * points[1][k] +
      3 * s * t * t * points[2][k] +
      t ** 3 * points[3][k]
    );
  };

  // Turunan Bézier untuk menentukan arah tentakel.
  const derivative = t => {
    const s = 1 - t;

    return [0, 1, 2].map(k =>
      3 * s * s * (points[1][k] - points[0][k]) +
      6 * s * t * (points[2][k] - points[1][k]) +
      3 * t * t * (points[3][k] - points[2][k])
    );
  };

  const vertices = [];
  const normals = [];
  const colors = [];
  const indices = [];

  const rows = 64;
  const cols = 32;

  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= cols; j++) {
      const v = i / rows;
      const angle = j / cols * 2 * Math.PI;

      const p = at(v);
      const velocity = derivative(v);
      const tangent = unit(velocity);

      const a = [1, 0, 0];
      const b = [0, tangent[2], -tangent[1]];

      const direction = a.map((x, k) =>
        x * Math.cos(angle) + b[k] * Math.sin(angle)
      );

      const radius = radiusAt(v);

      vertices.push(
        ...p.map((x, k) => x + radius * direction[k])
      );

      // Normal memperhitungkan penyempitan radius.
      const low = Math.max(0, v - .0001);
      const high = Math.min(1, v + .0001);

      const slope = v === 1
        ? END_RADIUS / TIP_HEIGHT
        : -(radiusAt(high) - radiusAt(low)) /
          (high - low) /
          Math.hypot(...velocity);

      normals.push(
        ...unit(direction.map((x, k) =>
          x + slope * tangent[k]
        ))
      );

      // Gradasi merah → oranye → kuning.
      const blend = Math.max(
        0,
        Math.min(1, (v - .55) / .45)
      );

      const smooth = blend * blend * (3 - 2 * blend);

      colors.push(
        ...RED.map((x, k) =>
          x + (YELLOW[k] - x) * smooth
        )
      );
    }
  }

  addFaces(indices, rows, cols);

  return { vertices, normals, colors, indices };
}

export function generateOctorok_Tip() {
  const vertices = [];
  const normals = [];
  const colors = [];
  const indices = [];

  const rows = 12;
  const cols = 32;

  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= cols; j++) {
      const v = i / rows;
      const angle = j / cols * 2 * Math.PI;

      // Cone dengan radius dasar sama seperti ujung tentakel.
      vertices.push(
        END_RADIUS * (1 - v) * Math.cos(angle),
        TIP_HEIGHT * v,
        END_RADIUS * (1 - v) * Math.sin(angle)
      );

      normals.push(
        ...unit([
          Math.cos(angle),
          END_RADIUS / TIP_HEIGHT,
          Math.sin(angle)
        ])
      );

      colors.push(...YELLOW);
    }
  }

  addFaces(indices, rows, cols);

  return { vertices, normals, colors, indices };
}

export function setupTentacleSkin(mesh, LIBS) {
  const points = [
    [0, 0, 0],
    [0, -.34, .35],
    [0, -.61, .78],
    [0, -.34, .99]
  ];

  const at = t => {
    const s = 1 - t;

    return [0, 1, 2].map(k =>
      s ** 3 * points[0][k] +
      3 * s * s * t * points[1][k] +
      3 * s * t * t * points[2][k] +
      t ** 3 * points[3][k]
    );
  };

  // Posisi awal tiga joint pada jalur tentakel.
  const bind = [at(0), at(1 / 3), at(2 / 3)];
  const end = at(1);

  const original = mesh.vertices.slice();
  const originalNormals = mesh.normals.slice();

  // Generator tentakel versi gradasi memakai 32 kolom.
  const columns = 33;
  const rows = mesh.vertices.length / 3 / columns - 1;

  mesh.dynamic = true;

  function deform(joints) {
    const local = [];
    const skin = [];

    for (let j = 0; j < 3; j++) {
      local[j] = j === 0
        ? joints[j].localMatrix()
        : LIBS.multiply(
            local[j - 1],
            joints[j].localMatrix()
          );

      const inverseBind = LIBS.compose(
        bind[j].map(x => -x),
        [0, 0, 0],
        [1, 1, 1]
      );

      skin[j] = LIBS.multiply(local[j], inverseBind);
    }

    for (let k = 0; k < original.length; k += 3) {
      const t = Math.floor(k / 3 / columns) / rows;
      const segment = Math.min(1, Math.floor(t * 3));
      const s = Math.min(1, t * 3 - segment);

      // Baurkan pengaruh dua joint agar tekukan tidak patah.
      const blend = s * s * (3 - 2 * s);
      const weights = [1 - blend, blend];
      const ids = [segment, segment + 1];

      const position = [0, 0, 0];
      const normal = [0, 0, 0];

      for (let q = 0; q < 2; q++) {
        const m = skin[ids[q]];
        const weight = weights[q];

        for (let r = 0; r < 3; r++) {
          position[r] += weight * (
            m[r] * original[k] +
            m[4 + r] * original[k + 1] +
            m[8 + r] * original[k + 2] +
            m[12 + r]
          );

          normal[r] += weight * (
            m[r] * originalNormals[k] +
            m[4 + r] * originalNormals[k + 1] +
            m[8 + r] * originalNormals[k + 2]
          );
        }
      }

      const length = Math.hypot(...normal) || 1;

      for (let r = 0; r < 3; r++) {
        mesh.vertices[k + r] = position[r];
        mesh.normals[k + r] = normal[r] / length;
      }
    }
  }

  return { bind, end, deform };
}