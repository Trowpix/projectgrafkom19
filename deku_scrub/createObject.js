"use strict";

const CreateObject = {
  // Membuat permukaan parametrik beserta normalnya.
  // keep() menentukan bagian yang digambar atau dilubangi.
  surface(
    rows,
    cols,
    point,
    reverse = false,
    keep = () => true
  ) {
    const vertices = [];
    const indices = [];

    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= cols; j++) {
        vertices.push(...point(i / rows, j / cols));
      }
    }

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (!keep(
          (i + 0.5) / rows,
          (j + 0.5) / cols
        )) {
          continue;
        }

        const a = i * (cols + 1) + j;
        const b = a + cols + 1;

        indices.push(...(
          reverse
            ? [a, a + 1, b, a + 1, b + 1, b]
            : [a, b, a + 1, a + 1, b, b + 1]
        ));
      }
    }

    const normals = new Array(vertices.length).fill(0);

    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = indices
        .slice(i, i + 3)
        .map(n => n * 3);

      const u = [0, 1, 2].map(
        k => vertices[b + k] - vertices[a + k]
      );

      const v = [0, 1, 2].map(
        k => vertices[c + k] - vertices[a + k]
      );

      const n = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
      ];

      for (const p of [a, b, c]) {
        for (let k = 0; k < 3; k++) {
          normals[p + k] += n[k];
        }
      }
    }

    for (let i = 0; i < normals.length; i += 3) {
      const size =
        Math.hypot(...normals.slice(i, i + 3)) || 1;

      for (let k = 0; k < 3; k++) {
        normals[i + k] /= size;
      }
    }

    return { vertices, normals, indices };
  },

  ellipsoid(rx, ry, rz) {
    const mesh = this.surface(28, 48, (v, u) => {
      const a = v * Math.PI - Math.PI / 2;
      const b = u * Math.PI * 2;

      return [
        rx * Math.cos(a) * Math.cos(b),
        ry * Math.sin(a),
        rz * Math.cos(a) * Math.sin(b)
      ];
    });

    // Normal analitis agar permukaan ellipsoid halus.
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const n = [
        mesh.vertices[i] / (rx * rx),
        mesh.vertices[i + 1] / (ry * ry),
        mesh.vertices[i + 2] / (rz * rz)
      ];

      const size = Math.hypot(...n);

      mesh.normals.splice(
        i,
        3,
        ...n.map(x => x / size)
      );
    }

    return mesh;
  },

  // Kepala organik.
  // taper besar membuat bagian atas lebih meruncing.
  head(rx, ry, rz, taper) {
    return this.surface(40, 64, (v, u) => {
      const a = (v - 0.5) * Math.PI;
      const b = u * 2 * Math.PI;

      const y = Math.sin(a);
      const r = Math.cos(a) * (1 - taper * y);

      return [
        rx * r * Math.cos(b),
        ry * y,
        rz * r * Math.sin(b)
      ];
    });
  },

  cylinder(radius, height) {
    return this.surface(1, 40, (v, u) => [
      radius * Math.cos(u * 2 * Math.PI),
      (v - 0.5) * height,
      radius * Math.sin(u * 2 * Math.PI)
    ]);
  },

  // Quadric paraboloid terpotong:
  // z = length * (x² + y² - r0²) / (r1² - r0²)
  paraboloid(r0, r1, length) {
    return this.surface(20, 48, (v, u) => {
      const r = r0 + (r1 - r0) * v;
      const a = u * 2 * Math.PI;

      return [
        r * Math.cos(a),
        r * Math.sin(a),
        length * (r * r - r0 * r0) /
          (r1 * r1 - r0 * r0)
      ];
    }, true);
  },

  disk(radius) {
    return this.surface(1, 48, (v, u) => [
      radius * v * Math.cos(u * 2 * Math.PI),
      radius * v * Math.sin(u * 2 * Math.PI),
      0
    ]);
  },

  // Torus digunakan sebagai bibir mulut.
  torus(radius, thickness) {
    return this.surface(16, 48, (v, u) => {
      const a = u * 2 * Math.PI;
      const b = v * 2 * Math.PI;

      const r = radius + thickness * Math.cos(b);

      return [
        r * Math.cos(a),
        r * Math.sin(a),
        thickness * Math.sin(b)
      ];
    }, true);
  },

  bezier(points, t) {
    const s = 1 - t;

    return [0, 1, 2].map(k =>
      s * s * s * points[0][k] +
      3 * s * s * t * points[1][k] +
      3 * s * t * t * points[2][k] +
      t * t * t * points[3][k]
    );
  },

  // Dua kurva Bézier menjadi tepi kiri dan kanan daun.
  // Arah panjang daun pada koordinat lokal adalah +Z.
  leaf(length, width, bend = -0.28) {
    const left = [
      [0, 0, 0],
      [-width, 0.12, length * 0.24],
      [-width, bend, length * 0.76],
      [0, bend, length]
    ];

    const right = left.map(p => [
      -p[0], p[1], p[2]
    ]);

    return this.surface(28, 10, (t, s) => {
      const a = this.bezier(left, t);
      const b = this.bezier(right, t);

      const fold =
        0.10 *
        Math.sin(Math.PI * t) *
        (1 - Math.abs(2 * s - 1));

      return [
        a[0] * (1 - s) + b[0] * s,
        a[1] + fold,
        a[2]
      ];
    });
  },

  // Daun besar milik karakter tengah.
  // Lubang dibuat dengan melewatkan segitiga tertentu.
  heroLeaf() {
    const left = [
      [0, 0, 0],
      [-1, 0.3, 0],
      [-0.84, 1.35, 0],
      [-0.3, 1.48, 0]
    ];

    const right = [
      [0, 0, 0],
      [0.95, 0.15, 0],
      [0.85, 1.2, 0],
      [-0.3, 1.48, 0]
    ];

    const point = (t, s) => {
      const a = this.bezier(left, t);
      const b = this.bezier(right, t);

      return [
        a[0] * (1 - s) + b[0] * s,
        a[1] * (1 - s) + b[1] * s,
        0.10 *
          Math.sin(Math.PI * t) *
          (1 - Math.abs(2 * s - 1))
      ];
    };

    return this.surface(
      80,
      60,
      point,
      true,
      (t, s) => {
        const [x, y] = point(t, s);

        const hole =
          ((x - 0.25) / 0.155) ** 2 +
          ((y - 0.99) / 0.16) ** 2 < 1;

        const bite =
          ((x + 0.62) / 0.36) ** 2 +
          ((y - 1.06) / 0.32) ** 2 < 1;

        const smallBite =
          ((x + 0.60) / 0.20) ** 2 +
          ((y - 0.40) / 0.18) ** 2 < 1;

        return !hole && !bite && !smallBite;
      }
    );
  },

  // Tabung mengikuti kurva Bézier atau fungsi path(t).
  // Digunakan untuk sulur, tangkai, dan urat daun.
  tube(path, radius, taper = 0) {
    const at = typeof path === "function"
      ? path
      : t => this.bezier(path, t);

    return this.surface(48, 10, (t, s) => {
      const p = at(t);
      const a = at(Math.max(0, t - 0.001));
      const b = at(Math.min(1, t + 0.001));

      const normalize = v => {
        const n = Math.hypot(...v) || 1;
        return v.map(x => x / n);
      };

      const cross = (u, v) => [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
      ];

      const tangent = normalize(
        b.map((x, i) => x - a[i])
      );

      const reference = Math.abs(tangent[1]) > 0.9
        ? [1, 0, 0]
        : [0, 1, 0];

      const normal = normalize(
        cross(tangent, reference)
      );

      const binormal = cross(tangent, normal);
      const angle = s * 2 * Math.PI;
      const r = Math.max(0.002, radius * (1 - taper * t));

      return p.map((x, i) =>
        x + r * (
          normal[i] * Math.cos(angle) +
          binormal[i] * Math.sin(angle)
        )
      );
    }, true);
  }
};