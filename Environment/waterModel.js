import {
  JUMLAH_SEKTOR,
  SUDUT_MUARA,
  TINGGI_AIR,
  jarakAir,
  posisiRadial,
  tinggiTanah,
  titikTepi
} from './islandTerrain.js';

const jepit = x => Math.max(0, Math.min(1, x));

const halus = x => {
  const t = jepit(x);
  return t * t * (3 - 2 * t);
};

const DALAM = [.13, .47, .60];
const TERANG = [.34, .74, .76];
const BUIH = [.88, .95, .92];

// Air hanya dibuat di area yang tanahnya lebih rendah dari permukaan air.
export function createPermukaanAir() {
  const langkah = .32;
  const mulaiX = -24;
  const mulaiZ = -18;
  const kolom = 150;
  const baris = 124;

  const indeksBaru = new Map();

  const mesh = {
    vertices: [],
    normals: [],
    colors: [],
    indices: [],
    dynamic: true
  };

  const tepiAir = [];

  const rendah = new Uint8Array((kolom + 1) * (baris + 1));

  for (let i = 0; i <= baris; i++) {
    for (let j = 0; j <= kolom; j++) {
      const x = mulaiX + j * langkah;
      const z = mulaiZ + i * langkah;

      rendah[i * (kolom + 1) + j] =
        tinggiTanah(x, z) < TINGGI_AIR + .2 ? 1 : 0;
    }
  }

  function ambilTitik(i, j) {
    const kunci = i * (kolom + 1) + j;

    if (indeksBaru.has(kunci)) return indeksBaru.get(kunci);

    let x = mulaiX + j * langkah;
    let z = mulaiZ + i * langkah;

    // Titik di luar pulau ditarik kembali ke tepi.
    const radial = posisiRadial(x, z);

    if (radial > .997) {
      x *= .997 / radial;
      z *= .997 / radial;
    }

    const indeks = mesh.vertices.length / 3;

    indeksBaru.set(kunci, indeks);

    mesh.vertices.push(x, TINGGI_AIR, z);
    mesh.normals.push(0, 1, 0);
    mesh.colors.push(...TERANG);

    // Buih hanya muncul di dekat garis pantai.
    tepiAir.push(halus((jarakAir(x, z) + .45) / .75));

    return indeks;
  }

  for (let i = 0; i < baris; i++) {
    for (let j = 0; j < kolom; j++) {
      const k = i * (kolom + 1) + j;

      const adaAir =
        rendah[k] ||
        rendah[k + 1] ||
        rendah[k + kolom + 1] ||
        rendah[k + kolom + 2];

      const x = mulaiX + (j + .5) * langkah;
      const z = mulaiZ + (i + .5) * langkah;

      if (!adaAir || posisiRadial(x, z) > 1.03) continue;

      const a = ambilTitik(i, j);
      const b = ambilTitik(i, j + 1);
      const c = ambilTitik(i + 1, j);
      const d = ambilTitik(i + 1, j + 1);

      mesh.indices.push(a, c, b, b, c, d);
    }
  }

  return {
    mesh,

    // Riak dihitung dari waktu kejadian agar adegan bisa diulang.
    update(waktu, daftarRiak) {
      const v = mesh.vertices;
      const n = mesh.normals;
      const w = mesh.colors;

      const aktif = daftarRiak.filter(r =>
        waktu >= r.waktu && waktu < r.waktu + 3.2
      );

      for (let k = 0; k < tepiAir.length; k++) {
        const x = v[k * 3];
        const z = v[k * 3 + 2];

        const y =
          .022 * Math.sin(x * 1.1 + waktu * 1.3) +
          .022 * Math.sin(z * .9 - waktu * 1.7) +
          .012 * Math.sin((x + z) * 2.1 + waktu * 2.4);

        const kemiringanX =
          .024 * Math.cos(x * 1.1 + waktu * 1.3) +
          .025 * Math.cos((x + z) * 2.1 + waktu * 2.4);

        const kemiringanZ =
          .020 * Math.cos(z * .9 - waktu * 1.7) +
          .025 * Math.cos((x + z) * 2.1 + waktu * 2.4);

        let tinggiRiak = 0;
        let buihRiak = 0;

        for (const r of aktif) {
          const umur = waktu - r.waktu;
          const jarak = Math.hypot(x - r.x, z - r.z);

          // Gelombang melingkar yang melebar dan mengecil.
          const cincin =
            Math.exp(-((jarak - umur * 3.4) ** 2) * 1.4) *
            Math.exp(-umur * 1.3) *
            r.kuat;

          tinggiRiak += cincin * .26;
          buihRiak += cincin * .9;
        }

        v[k * 3 + 1] = TINGGI_AIR + y + tinggiRiak;

        const panjang = Math.hypot(kemiringanX, 1, kemiringanZ);

        n[k * 3] = -kemiringanX / panjang;
        n[k * 3 + 1] = 1 / panjang;
        n[k * 3 + 2] = -kemiringanZ / panjang;

        const motif = .5 + .5 * Math.sin(
          x * 1.7 + z * .8 + waktu * 1.1 +
          1.6 * Math.sin(z * .5 - waktu * .6)
        );

        const buih = jepit(tepiAir[k] * .55 + buihRiak);

        for (let c = 0; c < 3; c++) {
          const dasar = DALAM[c] + (TERANG[c] - DALAM[c]) * motif * motif;

          w[k * 3 + c] = dasar + (BUIH[c] - dasar) * buih;
        }
      }
    }
  };
}

