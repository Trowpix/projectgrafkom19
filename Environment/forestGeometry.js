// Menyusun permukaan parametrik menjadi mesh segitiga.
export function grid(rows, cols, point, color, normal = () => [0, 1, 0]) {
  const vertices = [], normals = [], colors = [], indices = [];

  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const v = i / rows, u = j / cols;
    const p = point(v, u);
    const n = normal(p, v, u);
    const length = Math.hypot(...n) || 1;

    vertices.push(...p);
    normals.push(...n.map(x => x / length));
    colors.push(...(typeof color === 'function' ? color(p, v, u) : color));
  }

  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }

  return { vertices, normals, colors, indices };
}

export function ground() {
  return grid(
    30, 30,
    (v, u) => [(u - .5) * 24, -.025, (v - .5) * 22],
    ([x, , z]) => {
      const t = .5 + .5 * Math.sin(x * .7) * Math.cos(z * .6);
      return [.20 + t * .055, .32 + t * .09, .11 + t * .025];
    }
  );
}

export function ellipsoid(rx, ry, rz, color) {
  return grid(14, 24, (v, u) => {
    const a = (v - .5) * Math.PI, b = u * 2 * Math.PI;
    return [
      rx * Math.cos(a) * Math.cos(b),
      ry * Math.sin(a),
      rz * Math.cos(a) * Math.sin(b)
    ];
  }, color, ([x, y, z]) => [
    x / rx ** 2, y / ry ** 2, z / rz ** 2
  ]);
}

// Batang ramping yang sedikit melengkung, setinggi 6.2 satuan.
export function trunk() {
  const lengkung = v => .55 * Math.sin(v * 1.9);

  return grid(14, 12, (v, u) => {
    const a = u * 2 * Math.PI;

    // Pangkal batang melebar seperti akar.
    const r = .20 + .16 * (1 - v) ** 5 - .08 * v;

    return [
      lengkung(v) + r * Math.cos(a),
      v * 6.2,
      r * Math.sin(a)
    ];
  }, (_, v, u) => {
    const shade = .84 + .16 * Math.sin(u * Math.PI * 12);
    return [
      (.42 + .06 * v) * shade,
      (.33 + .05 * v) * shade,
      .22 * shade
    ];
  }, ([x, , z], v) => [x - lengkung(v), .06, z]);
}

// Ellipsoid bergelombang untuk daun, batu, dan awan.
// Bagian bawah lebih gelap agar terlihat bervolume.
export function gumpalan(rx, ry, rz, warnaAtas, warnaBawah, seed = 0) {
  return grid(12, 18, (v, u) => {
    const a = (v - .5) * Math.PI;
    const b = u * 2 * Math.PI;

    const benjol =
      1 +
      .10 * Math.sin(b * 4 + seed) * Math.cos(a * 3 + seed) +
      .05 * Math.sin(b * 9 + seed * 2);

    return [
      rx * benjol * Math.cos(a) * Math.cos(b),
      ry * benjol * Math.sin(a),
      rz * benjol * Math.cos(a) * Math.sin(b)
    ];
  }, (_, v) => {
    const t = Math.min(1, v * 1.6);

    return warnaBawah.map(
      (nilai, i) => nilai + (warnaAtas[i] - nilai) * t
    );
  }, ([x, y, z]) => [
    x / rx ** 2, y / ry ** 2, z / rz ** 2
  ]);
}

// Balok untuk reruntuhan; pusat alasnya berada di y = 0.
export function balok(lebar, tinggi, tebal, warna) {
  const x = lebar / 2;
  const z = tebal / 2;

  const sisi = [
    [[-x, 0, z], [x, 0, z], [x, tinggi, z], [-x, tinggi, z], [0, 0, 1]],
    [[x, 0, -z], [-x, 0, -z], [-x, tinggi, -z], [x, tinggi, -z], [0, 0, -1]],
    [[x, 0, z], [x, 0, -z], [x, tinggi, -z], [x, tinggi, z], [1, 0, 0]],
    [[-x, 0, -z], [-x, 0, z], [-x, tinggi, z], [-x, tinggi, -z], [-1, 0, 0]],
    [[-x, tinggi, z], [x, tinggi, z], [x, tinggi, -z], [-x, tinggi, -z], [0, 1, 0]]
  ];

  const mesh = { vertices: [], normals: [], colors: [], indices: [] };

  sisi.forEach(([a, b, c, d, normal], i) => {
    for (const p of [a, b, c, d]) {
      mesh.vertices.push(...p);
      mesh.normals.push(...normal);
      mesh.colors.push(...warna);
    }

    const k = i * 4;
    mesh.indices.push(k, k + 1, k + 2, k, k + 2, k + 3);
  });

  return mesh;
}

// Menggabungkan beberapa mesh agar jumlah draw call tetap sedikit.
// Bagian: { mesh, posisi, skala }.
export function gabung(bagian) {
  const hasil = { vertices: [], normals: [], colors: [], indices: [] };

  for (const { mesh, posisi = [0, 0, 0], skala = [1, 1, 1] } of bagian) {
    const awal = hasil.vertices.length / 3;

    for (let i = 0; i < mesh.vertices.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        hasil.vertices.push(mesh.vertices[i + k] * skala[k] + posisi[k]);
        hasil.normals.push(mesh.normals[i + k] / skala[k]);
        hasil.colors.push(mesh.colors[i + k]);
      }
    }

    for (const indeks of mesh.indices) {
      hasil.indices.push(indeks + awal);
    }
  }

  return hasil;
}

// Pita memanjang untuk jalan dan sungai.
// center(z) menentukan lekukan sepanjang jalur.
export function ribbon(center, halfWidth, y, color) {
  return grid(70, 1, (v, u) => {
    const z = 9 - v * 19;
    return [center(z) + (u * 2 - 1) * halfWidth, y, z];
  }, color);
}