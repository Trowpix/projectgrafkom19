"use strict";

const OctorokGeometry = {
  // Pembuat permukaan parametrik dan normal.
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

  cylinder(radius, height) {
    return this.surface(1, 40, (v, u) => [
      radius * Math.cos(u * 2 * Math.PI),
      (v - 0.5) * height,
      radius * Math.sin(u * 2 * Math.PI)
    ]);
  },

  // Elliptic paraboloid untuk bagian atas kepala.
  //
  // y = height * (1 - x²/rx² - z²/rz²)
  dome(rx, rz, height) {
    const mesh = this.surface(36, 64, (v, u) => {
      const a = u * 2 * Math.PI;

      return [
        rx * v * Math.cos(a),
        height * (1 - v * v),
        rz * v * Math.sin(a)
      ];
    }, true);

    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const n = [
        2 * height * mesh.vertices[i] / (rx * rx),
        1,
        2 * height * mesh.vertices[i + 2] / (rz * rz)
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

  // Ellipsoid terpotong untuk bagian bawah kepala.
  // cut menentukan tinggi batas potongnya.
  lowerHead(rx, ry, rz, cut = 0.525) {
    const mesh = this.surface(36, 64, (v, u) => {
      const a =
        -Math.PI / 2 +
        v * (Math.asin(cut) + Math.PI / 2);

      const b = u * 2 * Math.PI;

      return [
        rx * Math.cos(a) * Math.cos(b),
        ry * Math.sin(a),
        rz * Math.cos(a) * Math.sin(b)
      ];
    });

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

  // Hyperboloid satu lembar:
  //
  // (x² + y²)/a² - z²/c² = 1
  //
  // Bagian z >= 0 membuat moncong melebar ke depan.
  hyperboloid(a, c, length) {
    return this.surface(30, 48, (v, u) => {
      const z = v * length;
      const r = a * Math.sqrt(1 + (z / c) ** 2);
      const angle = u * 2 * Math.PI;

      return [
        r * Math.cos(angle),
        r * Math.sin(angle),
        z
      ];
    }, true);
  },

  // Cone dengan sumbu Y.
  cone(radius, height) {
    return this.surface(16, 32, (v, u) => {
      const r = radius * (1 - v);
      const a = u * 2 * Math.PI;

      return [
        r * Math.cos(a),
        height * v,
        r * Math.sin(a)
      ];
    });
  },

  disk(radius) {
    return this.surface(1, 48, (v, u) => [
      radius * v * Math.cos(u * 2 * Math.PI),
      radius * v * Math.sin(u * 2 * Math.PI),
      0
    ]);
  },

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

  // Tabung mengikuti kurva.
  // Digunakan untuk tentakel dan kelopak mata.
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

      const r = Math.max(
        0.002,
        radius * (1 - taper * t)
      );

      return p.map((x, i) =>
        x + r * (
          normal[i] * Math.cos(angle) +
          binormal[i] * Math.sin(angle)
        )
      );
    }, true);
  }
};