// Lembaran air yang jatuh dari muara sungai.
export function createAirTerjun() {
  const kandidat = [];

  const pusatSektor = SUDUT_MUARA / (Math.PI * 2) * JUMLAH_SEKTOR;

  for (let s = Math.floor(pusatSektor - 18); s <= pusatSektor + 18; s++) {
    const [x, z] = titikTepi(s);

    if (tinggiTanah(x, z) < TINGGI_AIR) kandidat.push(s);
  }

  const sektorAwal = kandidat[0];
  const sektorAkhir = kandidat[kandidat.length - 1];

  const baris = 34;
  const kolom = 26;
  const panjangJatuh = 15;

  const mesh = {
    vertices: [],
    normals: [],
    colors: [],
    indices: [],
    dynamic: true
  };

  for (let i = 0; i <= baris; i++) {
    for (let j = 0; j <= kolom; j++) {
      const v = i / baris;
      const u = j / kolom;

      // Air sedikit menyempit saat jatuh.
      const sempit = (u - .5) * (1 - v * v * .3) + .5;
      const [x, z] = titikTepi(sektorAwal + (sektorAkhir - sektorAwal) * sempit);

      const keluar = .99 + .03 * Math.min(1, v * 7) + .05 * Math.sqrt(v);
      const panjang = Math.hypot(x, z);

      mesh.vertices.push(
        x * keluar,
        TINGGI_AIR + .02 - v * panjangJatuh,
        z * keluar
      );

      mesh.normals.push(x / panjang, .15, z / panjang);
      mesh.colors.push(...BUIH);
    }
  }

  for (let i = 0; i < baris; i++) {
    for (let j = 0; j < kolom; j++) {
      const a = i * (kolom + 1) + j;
      const b = a + kolom + 1;

      mesh.indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  // Posisi kabut di ujung bawah air terjun.
  const [x, z] = titikTepi((sektorAwal + sektorAkhir) / 2);

  return {
    mesh,
    ujung: [x * 1.06, TINGGI_AIR - panjangJatuh, z * 1.06],

    update(waktu) {
      for (let i = 0; i <= baris; i++) {
        for (let j = 0; j <= kolom; j++) {
          const v = i / baris;
          const u = j / kolom;
          const k = (i * (kolom + 1) + j) * 3;

          // Garis-garis air bergerak ke bawah.
          const garis = .5 + .5 * Math.sin(
            u * 46 + 6 * Math.sin(u * 13) +
            Math.sin(v * 9 - waktu * 7) * 1.4
          );

          const cerah = Math.min(1, garis * .75 + v * .4);

          mesh.colors[k] = .44 + .54 * cerah;
          mesh.colors[k + 1] = .76 + .22 * cerah;
          mesh.colors[k + 2] = .84 + .15 * cerah;
        }
      }
    }
  };
}
