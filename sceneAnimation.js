// Jadwal cerita dalam detik.
const T = {
  sorotDeku: [5, 15],
  sorotMajora: [17, 27],
  sorotOctorok: [29, 39],

  // Octorok menyelam setelah sorotannya selesai.
  selam: [39.2, 40.8],

  jalan: [42, 53.5],
  riak: [55, 55.6, 56.2],

  // Octorok keluar dari air dan mendarat lagi.
  lompat: [56.8, 58.5],
  kaget: 57,

  akhir: 66
};

export const DURASI = T.akhir;

const jepit = x => Math.max(0, Math.min(1, x));

// Transisi perlahan saat mulai dan berhenti.
function halus(nilai) {
  const x = jepit(nilai);
  return x * x * (3 - 2 * x);
}

function campur(awal, akhir, t) {
  return awal.map(
    (nilai, i) => nilai + (akhir[i] - nilai) * t
  );
}

// Kurva Bézier kubik untuk jalur perjalanan.
function bezier(a, b, c, d, t) {
  const s = 1 - t;

  return a.map((nilai, i) =>
    s * s * s * nilai +
    3 * s * s * t * b[i] +
    3 * s * t * t * c[i] +
    t * t * t * d[i]
  );
}

// Percepatan di awal, kecepatan tetap, perlambatan di akhir.
function trapesium(u, r) {
  const x = jepit(u);
  const puncak = 1 / (1 - r);

  if (x < r) return puncak * x * x / (2 * r);
  if (x > 1 - r) return 1 - puncak * (1 - x) ** 2 / (2 * r);

  return puncak * (x - r / 2);
}

// Naik dengan cepat, lalu turun perlahan.
function hentakan(k, naik, turun) {
  if (k < 0) return 0;
  return halus(k / naik) * (1 - halus((k - naik) / turun));
}

function arahKe(dari, ke) {
  return Math.atan2(ke[0] - dari[0], ke[2] - dari[2]);
}

// Selisih sudut terpendek agar putaran tidak memutar jauh.
function campurSudut(a, b, t) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

