import { MyObject } from '../deku_scrub/myObject.js';
import * as G from './forestGeometry.js';

import {
  TINGGI_AIR,
  buatPermukaan,
  buatTebing,
  tinggiTanah
} from './islandTerrain.js';

import {
  createAirTerjun,
  createPermukaanAir
} from './waterModel.js';

const EMAS = [.97, .73, .17];
const EMAS_TUA = [.70, .42, .08];
const EMAS_MUDA = [1, .84, .31];

// Mahkota pohon dari beberapa gumpalan daun.
function buatMahkota(seed) {
  const besar = G.gumpalan(1.9, 1.35, 1.8, EMAS, EMAS_TUA, seed);
  const kecil = G.gumpalan(1.25, .95, 1.2, EMAS_MUDA, EMAS_TUA, seed + 2);

  return G.gabung([
    { mesh: besar, posisi: [0, .3, 0] },
    { mesh: kecil, posisi: [-1.55, -.1, .35] },
    { mesh: kecil, posisi: [1.5, .05, -.45] },
    { mesh: kecil, posisi: [.3, -.1, 1.45] },
    { mesh: kecil, posisi: [-.2, .1, -1.5] },
    { mesh: kecil, posisi: [.1, 1.25, .1] }
  ]);
}

// Bukit batu berlapis dengan puncak berwarna jingga.
function buatMesa() {
  const batu = G.gumpalan(3, 1.1, 2.5, [.60, .58, .47], [.40, .40, .34], 1);
  const batuAtas = G.gumpalan(2.3, .9, 2, [.63, .60, .48], [.42, .41, .35], 3);
  const lapisan = G.gumpalan(2.45, .34, 2.15, [.88, .58, .18], [.62, .42, .18], 5);
  const puncak = G.gumpalan(1.85, .3, 1.6, [.92, .62, .19], [.66, .44, .18], 2);

  return G.gabung([
    { mesh: batu, posisi: [0, .8, 0] },
    { mesh: lapisan, posisi: [.1, 1.72, 0] },
    { mesh: batuAtas, posisi: [.1, 2.35, 0] },
    { mesh: puncak, posisi: [.1, 3.15, 0] }
  ]);
}

function buatReruntuhan() {
  const batu = [.56, .59, .50];
  const batuTua = [.44, .49, .42];

  return G.gabung([
    { mesh: G.balok(.9, 4.2, .9, batu), posisi: [-2.3, 0, 0] },
    { mesh: G.balok(.9, 3.1, .9, batuTua), posisi: [2.3, 0, .2] },
    { mesh: G.balok(5.6, .7, 1.05, batu), posisi: [-.5, 3.5, 0] },
    { mesh: G.balok(1.2, 1, 1.1, batuTua), posisi: [3.9, 0, 1.2] },
    { mesh: G.balok(.75, 1.7, .75, batu), posisi: [.2, 0, -1.6] }
  ]);
}

function buatPulauJauh() {
  const warna = [.47, .68, .88];
  const lapis = (rx, ry, rz) => G.gumpalan(rx, ry, rz, warna, [.37, .57, .80], 2);

  return G.gabung([
    { mesh: lapis(6, 1.6, 5), posisi: [0, 0, 0] },
    { mesh: lapis(3.6, 3, 3.2), posisi: [0, -3, 0] },
    { mesh: lapis(1.5, 3.6, 1.4), posisi: [.3, -7, 0] },
    { mesh: lapis(2.4, 4.4, 2.2), posisi: [-1.2, 4, .2] }
  ]);
}

