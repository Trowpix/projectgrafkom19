import * as G from './forestGeometry.js';

// Ukuran pulau: setengah lebar (X) dan setengah panjang (Z).
export const RX = 23;
export const RZ = 17;

export const TINGGI_AIR = -.5;

// Tepi pulau dibagi menjadi blok-blok seperti kolom batu.
const JUMLAH_BLOK = 34;
const SEKTOR_PER_BLOK = 8;
export const JUMLAH_SEKTOR = JUMLAH_BLOK * SEKTOR_PER_BLOK;

// Sudut tempat sungai keluar dari pulau menjadi air terjun.
export const SUDUT_MUARA = 1.145;

const LEBAR_SUNGAI = 3;
const DANAU = { x: 9, z: -8, rx: 8.5, rz: 5.2 };

const TITIK_SUNGAI = [
  [9, -8],
  [8.2, -4.5],
  [6.8, -.5],
  [7, 2.5],
  [9, 6.5],
  [10.2, 10.5],
  [9.6, 14],
  [8.8, 20]
];

const jepit = x => Math.max(0, Math.min(1, x));

const halus = x => {
  const t = jepit(x);
  return t * t * (3 - 2 * t);
};

const campur = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Angka semu acak yang selalu sama untuk indeks yang sama.
function acak(n) {
  const x = Math.sin(n * 127.1 + 11.7) * 43758.5453;
  return x - Math.floor(x);
}

function selisihSudut(a, b) {
  const d = (a - b) % (Math.PI * 2);
  return Math.abs(d > Math.PI ? d - Math.PI * 2 : d < -Math.PI ? d + Math.PI * 2 : d);
}

