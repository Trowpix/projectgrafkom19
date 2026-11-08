"use strict";

class DekuScrub {
  constructor(gl, variant, x) {
    this.root = new MyObject(gl);
    this.root.position[0] = x;

    this.variant = variant;
    this.phase = variant * 1.7;

    this.leaves = [];
    this.crowns = [];
    this.legs = [];

    const green = [0.24, 0.52, 0.13];
    const pale = [0.43, 0.66, 0.18];
    const wood = [0.27, 0.16, 0.075];

    const add = (
      parent,
      geometry,
      color,
      position = [0, 0, 0],
      style = [0, 0, 0.25]
    ) => {
      const node = parent.add(
        new MyObject(gl, geometry, color)
      );

      node.position = position;
      node.style = style;

      return node;
    };

    const tall = variant === 0;
    const bud = variant === 2;

    const headY = tall ? 2.12 : bud ? 1.83 : 1.69;
    const ry = tall ? 1.12 : bud ? 0.77 : 0.86;
    const rx = tall ? 0.78 : bud ? 0.82 : 0.98;
    const rz = tall ? 0.66 : bud ? 0.67 : 0.76;

    // =========================
    // BADAN
    // =========================

    add(
      this.root,
      CreateObject.cylinder(0.23, 0.52),
      wood,
      [0, 0.65, 0]
    );

    add(
      this.root,
      CreateObject.ellipsoid(0.34, 0.42, 0.31),
      wood,
      [0, 0.65, 0]
    );

    // =========================
    // KEPALA
    // =========================

    this.head = this.root.add(new MyObject(gl));
    this.head.position[1] = headY;

    add(
      this.head,
      CreateObject.head(
        rx, ry, rz,
        tall ? 0.33 : 0.08
      ),
      [1, 0.96, 0.88],
      [0, 0, 0],
      [0, 1, 0.34]
    );

    // =========================
    // MATA
    // =========================

    for (const side of [-1, 1]) {
      const eye = add(
        this.head,
        CreateObject.ellipsoid(
          tall ? 0.125 : 0.145,
          tall ? 0.22 : 0.19,
          0.065
        ),
        [1, 0.87, 0.18],
        [
          side * (tall ? 0.30 : 0.43),
          tall ? 0.02 : 0.12,
          rz * 0.91
        ],
        [1, 0, 0]
      );

      eye.rotation = [
        0,
        side * 0.22,
        side * (tall ? 0.17 : -0.13)
      ];
    }

    // =========================
    // MULUT PARABOLOID
    // =========================

    const mouth = this.head.add(new MyObject(gl));

    mouth.position = [
      0,
      tall ? -0.49 : -0.27,
      rz * 0.85
    ];

    const r = tall ? 0.29 : bud ? 0.30 : 0.37;
    const length = tall ? 0.50 : 0.47;

    add(
      mouth,
      CreateObject.paraboloid(0.105, r, length),
      [0.52, 0.32, 0.13]
    );

    add(
      mouth,
      CreateObject.paraboloid(0.075, r - 0.055, length),
      [0.18, 0.105, 0.04]
    );

    add(
      mouth,
      CreateObject.torus(r - 0.018, 0.067),
      [0.63, 0.40, 0.17],
      [0, 0, length],
      [0, 0, 0.5]
    );

    add(
      mouth,
      CreateObject.disk(r - 0.08),
      [0.025, 0.022, 0.016],
      [0, 0, length - 0.10]
    );

    // =========================
    // KAKI
    // =========================

    for (const side of [-1, 1]) {
      const leg = this.root.add(new MyObject(gl));

      leg.position = [side * 0.25, 0.43, 0];

      add(
        leg,
        CreateObject.ellipsoid(0.16, 0.24, 0.18),
        wood,
        [0, -0.12, 0]
      );

      const foot = add(
        leg,
        CreateObject.ellipsoid(
          0.19,
          0.15,
          tall ? 0.35 : 0.40
        ),
        wood,
        [0, -0.28, 0.18]
      );

      foot.rotation[1] = side * 0.2;
      this.legs.push(leg);
    }

    // =========================
    // KERAH DAUN
    // =========================

    const collarY = tall ? 1.09 : bud ? 0.98 : 0.83;

    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;

      const leaf = add(
        this.root,
        CreateObject.leaf(
          tall ? 0.68 : 0.75,
          0.32,
          -0.33
        ),
        i % 2 ? green : pale,
        [
          Math.sin(a) * 0.15,
          collarY,
          Math.cos(a) * 0.15
        ]
      );

      leaf.rotation[1] = a;
      this.leaves.push(leaf);
    }

