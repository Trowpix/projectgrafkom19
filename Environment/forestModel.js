import { MyObject } from '../deku_scrub/myObject.js';
import * as G from './forestGeometry.js';

// Membuat permukaan rumput dan lapisan batu di bawah pulau.
function buatPulau() {
  const mesh = {
    vertices: [],
    normals: [],
    colors: [],
    indices: []
  };

  const jumlahSisi = 48;

  // Titik pada keliling pulau.
  // Variasi radius membuat bentuknya sedikit tidak beraturan.
  function titik(i, radiusX, radiusZ, y) {
    const sudut = i / jumlahSisi * Math.PI * 2;

    const variasi =
      1 +
      .035 * Math.sin(sudut * 5) +
      .025 * Math.cos(sudut * 3);

    return [
      radiusX * Math.cos(sudut) * variasi,
      y,
      radiusZ * Math.sin(sudut) * variasi
    ];
  }

  // Setiap segitiga memiliki normal sendiri.
  // Hasilnya memberikan tampilan batu yang sedikit bersegi.
  function segitiga(a, b, c, warna) {
    const u = b.map((nilai, k) => nilai - a[k]);
    const v = c.map((nilai, k) => nilai - a[k]);

    const normal = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]
    ];

    const panjang = Math.hypot(...normal) || 1;
    const normalSatuan = normal.map(nilai => nilai / panjang);

    const awal = mesh.vertices.length / 3;

    for (const posisi of [a, b, c]) {
      mesh.vertices.push(...posisi);
      mesh.normals.push(...normalSatuan);
      mesh.colors.push(...warna);
    }

    mesh.indices.push(awal, awal + 1, awal + 2);
  }

  // Setiap lapisan berisi:
  // [radius X, radius Z, posisi Y, warna RGB].
  const lapisan = [
    [9.5, 6.6, -.04, [.34, .49, .17]],
    [9.5, 6.6, -.30, [.29, .39, .13]],
    [8.9, 6.1, -.75, [.43, .32, .20]],
    [7.4, 5.1, -1.85, [.36, .31, .25]],
    [4.7, 3.3, -3.15, [.30, .32, .30]],
    [1.8, 1.3, -4.15, [.25, .28, .27]]
  ];

  // Permukaan atas dibuat datar agar karakter mudah ditempatkan.
  for (let i = 0; i < jumlahSisi; i++) {
    const cerah = .97 + .03 * Math.sin(i * 1.7);

    segitiga(
      [0, -.04, 0],
      titik(i + 1, 9.5, 6.6, -.04),
      titik(i, 9.5, 6.6, -.04),
      [.34 * cerah, .49 * cerah, .17 * cerah]
    );
  }

  // Menghubungkan lapisan rumput, tanah, dan batu.
  for (let j = 0; j < lapisan.length - 1; j++) {
    const atas = lapisan[j];
    const bawah = lapisan[j + 1];

    for (let i = 0; i < jumlahSisi; i++) {
      const a = titik(i, atas[0], atas[1], atas[2]);
      const b = titik(i + 1, atas[0], atas[1], atas[2]);

      const c = titik(
        i + 1,
        bawah[0],
        bawah[1],
        bawah[2]
      );

      const d = titik(
        i,
        bawah[0],
        bawah[1],
        bawah[2]
      );

      const cerah =
        .91 + .09 * Math.sin(i * 2.3 + j);

      const warna = bawah[3].map(nilai => nilai * cerah);

      segitiga(a, b, c, warna);
      segitiga(a, c, d, warna);
    }
  }

  // Menutup bagian bawah menjadi ujung yang meruncing.
  for (let i = 0; i < jumlahSisi; i++) {
    segitiga(
      titik(i, 1.8, 1.3, -4.15),
      titik(i + 1, 1.8, 1.3, -4.15),
      [.25, -4.95, -.15],
      [.24, .26, .25]
    );
  }

  return mesh;
}