// Jalur sungai dihaluskan dengan kurva Catmull-Rom.
const garisSungai = (() => {
  const hasil = [];

  for (let i = 0; i < TITIK_SUNGAI.length - 1; i++) {
    const p0 = TITIK_SUNGAI[Math.max(0, i - 1)];
    const p1 = TITIK_SUNGAI[i];
    const p2 = TITIK_SUNGAI[i + 1];
    const p3 = TITIK_SUNGAI[Math.min(TITIK_SUNGAI.length - 1, i + 2)];

    for (let k = 0; k < 12; k++) {
      const t = k / 12;

      hasil.push([0, 1].map(j =>
        .5 * (
          2 * p1[j] +
          (p2[j] - p0[j]) * t +
          (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t +
          (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t
        )
      ));
    }
  }

  hasil.push(TITIK_SUNGAI[TITIK_SUNGAI.length - 1]);
  return hasil;
})();

function jarakKeSungai(x, z) {
  let terdekat = Infinity;

  for (let i = 0; i < garisSungai.length - 1; i++) {
    const [ax, az] = garisSungai[i];
    const bx = garisSungai[i + 1][0] - ax;
    const bz = garisSungai[i + 1][1] - az;

    const t = jepit(
      ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz)
    );

    const jarak = (x - ax - bx * t) ** 2 + (z - az - bz * t) ** 2;

    if (jarak < terdekat) terdekat = jarak;
  }

  return Math.sqrt(terdekat);
}

// Negatif berarti titik berada di dalam sungai atau danau.
export function jarakAir(x, z) {
  const k = Math.hypot(
    (x - DANAU.x) / DANAU.rx,
    (z - DANAU.z) / DANAU.rz
  );

  return Math.min(
    jarakKeSungai(x, z) - LEBAR_SUNGAI,
    (k - 1) * Math.min(DANAU.rx, DANAU.rz)
  );
}

// Bukit kecil: x, z, radius, tinggi.
// Semuanya berada di luar jalur jalan karakter.
const BUKIT = [
  [-14, -9, 7, 1.2],
  [-4, -13, 5, .8],
  [17, 3, 6, 1.3],
  [-17, 9, 5, .5]
];

export function tinggiTanah(x, z) {
  const turun = 1 - halus((jarakAir(x, z) + .9) / 1.9);
  let bukit = 0;

  for (const [bx, bz, r, h] of BUKIT) {
    bukit += h * Math.exp(-((x - bx) ** 2 + (z - bz) ** 2) / (r * r));
  }

  return bukit * (1 - turun) - 1.7 * turun;
}

function faktorTepi(sektor) {
  const i = ((sektor % JUMLAH_SEKTOR) + JUMLAH_SEKTOR) % JUMLAH_SEKTOR;
  const a = i / JUMLAH_SEKTOR * Math.PI * 2;

  const gelombang =
    1 +
    .06 * Math.sin(a * 3 + .6) +
    .04 * Math.cos(a * 5 + 1.2);

  // Setiap blok menonjol berbeda, sisinya diberi alur tipis.
  const blok = Math.floor(i / SEKTOR_PER_BLOK);
  const alur = i % SEKTOR_PER_BLOK === 0 ? -.014 : 0;
  const tonjol = (acak(blok) - .6) * .1 + alur;

  // Tepi dibuat rata di muara agar air terjun tidak terpotong.
  const muara = halus((.34 - selisihSudut(a, SUDUT_MUARA)) / .08);

  return gelombang * (1 + tonjol * (1 - muara));
}

export function titikTepi(sektor) {
  const a = sektor / JUMLAH_SEKTOR * Math.PI * 2;
  const f = faktorTepi(sektor);

  return [RX * Math.cos(a) * f, RZ * Math.sin(a) * f];
}

// 0 di pusat pulau, 1 tepat di tepi.
export function posisiRadial(x, z) {
  const a = Math.atan2(z / RZ, x / RX);
  const sektor = Math.floor(a / (Math.PI * 2) * JUMLAH_SEKTOR);

  return Math.hypot(x / RX, z / RZ) / faktorTepi(sektor);
}

function warnaPermukaan(x, y, z, radial) {
  const bercak =
    .5 +
    .32 * Math.sin(x * .31 + 1.3) * Math.cos(z * .37) +
    .18 * Math.sin(x * .7 - z * .5);

  // Bintik kecil agar tanah tidak terlihat polos dari dekat.
  const bintik =
    .5 + .5 * Math.sin(x * 3.1 + Math.sin(z * 2.3) * 2) * Math.cos(z * 3.7 - x);

  let warna = campur(
    [.86, .58, .17],
    [.62, .44, .20],
    bercak * .75 + bintik * .25
  );

  // Rumput lebih hijau di dekat air.
  const d = jarakAir(x, z);
  warna = campur(warna, [.46, .54, .19], halus((5 - d) / 3.4) * .85);

  // Pasir di garis air, lumpur di bawahnya.
  warna = campur(warna, [.72, .64, .44], halus((.95 - d) / .6));
  warna = campur(warna, [.26, .36, .33], halus((TINGGI_AIR - y) / .5));

  // Bibir pulau berupa batu.
  const batasBatu = .945 + .018 * Math.sin(x * 1.7 + z * 1.3);
  warna = campur(warna, [.55, .54, .44], halus((radial - batasBatu) / .012));

  return warna;
}

export function buatPermukaan() {
  const posisi = (v, u) => {
    const [x, z] = titikTepi(Math.round(u * JUMLAH_SEKTOR));
    const px = x * v;
    const pz = z * v;

    return [px, tinggiTanah(px, pz), pz];
  };

  return G.grid(
    64,
    JUMLAH_SEKTOR,
    posisi,
    ([x, y, z], v) => warnaPermukaan(x, y, z, v),
    ([x, y, z]) => {
      const e = .15;

      return [
        tinggiTanah(x - e, z) - tinggiTanah(x + e, z),
        2 * e,
        tinggiTanah(x, z - e) - tinggiTanah(x, z + e)
      ];
    }
  );
}

// Lapisan tebing dari atas ke bawah.
// [faktor radius, y, variasi radius, variasi y, warna].
const BATU = [.52, .52, .41];
const BATU_GELAP = [.42, .43, .36];
const TOSKA = [.20, .50, .44];

const LAPISAN = [
  [1, 0, 0, 0, BATU],
  [1, -.4, 0, 0, BATU],
  [.985, -8, .012, 1.3, BATU],
  [.90, -9.6, .05, .5, BATU_GELAP],
  [.62, -10.6, .06, .4, BATU_GELAP],
  [.57, -14.6, .05, .9, BATU],
  [.42, -16.2, .05, .3, BATU_GELAP],
  [.36, -20, .05, .8, BATU],
  [.21, -22, .05, .3, BATU_GELAP],
  [.15, -25.2, .05, .4, TOSKA],
  [.05, -27, .02, .2, TOSKA],
  [.012, -30.5, 0, 0, TOSKA]
];

// Tebing memakai normal per sisi agar kolom batunya terlihat tegas.
export function buatTebing() {
  const mesh = { vertices: [], normals: [], colors: [], indices: [] };

  function titik(sektor, level) {
    const [faktor, y, variasi, variasiY] = LAPISAN[level];
    const blok = Math.floor(
      (((sektor % JUMLAH_SEKTOR) + JUMLAH_SEKTOR) % JUMLAH_SEKTOR) / SEKTOR_PER_BLOK
    );

    const [x, z] = titikTepi(sektor);
    const k = faktor * (1 + (acak(blok * 3 + level) - .5) * variasi * 2);

    // Lapisan teratas harus mengikuti tinggi permukaan tanah.
    let tinggi = y - acak(blok * 7 + level) * variasiY;

    if (level === 0) tinggi = tinggiTanah(x, z);
    if (level === 1) tinggi = Math.min(tinggiTanah(x, z) - .4, y);

    return [x * k, tinggi, z * k];
  }

  function sisi(a, b, c, d, warna) {
    const u = b.map((v, k) => v - a[k]);
    const w = d.map((v, k) => v - a[k]);

    const normal = [
      u[1] * w[2] - u[2] * w[1],
      u[2] * w[0] - u[0] * w[2],
      u[0] * w[1] - u[1] * w[0]
    ];

    const panjang = Math.hypot(...normal) || 1;
    const awal = mesh.vertices.length / 3;

    for (const p of [a, b, c, d]) {
      mesh.vertices.push(...p);
      mesh.normals.push(...normal.map(v => v / panjang));
      mesh.colors.push(...warna);
    }

    mesh.indices.push(awal, awal + 1, awal + 2, awal, awal + 2, awal + 3);
  }

  for (let level = 0; level < LAPISAN.length - 1; level++) {
    for (let i = 0; i < JUMLAH_SEKTOR; i++) {
      const blok = Math.floor(i / SEKTOR_PER_BLOK);

      const terang =
        (.84 + acak(blok + level * 13) * .26) *
        (.96 + acak(i * 5 + level) * .08) *
        (i % SEKTOR_PER_BLOK === 0 ? .62 : 1);

      // Bagian bawah makin pudar karena jauh di udara.
      const kabut = jepit(-LAPISAN[level + 1][1] / 30) * .28;

      sisi(
        titik(i, level),
        titik(i + 1, level),
        titik(i + 1, level + 1),
        titik(i, level + 1),
        campur(
          LAPISAN[level + 1][4].map(v => v * terang),
          [.62, .78, .86],
          kabut
        )
      );
    }
  }

  return mesh;
}