// Nama fungsi dipertahankan agar cocok dengan main.js.
export function createForest() {
  const root = new MyObject('pulau-melayang');

  function tambah(
    induk,
    nama,
    mesh = null,
    posisi = [0, 0, 0],
    skala = [1, 1, 1],
    material = { gloss: 0 }
  ) {
    const node = induk.add(new MyObject(nama, mesh, material));

    node.position = [...posisi];
    node.scale = [...skala];

    return node;
  }

  // Menempatkan objek tepat di permukaan tanah.
  const diTanah = (x, z, naik = 0) => [x, tinggiTanah(x, z) + naik, z];

  // ==================== PULAU ====================

  tambah(root, 'permukaan-pulau', buatPermukaan());
  tambah(root, 'tebing-pulau', buatTebing());

  // ===================== AIR =====================

  const air = createPermukaanAir();
  const terjun = createAirTerjun();

  tambah(root, 'air', air.mesh, undefined, undefined, {
    gloss: .85,
    emission: .22
  });

  tambah(root, 'air-terjun', terjun.mesh, undefined, undefined, {
    gloss: .2,
    emission: .45
  });

  const kabutMesh = G.gumpalan(
    1, 1, 1,
    [1, 1, 1],
    [.86, .93, .97],
    4
  );

  const materialAwan = { gloss: 0, emission: .86 };

  const kabut = [
    [-3.4, .4, 0, 2.4],
    [0, -.4, .6, 3.2],
    [3.4, .3, -.2, 2.3]
  ].map(([x, y, z, ukuran], i) => ({
    node: tambah(
      root,
      'kabut-' + i,
      kabutMesh,
      [terjun.ujung[0] + x, terjun.ujung[1] + y, terjun.ujung[2] + z],
      [ukuran, ukuran * .7, ukuran],
      materialAwan
    ),
    ukuran,
    fase: i * 1.9
  }));

  // ==================== POHON ====================

  const batang = G.trunk();
  const mahkota = [buatMahkota(0), buatMahkota(2.4)];
  const pucukPohon = [];

  // Sisi depan dikosongkan agar pandangan kamera tidak tertutup.
  // X, Z, ukuran.
  const daftarPohon = [
    [-18, -6, 1.05],
    [-12, -11, 1.25],
    [-5.5, -13, 1],
    [-2, -12.5, .85],
    [-19.5, -1, .8],
    [15.5, -2.5, 1.2],
    [19, 2.5, .85],
    [14, 9, 1.05],
    [17, -8, .95],
    [15, 11.2, .75]
  ];

  daftarPohon.forEach(([x, z, ukuran], i) => {
    const pohon = tambah(
      root,
      'pohon-' + i,
      null,
      diTanah(x, z, -.05),
      [ukuran, ukuran, ukuran]
    );

    pohon.rotation[1] = i * 1.7;

    tambah(pohon, 'batang', batang);

    const pivotDaun = tambah(
      pohon,
      'pivot-daun',
      mahkota[i % 2],
      [.55 * Math.sin(1.9), 6.1, 0]
    );

    pucukPohon.push(pivotDaun);
  });

  // ==================== SEMAK ====================

  const semak = G.gabung([
    { mesh: G.gumpalan(.95, .75, .9, EMAS_MUDA, EMAS_TUA, 1), posisi: [0, .5, 0] },
    { mesh: G.gumpalan(.6, .5, .6, EMAS, EMAS_TUA, 4), posisi: [.8, .32, .25] }
  ]);

  [
    [-16, -3.5],
    [-8, -6.5],
    [-3.5, -5],
    [12.5, 2.5],
    [16, 6],
    [-14, 10.5],
    [-6, 12.5],
    [-1, 15],
    [14, -12],
    [-20, 4]
  ].forEach(([x, z], i) => {
    const node = tambah(root, 'semak-' + i, semak, diTanah(x, z));
    node.rotation[1] = i * 2.2;
  });

  // ==================== BATU =====================

  const mesa = buatMesa();

  tambah(root, 'mesa-belakang', mesa, diTanah(-15.5, -10.5, -.3), [1.25, 1.25, 1.25])
    .rotation[1] = .5;

  tambah(root, 'mesa-kanan', mesa, diTanah(17.5, 7, -.3), [.95, 1, .95])
    .rotation[1] = 2.1;

  const batu = G.gumpalan(1, .7, .85, [.60, .59, .49], [.40, .41, .35], 2);

  [
    [-7.5, -5.5, .9],
    [-16, 6.5, .7],
    [12.3, -.5, .85],
    [-10, -7.5, 1.1],
    [1.5, -6.5, .75],
    [13.5, 5, .55],
    [-1.5, -3.8, .5]
  ].forEach(([x, z, ukuran], i) => {
    const node = tambah(
      root,
      'batu-' + i,
      batu,
      diTanah(x, z, ukuran * .25),
      [ukuran, ukuran, ukuran]
    );

    node.rotation[1] = i * 1.3;
  });

  tambah(root, 'reruntuhan', buatReruntuhan(), diTanah(-2.2, -8.8, -.1))
    .rotation[1] = .35;

  // Tiang batu yang tersisa di dalam danau.
  const tiang = G.balok(.8, 1.9, .8, [.56, .55, .42]);

  [[6, -8, 1], [8.8, -9.8, .75], [11.2, -6.4, .9]].forEach(([x, z, tinggi], i) => {
    tambah(root, 'tiang-danau-' + i, tiang, [x, -1.3, z], [1, tinggi, 1])
      .rotation[1] = i * .7 + .3;
  });

  // =================== TERATAI ===================

  const teratai = G.gumpalan(.85, .05, .85, [.36, .62, .30], [.24, .46, .22], 6);

  const daunTeratai = [
    [4.2, -9.3, 1],
    [7, -6.5, .8],
    [10.2, -10.8, 1.1],
    [12.3, -8, .9],
    [13.6, -10, .7],
    [3.4, -7.2, .7],
    [9.7, 7.4, .75],
    [8.6, 11.4, .85]
  ].map(([x, z, ukuran], i) => ({
    node: tambah(
      root,
      'teratai-' + i,
      teratai,
      [x, TINGGI_AIR + .05, z],
      [ukuran, 1, ukuran],
      { gloss: .25 }
    ),
    y: TINGGI_AIR + .05,
    fase: i * 1.3
  }));

  // =============== BATU MELAYANG ===============

  const batuMelayang = [
    [-22, -13, 10, 1.7],
    [20, -15, 12, 2.1],
    [15, -20, -9, 1.4],
    [-13, -18, -12, 1.9]
  ].map(([x, y, z, ukuran], i) => ({
    node: tambah(
      root,
      'batu-melayang-' + i,
      batu,
      [x, y, z],
      [ukuran, ukuran * 1.15, ukuran]
    ),
    y,
    fase: i * 2.1
  }));

  // ================== LATAR JAUH ==================

  const pulauJauh = buatPulauJauh();

  [
    [-92, 12, -120, 1.9],
    [108, -6, -140, 1.2],
    [-130, -14, -40, .9]
  ].forEach(([x, y, z, ukuran], i) => {
    tambah(root, 'pulau-jauh-' + i, pulauJauh, [x, y, z], [ukuran, ukuran, ukuran], {
      gloss: 0,
      emission: .9
    });
  });

  const gumpalanAwan = G.gumpalan(1, 1, 1, [1, 1, 1], [.80, .88, .96], 3);

  const awan = [
    [-54, -34, 10, .7],
    [50, -26, 14, .9],
    [34, -44, 50, .8],
    [-30, -46, -38, 1.2],
    [62, -40, -40, 1.2]
  ].map(([x, y, z, ukuran], i) => {
    const induk = tambah(root, 'awan-' + i, null, [x, y, z], [ukuran, ukuran, ukuran]);

    tambah(induk, 'awan-a', gumpalanAwan, [0, 0, 0], [13, 3.4, 8], materialAwan);
    tambah(induk, 'awan-b', gumpalanAwan, [-8, -.6, 2], [8, 2.4, 6], materialAwan);
    tambah(induk, 'awan-c', gumpalanAwan, [8.5, -.4, -1], [7, 2.8, 5.5], materialAwan);

    return { node: induk, x, fase: i * 2.4 };
  });

  // =================== CIPRATAN ===================

  const tetes = G.ellipsoid(.075, .10, .075, [.86, .96, .98]);

  const butir = Array.from({ length: 40 }, (_, i) => {
    const node = tambah(root, 'cipratan-' + i, tetes, undefined, [0, 0, 0], {
      gloss: .6,
      emission: .55
    });

    // Sudut emas membuat arah cipratan merata.
    const sudut = i * 2.399;
    const cepat = 2.6 + (i * 7 % 5) * .7;

    return {
      node,

      // Dimulai dari lingkaran agar tidak menutupi karakter.
      dx: Math.cos(sudut) * 1.5,
      dz: Math.sin(sudut) * 1.5,
      vx: Math.cos(sudut) * cepat,
      vz: Math.sin(sudut) * cepat,
      vy: 6.5 + (i * 11 % 7) * .75
    };
  });

  let daftarRiak = [];

  function perbaruiCipratan(waktu) {
    const umurHidup = 1.5;

    // Cipratan memakai kejadian terbaru yang masih berlangsung.
    const kejadian = daftarRiak.filter(r =>
      r.cipratan && waktu >= r.waktu && waktu < r.waktu + umurHidup
    ).pop();

    butir.forEach(({ node, dx, dz, vx, vy, vz }) => {
      if (!kejadian) {
        node.scale = [0, 0, 0];
        return;
      }

      const umur = waktu - kejadian.waktu;
      const kuat = kejadian.cipratan;
      const y = TINGGI_AIR + vy * kuat * umur - 11 * umur * umur;

      if (y < TINGGI_AIR - .05) {
        node.scale = [0, 0, 0];
        return;
      }

      const ukuran = .8 + kuat * .9;

      node.position = [
        kejadian.x + dx + vx * umur,
        y,
        kejadian.z + dz + vz * umur
      ];

      node.scale = [ukuran, ukuran, ukuran];
    });
  }

  return {
    root,
    tinggiTanah,
    TINGGI_AIR,

    // Dipanggil sekali oleh pengatur adegan.
    aturRiak(daftar) {
      daftarRiak = daftar;
    },

    update(waktu) {
      air.update(waktu, daftarRiak);
      terjun.update(waktu);
      perbaruiCipratan(waktu);

      // Mahkota pohon bergoyang pelan.
      pucukPohon.forEach((node, i) => {
        node.rotation[2] = .03 * Math.sin(waktu * .65 + i * 1.4);
        node.rotation[0] = .02 * Math.sin(waktu * .5 + i * 2.1);
      });

      daunTeratai.forEach(({ node, y, fase }) => {
        node.position[1] = y + .025 * Math.sin(waktu * 1.2 + fase);
        node.rotation[1] = .25 * Math.sin(waktu * .35 + fase);
      });

      kabut.forEach(({ node, ukuran, fase }) => {
        const denyut = ukuran * (1 + .10 * Math.sin(waktu * 1.8 + fase));

        node.scale = [denyut, denyut * .7, denyut];
      });

      batuMelayang.forEach(({ node, y, fase }) => {
        node.position[1] = y + .4 * Math.sin(waktu * .6 + fase);
        node.rotation[1] = waktu * .1 + fase;
      });

      awan.forEach(({ node, x, fase }) => {
        node.position[0] = x + 2.5 * Math.sin(waktu * .06 + fase);
      });
    },

    draw(renderer) {
      root.draw(renderer);
    }
  };
}