export function createSceneAnimation(characters, environment) {
  const deku = characters.filter(model => model.variant);
  const octorok = characters.find(model => model.joints.tentacles);
  const majora = characters.find(model => model.joints.spikes);

  const { tinggiTanah, TINGGI_AIR } = environment;

  // ================ POSISI CERITA =================

  const ukuranOctorok = 1.25;

  // Di posisi ini tentakel berada tepat di permukaan air.
  const yOctorokDiAir = TINGGI_AIR - .42 * ukuranOctorok;

  const posisiOctorok = [...octorok.root.position];
  posisiOctorok[1] = yOctorokDiAir;

  // Mendarat sedikit lebih dekat ke tepi sungai.
  const posisiDarat = [6.1, yOctorokDiAir, 1.2];

  const arahOctorok = arahKe(posisiOctorok, [-1, 0, 6]);

  // Titik pandang dibuat agak ke arah kamera.
  // Wajah karakter tetap terlihat saat adegan akhir.
  const titikPandang = [7, 0, 8];

  const awalDeku = deku.map(model => [...model.root.position]);

  // Barisan menyerong agar ketiganya terlihat dari kamera.
  const akhirDeku = [
    [-2.9, 0, -.6],
    [-.2, 0, 1.4],
    [2.5, 0, 3.4]
  ];

  const awalMajora = [...majora.root.position];
  const akhirMajora = [-4.2, 5.6, -2.4];

  environment.aturRiak([
    { x: posisiOctorok[0], z: posisiOctorok[2], waktu: T.selam[0] + .75, kuat: 1, cipratan: .8 },
    { x: posisiOctorok[0], z: posisiOctorok[2], waktu: T.riak[0], kuat: .45 },
    { x: posisiOctorok[0], z: posisiOctorok[2], waktu: T.riak[1], kuat: .6 },
    { x: posisiOctorok[0], z: posisiOctorok[2], waktu: T.riak[2], kuat: .8 },
    { x: posisiOctorok[0], z: posisiOctorok[2], waktu: T.lompat[0] + .1, kuat: 1.5, cipratan: 1.15 },
    { x: posisiDarat[0], z: posisiDarat[2], waktu: T.lompat[1] - .05, kuat: 1.4, cipratan: 1 }
  ]);

  // ================== JALUR JALAN =================

  function jalurDeku(index, t) {
    const awal = awalDeku[index];
    const akhir = akhirDeku[index];

    const u = trapesium(
      (t - T.jalan[0]) / (T.jalan[1] - T.jalan[0]),
      .08
    );

    return bezier(
      awal,
      [awal[0] + 4, 0, awal[2]],
      [akhir[0] - 4, 0, akhir[2]],
      akhir,
      u
    );
  }

  function jalurMajora(t) {
    const u = trapesium(
      (t - T.jalan[0]) / (T.jalan[1] - T.jalan[0]),
      .1
    );

    // Terbang melewati kepala para Deku.
    return bezier(
      awalMajora,
      [-15, 5.6, 2],
      [-8, 6, -4],
      akhirMajora,
      u
    );
  }

  function arahJalur(jalur, t) {
    const waktu = Math.max(
      T.jalan[0] + .02,
      Math.min(T.jalan[1] - .02, t)
    );

    return arahKe(jalur(waktu - .01), jalur(waktu + .01));
  }

  // Baurkan dua pose agar sendi tidak berpindah mendadak.
  function baurkanPose(model, bagian, t, modeA, modeB, bobot) {
    model.update(t, modeA);

    const poseA = bagian.map(node => ({
      position: [...node.position],
      rotation: [...node.rotation],
      scale: [...node.scale]
    }));

    model.update(t, modeB);

    bagian.forEach((node, i) => {
      node.position = campur(poseA[i].position, node.position, bobot);
      node.rotation = campur(poseA[i].rotation, node.rotation, bobot);
      node.scale = campur(poseA[i].scale, node.scale, bobot);
    });
  }

  // ===================== DEKU =====================

  function perbaruiDeku(model, i, t) {
    const root = model.root;
    const j = model.joints;

    // Reaksi tiap Deku sedikit berbeda waktunya.
    const k = t - T.kaget - i * .07;

    const akhir = akhirDeku[i];

    // Mundur menjauhi Octorok tanpa berbalik badan.
    const arahMundur = [
      akhir[0] - posisiOctorok[0],
      0,
      akhir[2] - posisiOctorok[2]
    ];

    const panjang = Math.hypot(...arahMundur);
    const mundur = 2.1 * trapesium((k - .45) / .95, .2);

    const bobotMundur = hentakan(k - .4, .15, .9);

    const bobotBerjalan = Math.max(
      halus((t - T.jalan[0]) / .6) *
        (1 - halus((t - (T.jalan[1] - .6)) / .6)),
      bobotMundur
    );

    baurkanPose(
      model,
      [j.rig, j.head, ...j.legs],
      t,
      'idle',
      'walk',
      bobotBerjalan
    );

    // ============== TRANSLATION ==============

    const dasar = jalurDeku(i, t);

    const x = dasar[0] + arahMundur[0] / panjang * mundur;
    const z = dasar[2] + arahMundur[2] / panjang * mundur;

    // Melompat sedikit karena terkejut.
    const u = jepit(k / .55);
    const lompat = k > 0 ? 1.05 * 4 * u * (1 - u) : 0;

    root.position = [x, tinggiTanah(x, z) + lompat, z];

    // ================ ROTATION ================

    const arahPandang = arahKe(akhir, titikPandang);

    if (t < T.jalan[0]) {
      // Menoleh dulu sebelum mulai berjalan.
      root.rotation[1] =
        arahJalur(p => jalurDeku(i, p), T.jalan[0]) *
        halus((t - (T.jalan[0] - .7)) / .7);
    } else if (t < T.jalan[1]) {
      root.rotation[1] = arahJalur(p => jalurDeku(i, p), t);
    } else {
      root.rotation[1] = campurSudut(
        arahJalur(p => jalurDeku(i, p), T.jalan[1]),
        arahPandang,
        halus((t - T.jalan[1]) / .7)
      );
    }

    // Mengintip ke air, lalu badan terdorong ke belakang.
    const mengintip =
      halus((t - T.riak[0] + .4) / .8) * (1 - halus(k / .12));

    root.rotation[0] =
      .17 * mengintip -
      .46 * hentakan(k, .12, 1.3);

    // Gemetar setelah mendarat.
    root.rotation[2] =
      .05 * hentakan(k - .55, .1, 2.2) * Math.sin(t * 38);

    // ================= SCALING =================

    // Saat melangkah badan sedikit memanjang dan memendek.
    const lenturLangkah =
      .035 * bobotBerjalan * Math.sin((t - T.jalan[0]) * 14);

    const memanjang = .30 * hentakan(k, .10, .35);
    const memipih = .20 * hentakan(k - .5, .08, .32);

    const skalaY = 1 + lenturLangkah + memanjang - memipih;
    const skalaXZ = 1 / Math.sqrt(skalaY);

    root.scale = [skalaXZ, skalaY, skalaXZ];

    // Mata melebar saat terkejut.
    const mata = 1 + .55 * hentakan(k, .1, 1.8);

    j.eyes.forEach(eye => {
      eye.scale = [mata, mata, mata];
    });
  }

  // ==================== MAJORA ====================

  // Fase dipilih agar putaran cepat terjadi di tengah sorotan.
  const faseMajora = 7;

  function perbaruiMajora(t) {
    const root = majora.root;
    const j = majora.joints;
    const k = t - T.kaget - .1;

    const waktuPose = t + faseMajora;

    const bobotTerbang =
      halus((t - T.jalan[0]) / .7) *
      (1 - halus((t - (T.jalan[1] - .7)) / .7));

    const bagian = [j.rig, ...j.eyes, ...j.spikes];

    if (t < T.jalan[0]) {
      majora.update(waktuPose, 'idle');
    } else {
      baurkanPose(majora, bagian, waktuPose, 'melayang', 'terbang', bobotTerbang);
    }

    // ============== TRANSLATION ==============

    const posisi = jalurMajora(t);

    const arahMundur = [
      akhirMajora[0] - posisiOctorok[0],
      0,
      akhirMajora[2] - posisiOctorok[2]
    ];

    const panjang = Math.hypot(...arahMundur);
    const mundur = 2.6 * trapesium(k / .9, .18);

    root.position = [
      posisi[0] + arahMundur[0] / panjang * mundur,
      posisi[1] + 1.1 * hentakan(k, .25, 2),
      posisi[2] + arahMundur[2] / panjang * mundur
    ];

    // ================ ROTATION ================

    // Wajah topeng tetap condong ke kamera selama terbang,
    // ditambah ayunan kiri-kanan yang jelas.
    const arahPandang = arahKe(akhirMajora, titikPandang);
    const lamaTerbang = T.jalan[1] - T.jalan[0];
    const kemajuan = jepit((t - T.jalan[0]) / lamaTerbang);

    root.rotation[1] =
      arahPandang * halus(kemajuan * 3) +
      .45 * Math.sin(kemajuan * Math.PI * 3);

    // Menunduk saat terbang, terdorong ke belakang saat terkejut.
    root.rotation[0] =
      .26 * bobotTerbang -
      .55 * hentakan(k, .15, 1.2);

    // Berguling satu putaran di tengah penerbangan,
    // lalu satu putaran lagi karena terkejut.
    const tengahTerbang = (T.jalan[0] + T.jalan[1]) / 2;

    root.rotation[2] =
      Math.PI * 2 * halus((t - tengahTerbang + 1) / 2) -
      Math.PI * 2 * halus(k / 1);

    // ================= SCALING =================

    // Membesar sedikit saat terbang.
    // Mengembang mendadak ketika terkejut.
    const skala =
      1 +
      .16 * bobotTerbang * (.5 + .5 * Math.sin(t * 2.2)) +
      .42 * hentakan(k, .12, .9);

    root.scale = [skala, skala, skala];

    // Mata melebar saat terkejut, ditambah denyut dari pose.
    const mata = 1 + .28 * hentakan(k, .12, 1.8);

    j.eyes.forEach(eye => {
      eye.scale = eye.scale.map(nilai => nilai * mata);
    });
  }

  // =================== OCTOROK ====================

  function perbaruiOctorok(t) {
    const root = octorok.root;

    const posisi = [...posisiOctorok];

    let putarY = 0;
    let saltoX = 0;
    let skalaY = 1;
    let kembang = 0;

    // Menyelam: merunduk, lompat kecil, lalu tenggelam berputar.
    if (t >= T.selam[0] && t < T.lompat[0]) {
      const u = jepit((t - T.selam[0]) / (T.selam[1] - T.selam[0]));

      const naik = .9 * hentakan(u - .22, .18, .3);
      const turun = 5.6 * halus((u - .42) / .58);

      posisi[1] = yOctorokDiAir + naik - turun;

      putarY = Math.PI * 3 * halus((u - .3) / .7);
      skalaY = 1 - .24 * hentakan(u, .22, .1) + .26 * hentakan(u - .3, .2, .5);
      kembang = -.3 * halus((u - .3) / .3);
    }

    // Lompatan keluar dari air: lintasan parabola.
    if (t >= T.lompat[0]) {
      const durasi = T.lompat[1] - T.lompat[0];
      const u = jepit((t - T.lompat[0]) / durasi);
      const dasar = yOctorokDiAir - 5.6 * (1 - u);

      posisi[0] = posisiOctorok[0] + (posisiDarat[0] - posisiOctorok[0]) * u;
      posisi[1] = dasar + 9 * 4 * u * (1 - u);
      posisi[2] = posisiOctorok[2] + (posisiDarat[2] - posisiOctorok[2]) * u;

      // Dua putaran Y dan satu salto.
      putarY = Math.PI * 4 * halus(u * 1.05);
      saltoX = -Math.PI * 2 * halus((u - .12) / .78);

      kembang = Math.sin(Math.PI * u) ** .6;

      // Memanjang saat melesat.
      // Memipih saat mendarat, lalu memantul mereda.
      const setelahMendarat = t - T.lompat[1];

      skalaY = setelahMendarat < 0
        ? 1 + .42 * (1 - halus(u / .5)) - .14 * halus((u - .5) / .5)
        : 1 - .34 * Math.exp(-setelahMendarat * 3.5) *
          Math.cos(setelahMendarat * 10);
    }

    octorok.update(t, 'idle', { kembang: Math.max(0, kembang) });

    root.position = posisi;
    root.rotation[0] = saltoX;
    root.rotation[1] = arahOctorok + putarY;

    const skalaXZ = 1 / Math.sqrt(skalaY);

    root.scale = [
      ukuranOctorok * skalaXZ,
      ukuranOctorok * skalaY,
      ukuranOctorok * skalaXZ
    ];
  }

  // ==================== KAMERA ====================

  // Setiap sorotan aktif pada [mulai, selesai].
  // Di antara dua sorotan, kamera berpindah secara halus.
  function daftarSorotan(faktorLayar) {
    const f = faktorLayar;

    const pusatDeku = t => {
      const titik = deku.map((_, i) => jalurDeku(i, t));

      return [0, 2].map(k =>
        titik.reduce((total, p) => total + p[k], 0) / titik.length
      );
    };

    return [
      {
        rentang: [0, 3],
        ambil(t) {
          // Air terjun berada di kanan, ujung pulau terlihat di tengah.
          const sudut = -.30 - t * .05;
          const jarak = 60 * f;

          return {
            eye: [
              Math.sin(sudut) * jarak,
              14,
              Math.cos(sudut) * jarak
            ],
            target: [0, -9, 0]
          };
        }
      },

      {
        // Menggeser kamera dari Deku kiri ke Deku kanan.
        rentang: T.sorotDeku,
        ambil(t) {
          const u = jepit((t - T.sorotDeku[0]) / 10);
          const x = -13 + 4 * u;
          const jarak = (9.4 - 1.2 * u) * f;

          return {
            eye: [x, 3.3, 1.2 + jarak],
            target: [x, 2.2, 1.2]
          };
        }
      },

      {
        // Mengitari topeng dengan perlahan.
        // Saat datang, kamera memutar agar tidak menembus topeng.
        rentang: T.sorotMajora,
        busur: [-9, 0, 0],
        ambil(t) {
          const u = jepit((t - T.sorotMajora[0]) / 10);
          const sudut = -.42 + .84 * u;
          const jarak = (11.5 - 1.8 * u) * f;

          return {
            eye: [
              awalMajora[0] + Math.sin(sudut) * jarak,
              4.8,
              awalMajora[2] + Math.cos(sudut) * jarak
            ],
            target: [awalMajora[0], 4.4, awalMajora[2]]
          };
        }
      },

      {
        // Tetap pada Octorok sampai ia selesai menyelam.
        rentang: [T.sorotOctorok[0], T.selam[1] - .1],
        ambil(t) {
          const u = jepit((t - T.sorotOctorok[0]) / 10);
          const sudut = arahOctorok - .32 + .64 * u;
          const jarak = (9.8 - 1.4 * u) * f;

          return {
            eye: [
              posisiOctorok[0] + Math.sin(sudut) * jarak,
              3,
              posisiOctorok[2] + Math.cos(sudut) * jarak
            ],
            target: [posisiOctorok[0], 1.3, posisiOctorok[2]]
          };
        }
      },

      {
        // Mengikuti rombongan dari samping, lalu dari depan.
        rentang: [T.jalan[0] + .3, T.jalan[1] - .9],
        ambil(t) {
          const u = jepit((t - T.jalan[0]) / (T.jalan[1] - T.jalan[0]));
          const [x, z] = pusatDeku(t);

          return {
            eye: [
              x - 2 + 9.5 * u,
              4.2,
              z + (21 - 7.9 * u) * f
            ],
            target: [x + 1.2, 3.2, z]
          };
        }
      },

      {
        // Rendah di tepi sungai, memperlihatkan semua karakter.
        rentang: [T.jalan[1] + .9, T.akhir],
        ambil(t) {
          const naik = hentakan(t - T.lompat[0], .6, 1.4);
          const mundur = halus((t - (T.lompat[1] + 3)) / 4.5);
          const jarak = (15.5 + 6 * mundur) * f;

          // Guncangan kecil saat lompat dan mendarat.
          const guncang =
            .16 * hentakan(t - T.lompat[0], .05, .8) +
            .24 * hentakan(t - T.lompat[1], .05, .9);

          return {
            eye: [
              2.2 + guncang * Math.sin(t * 47),
              2.9 + 2.6 * mundur + guncang * Math.sin(t * 61),
              1.2 + jarak
            ],
            target: [2.6, 3 + .9 * naik + .3 * mundur, 1.2]
          };
        }
      }
    ];
  }

  return {
    update(waktu) {
      const t = Math.max(0, waktu);

      deku.forEach((model, i) => perbaruiDeku(model, i, t));
      perbaruiMajora(t);
      perbaruiOctorok(t);
    },

    camera(waktu, aspect) {
      const t = Math.max(0, Math.min(DURASI, waktu));
      const sorotan = daftarSorotan(Math.max(1, 1 / aspect));

      for (let i = 0; i < sorotan.length - 1; i++) {
        const sekarang = sorotan[i];
        const berikut = sorotan[i + 1];

        if (t <= sekarang.rentang[1]) {
          return sekarang.ambil(t);
        }

        if (t < berikut.rentang[0]) {
          const lebar = berikut.rentang[0] - sekarang.rentang[1];
          const u = (t - sekarang.rentang[1]) / lebar;
          const dari = sekarang.ambil(t);
          const ke = berikut.ambil(t);

          // Kamera sedikit naik saat berpindah.
          // Jalurnya tidak menabrak pohon atau karakter.
          const eye = campur(dari.eye, ke.eye, halus(u));
          const lengkung = Math.sin(Math.PI * u);

          eye[1] += 2.2 * lengkung;

          if (berikut.busur) {
            berikut.busur.forEach((nilai, k) => {
              eye[k] += nilai * lengkung;
            });
          }

          return {
            eye,
            target: campur(dari.target, ke.target, halus(u))
          };
        }
      }

      return sorotan[sorotan.length - 1].ambil(t);
    }
  };
}