    // =========================
    // VARIANT KIRI: TINGGI
    // =========================

    if (tall) {
      // Sulur seperti kumis.
      for (const side of [-1, 1]) {
        add(
          this.head,
          CreateObject.tube([
            [side * 0.21, -0.40, 0.62],
            [side * 0.83, -0.54, 0.79],
            [side * 1.23, -0.30, 0.60],
            [side * 1.20, 0.04, 0.49]
          ], 0.073, 0.98),
          pale
        );
      }

      // Daun panjang di atas kepala.
      for (let i = 0; i < 4; i++) {
        const leaf = add(
          this.head,
          CreateObject.leaf(
            i < 2 ? 1.15 : 0.78,
            0.30,
            0.08
          ),
          i % 2 ? green : pale,
          [0, 1.10, 0]
        );

        leaf.rotation = [
          i < 2 ? -0.16 : -0.86,
          i * Math.PI / 2 + 0.7,
          0
        ];

        leaf.baseTilt = leaf.rotation[0];
        this.crowns.push(leaf);
      }

    // =========================
    // VARIANT TENGAH
    // =========================

    } else if (!bud) {
      add(
        this.head,
        CreateObject.tube([
          [0, 0.72, 0],
          [-0.05, 0.84, 0],
          [-0.08, 0.98, 0],
          [-0.12, 1.06, 0]
        ], 0.046),
        green
      );

      const crown = this.head.add(new MyObject(gl));

      crown.position = [-0.12, 1.02, 0];
      crown.rotation[2] = 0.22;

      add(
        crown,
        CreateObject.heroLeaf(),
        [0.35, 0.65, 0.16]
      );

      // Urat utama pada daun besar.
      add(
        crown,
        CreateObject.tube([
          [0, 0, 0.025],
          [-0.06, 0.4, 0.12],
          [-0.20, 1.08, 0.07],
          [-0.30, 1.48, 0.015]
        ], 0.019, 0.7),
        pale
      );

      crown.baseTilt = 0;
      this.crowns.push(crown);

    // =========================
    // VARIANT KANAN
    // =========================

    } else {
      for (const side of [-1, 1]) {
        const group = this.head.add(new MyObject(gl));

        group.position = [side * 0.65, 0.62, -0.02];
        group.rotation[2] = -side * 0.35;

        add(
          group,
          CreateObject.ellipsoid(0.39, 0.42, 0.36),
          green,
          [0, 0, 0],
          [0, 0, 0.6]
        );

        // Spiral mengikuti permukaan depan kuncup.
        const spiral = t => {
          const a = t * Math.PI * 3.5;
          const r = 0.32 * (1 - t);

          return [
            r * Math.cos(a),
            r * Math.sin(a),
            0.36 *
              Math.sqrt(1 - (r / 0.40) ** 2) +
              0.008
          ];
        };

        add(
          group,
          CreateObject.tube(spiral, 0.015, 0.6),
          pale
        );

        group.baseTilt = 0;
        this.crowns.push(group);
      }
    }
  }

  update(time, walking) {
    // Perbedaan phase membuat gerakan tidak serempak.
    const t = time + this.phase;
    const speed = walking ? 6.5 : 1.8;

    this.root.position[1] =
      (walking ? 0.055 : 0.018) *
      (1 + Math.sin(t * speed * 2));

    this.root.rotation[2] = walking
      ? Math.sin(t * speed) * 0.035
      : 0;

    this.head.rotation[1] =
      Math.sin(t * 0.9) * 0.09;

    this.head.rotation[0] =
      Math.sin(t * 1.6) * 0.018;

    this.legs.forEach((leg, i) => {
      leg.rotation[0] = walking
        ? Math.sin(t * speed + i * Math.PI) * 0.55
        : 0;
    });

    this.leaves.forEach((leaf, i) => {
      leaf.rotation[0] =
        Math.sin(t * 2.5 + i) * 0.045;
    });

    this.crowns.forEach((leaf, i) => {
      leaf.rotation[0] =
        leaf.baseTilt + Math.sin(t * 2 + i) * 0.055;
    });
  }

  draw(shader) {
    this.root.draw(shader);
  }
}