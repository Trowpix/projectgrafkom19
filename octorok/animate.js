"use strict";

class Octorok {
  constructor(gl) {
    this.root = new MyObject(gl);
    this.tentacles = [];

    const G = OctorokGeometry;

    const red = [0.95, 0.095, 0.025];
    const orange = [1, 0.19, 0.035];
    const yellow = [0.91, 0.83, 0.22];

    const add = (
      parent,
      geometry,
      color,
      position = [0, 0, 0],
      gloss = 0.5
    ) => {
      const node = parent.add(
        new MyObject(gl, geometry, color)
      );

      node.position = position;
      node.style = [0, 0, gloss];

      return node;
    };

    // =========================
    // BADAN DAN WAJAH
    // =========================

    add(
      this.root,
      G.ellipsoid(0.48, 0.45, 0.47),
      red,
      [0, 0.91, 0]
    );

    this.head = this.root.add(new MyObject(gl));
    this.head.position = [0, 1.30, 0];

    add(
      this.head,
      G.ellipsoid(0.57, 0.44, 0.54),
      orange
    );

    // =========================
    // KEPALA BESAR
    // =========================

    // Ukuran batas kedua permukaan disamakan.
    const cut = 0.525;
    const rim = Math.sqrt(1 - cut * cut);

    // Tinggi ini membuat arah permukaan di sambungan
    // paraboloid dan ellipsoid saling sesuai.
    const capHeight =
      0.8 * 0.8 * (1 - cut * cut) /
      (2 * 0.8 * cut);

    add(
      this.head,
      G.dome(
        1.02 * rim,
        0.86 * rim,
        capHeight
      ),
      red,
      [0, 0.78 + 0.8 * cut, -0.22],
      0.75
    );

    add(
      this.head,
      G.lowerHead(1.02, 0.8, 0.86, cut),
      red,
      [0, 0.78, -0.22],
      0.75
    );

    // =========================
    // MATA
    // =========================

    for (const side of [-1, 1]) {
      const eye = this.head.add(new MyObject(gl));

      eye.position = [side * 0.30, 0.14, 0.50];
      eye.rotation[1] = side * 0.12;

      // Bingkai mata merah.
      add(
        eye,
        G.torus(0.244, 0.047),
        red
      );

      // Bola mata putih.
      add(
        eye,
        G.ellipsoid(0.224, 0.252, 0.135),
        [0.96, 0.97, 0.92],
        [0, 0, 0.025],
        0.35
      );

      // Pupil berbentuk celah miring.
      const pupil = add(
        eye,
        G.ellipsoid(0.145, 0.061, 0.032),
        [0.025, 0.025, 0.022],
        [0, -0.012, 0.153],
        0.08
      );

      pupil.rotation[2] = side * 0.34;

      // Kelopak atas mengikuti kurva Bézier.
      add(
        eye,
        G.tube([
          [-0.25, 0.12, 0.04],
          [-0.17, 0.35, 0.11],
          [0.15, 0.34, 0.11],
          [0.25, 0.12, 0.04]
        ], 0.047),
        orange
      );
    }

    // =========================
    // MONCONG HYPERBOLOID
    // =========================

    this.mouth = this.head.add(new MyObject(gl));
    this.mouth.position = [0, -0.16, 0.48];

    const length = 0.58;
    const a = 0.135;
    const c = 0.27;

    const endRadius =
      a * Math.sqrt(1 + (length / c) ** 2);

    add(
      this.mouth,
      G.hyperboloid(a, c, length),
      orange
    );

    // Permukaan dalam.
    add(
      this.mouth,
      G.hyperboloid(0.10, c, length),
      [0.42, 0.055, 0.015]
    );

    // Bibir moncong.
    add(
      this.mouth,
      G.torus(endRadius - 0.018, 0.075),
      orange,
      [0, 0, length],
      0.55
    );

    // Bagian gelap ditempatkan masuk ke rongga.
    add(
      this.mouth,
      G.disk(endRadius * 0.69),
      [0.018, 0.014, 0.012],
      [0, 0, length - 0.13],
      0
    );

    // =========================
    // TENTAKEL
    // =========================

    for (let i = 0; i < 4; i++) {
      const angle =
        Math.PI / 4 + i * Math.PI / 2;

      const pivot = this.root.add(new MyObject(gl));

      pivot.position = [
        Math.sin(angle) * 0.25,
        0.66,
        Math.cos(angle) * 0.25
      ];

      pivot.rotation[1] = angle;

      add(
        pivot,
        G.tube([
          [0, 0, 0],
          [0, -0.35, 0.40],
          [0, -0.66, 0.94],
          [0, -0.36, 1.12]
        ], 0.185, 0.40),
        orange
      );

      // Tonjolan kuning berbentuk cone.
      const tip = add(
        pivot,
        G.cone(0.145, 0.39),
        yellow,
        [0, -0.36, 1.12],
        0.3
      );

      tip.rotation[0] = 0.70;

      this.tentacles.push(pivot);
    }
  }

  update(time, moving) {
    const speed = moving ? 6 : 2;

    // Gerakan naik-turun.
    this.root.position[1] =
      0.02 +
      (moving ? 0.12 : 0.025) *
      (1 + Math.sin(time * speed));

    this.root.rotation[2] =
      Math.sin(time * speed) *
      (moving ? 0.045 : 0.015);

    this.head.rotation[1] =
      Math.sin(time * 1.1) * 0.10;

    this.head.rotation[0] =
      Math.sin(time * 1.7) * 0.025;

    this.mouth.position[2] =
      0.48 + Math.sin(time * 2) * 0.018;

    // Setiap tentakel memiliki fase gerak berbeda.
    this.tentacles.forEach((leg, i) => {
      leg.rotation[0] =
        Math.sin(time * speed + i * Math.PI / 2) *
        (moving ? 0.16 : 0.045);
    });
  }

  draw(shader) {
    this.root.draw(shader);
  }
}