// Nama fungsi dipertahankan agar cocok dengan main.js.
export function createForest() {
  const root = new MyObject('pulau-melayang');

  function tambah(
    induk,
    nama,
    mesh = null,
    posisi = [0, 0, 0],
    skala = [1, 1, 1]
  ) {
    const node = induk.add(
      new MyObject(nama, mesh, { gloss: 0 })
    );

    node.position = [...posisi];
    node.scale = [...skala];

    return node;
  }

  tambah(
    root,
    'tanah-dan-dasar-pulau',
    buatPulau()
  );

  // ==================== POHON ====================

  const batang = G.trunk();

  const daunGelap = G.ellipsoid(
    1.35, .90, 1.18,
    [.19, .37, .14]
  );

  const daunTerang = G.ellipsoid(
    1.10, .78, 1.02,
    [.33, .51, .19]
  );

  const pucukPohon = [];

  // Pohon berada di sisi dan belakang.
  // Bagian tengah dibiarkan terbuka untuk karakter.
  const daftarPohon = [
    [-6.7, -2.7, .88],
    [-3.6, -4.5, .95],
    [.5, -4.9, .82],
    [4.4, -3.8, .96],
    [7.1, -1.7, .76]
  ];

  for (const [x, z, ukuran] of daftarPohon) {
    const pohon = tambah(
      root,
      'pohon',
      null,
      [x, -.04, z],
      [ukuran, ukuran, ukuran]
    );

    tambah(pohon, 'batang', batang);

    const pivotDaun = tambah(
      pohon,
      'pivot-daun',
      null,
      [0, 3.35, 0]
    );

    tambah(
      pivotDaun,
      'daun-tengah',
      daunGelap,
      [0, .30, 0]
    );

    tambah(
      pivotDaun,
      'daun-kiri',
      daunTerang,
      [-.72, -.05, .12]
    );

    tambah(
      pivotDaun,
      'daun-kanan',
      daunTerang,
      [.72, .10, -.12]
    );

    pucukPohon.push(pivotDaun);
  }

  // ==================== BATU ====================

  const batu = G.ellipsoid(
    1, 1, 1,
    [.44, .47, .42]
  );

  const lumut = G.ellipsoid(
    1, 1, 1,
    [.34, .44, .19]
  );

  // Posisi X, posisi Z, ukuran.
  const daftarBatu = [
    [-7.1, .5, 1.10],
    [6.3, 2.5, 1.15],
    [5.8, -2.0, .90],
    [-5.0, -3.0, .65],
    [-6.6, 2.4, .42],
    [-3.8, 3.9, .32],
    [.5, 4.5, .48],
    [4.8, 3.7, .36],
    [2.3, -3.2, .50]
  ];

  daftarBatu.forEach(([x, z, ukuran], i) => {
    const node = tambah(
      root,
      'batu-' + i,
      batu,
      [x, ukuran * .32 - .04, z],
      [
        ukuran,
        ukuran * .66,
        ukuran * .78
      ]
    );

    node.rotation[1] = i * .8;

    // Tambahkan lumut pada batu besar.
    if (ukuran > .8) {
      tambah(
        root,
        'lumut-' + i,
        lumut,
        [x, ukuran * .91 - .04, z],
        [
          ukuran * .68,
          ukuran * .10,
          ukuran * .52
        ]
      );
    }
  });

  // ==================== SEMAK ====================

  const semak = G.ellipsoid(
    .72, .47, .60,
    [.35, .52, .17]
  );

  const daftarSemak = [
    [-7.3, -1.2],
    [-4.5, -3.8],
    [2.7, -4.0],
    [7.0, .6],
    [5.4, 3.0]
  ];

  daftarSemak.forEach(([x, z], i) => {
    tambah(
      root,
      'semak-' + i,
      semak,
      [x, .23, z]
    );

    tambah(
      root,
      'semak-kecil-' + i,
      semak,
      [x + .5, .16, z + .15],
      [.65, .75, .70]
    );
  });

  // ==================== BUNGA ====================

  const bunga = G.ellipsoid(
    .09, .11, .09,
    [.96, .79, .31]
  );

  const daftarBunga = [
    [-6.2, 2.6],
    [-6.0, 2.9],
    [-5.8, 2.5],
    [4.7, 3.2],
    [4.9, 3.4],
    [5.1, 3.1]
  ];

  daftarBunga.forEach(([x, z], i) => {
    tambah(
      root,
      'bunga-' + i,
      bunga,
      [x, .08, z]
    );
  });

  // =============== BATU MELAYANG ===============

  const batuMelayang = [];

  const daftarBatuMelayang = [
    [-7.7, -2.0, 2.0, .65],
    [6.7, -2.6, 1.5, .80],
    [3.5, -4.7, -.8, .48]
  ];

  daftarBatuMelayang.forEach(([x, y, z, ukuran], i) => {
    const node = tambah(
      root,
      'batu-melayang-' + i,
      batu,
      [x, y, z],
      [
        ukuran,
        ukuran * 1.1,
        ukuran * .8
      ]
    );

    batuMelayang.push({
      node,
      y,
      fase: i * 2.1
    });
  });

  return {
    root,

    update(waktu) {
      // Daun pohon bergoyang pelan.
      pucukPohon.forEach((node, i) => {
        node.rotation[2] =
          .018 * Math.sin(waktu * .65 + i * 1.4);
      });

      // Batu di bawah pulau naik-turun dan berputar perlahan.
      batuMelayang.forEach(({ node, y, fase }) => {
        node.position[1] =
          y + .10 * Math.sin(waktu * .75 + fase);

        node.rotation[1] =
          waktu * .06 + fase;
      });
    },

    draw(renderer) {
      root.draw(renderer);
    }
  };
}