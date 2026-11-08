import { MyObject } from './myObject.js';
import * as Parts from './dekuParts.js';

const variants = {
  kiri: {
    headR: [.78, .99, .70],
    topHeight: 1.01,
    headY: 2.02,
    mouthY: -.40,
    lipR: .326,
    length: .50
  },
  tengah: {
    headR: [.97, .88, .77],
    headY: 1.85,
    mouthY: -.31,
    lipR: .390,
    length: .47
  },
  kanan: {
    headR: [.83, .76, .70],
    headY: 1.78,
    mouthY: -.28,
    lipR: .318,
    length: .47
  }
};

function node(parent, name, position = [0, 0, 0], mesh = null, material = {}) {
  const child = parent.add(new MyObject(name, mesh, material));
  child.position = position;
  return child;
}

export function createDekuModel(variant = 'tengah', { position = [0, 0, 0] } = {}) {
  if (!Object.hasOwn(variants, variant)) {
    throw new RangeError('Varian Deku: kiri, tengah, atau kanan.');
  }

  const cfg = { ...variants[variant], variant };
  const tall = variant === 'kiri';
  const middle = variant === 'tengah';

  // Root untuk posisi seluruh karakter; rig untuk gerakan internal.
  const root = new MyObject('deku-' + variant);
  root.position = [...position];
  const rig = node(root, 'pivot-animasi');

  const body = node(
    rig, 'badan', [0, .65, -.08],
    Parts.generateDeku_Body(), { gloss: .31 }
  );

  const head = node(rig, 'pivot-kepala', [0, cfg.headY, 0]);

  const generateHead = {
    kiri: Parts.generateDeku_HeadKiri,
    tengah: Parts.generateDeku_HeadTengah,
    kanan: Parts.generateDeku_HeadKanan
  }[variant];

  for (const { name, mesh } of generateHead(cfg)) {
    node(head, name, [0, 0, 0], mesh, { gloss: .35 });
  }

  // Mata mengikuti pivot kepala.
  const eyes = [];
  const eyeMesh = Parts.generateDeku_Eyes(tall);

  for (const side of [-1, 1]) {
    const x = side * (tall ? .33 : middle ? .43 : .355);
    const y = tall ? .15 : .13;
    const z = Parts.headFront(cfg, x, y) - .025;

    const eye = node(
      head,
      side < 0 ? 'mata-kiri' : 'mata-kanan',
      [x, y, z],
      eyeMesh,
      { emission: 1 }
    );

    eye.rotation = [-.10, side * .37, side * (tall ? .20 : .10)];
    eyes.push(eye);
  }

  // Dinding moncong, torus, dan disk punya satu pivot yang sama.
  const z = Parts.headFront(cfg, 0, cfg.mouthY) - .075;
  const mouth = node(head, 'pivot-moncong', [0, cfg.mouthY, z]);

  const L = cfg.length;
  const R = cfg.lipR;
  const tube = tall ? .079 : .084;
  const outerR = R + .035;
  const innerR = R - .045;

  node(
    mouth, 'hyperboloid-luar', [0, 0, 0],
    Parts.generateDeku_Snout(.168, outerR, L), { gloss: .38 }
  );

  node(
    mouth, 'hyperboloid-dalam', [0, 0, 0],
    Parts.generateDeku_Snout(.12, innerR, L, true)
  );

  node(
    mouth, 'torus-bibir', [0, 0, L],
    Parts.generateDeku_MouthRim(R, tube), { gloss: .48 }
  );

  const back = L - .16;
  const opening = Parts.hyperboloidRadius(.12, innerR, L, back);

  node(
    mouth, 'disk-gelap', [0, 0, back],
    Parts.generateDeku_MouthHole(opening + .008), { emission: 1 }
  );

  // Delapan daun mengelilingi leher.
  const collar = node(
    rig, 'pivot-kerah', [0, tall ? 1.02 : middle ? .97 : 1.03, -.025]
  );
  const neckLeaves = [];

  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;

    const leaf = node(
      collar,
      'daun-leher-' + (i + 1),
      [Math.sin(a) * .32, 0, Math.cos(a) * .27],
      Parts.generateDeku_NeckLeaf(i),
      { gloss: .34 }
    );

    leaf.rotation = [.23 + (i % 2) * .15, a, 0];
    neckLeaves.push(leaf);
  }

  const crown = node(
    head,
    'pivot-aksesori-kepala',
    [0, (cfg.topHeight ?? cfg.headR[1]) - .065, 0]
  );
  const headLeaves = [];
  const stems = [];

  if (tall) {
    // Deku kiri: empat daun dan dua sulur pipi.
    stems.push(node(crown, 'tangkai', [0, 0, 0], Parts.generateDeku_Stem(.068, .19)));

    for (let i = 0; i < 4; i++) {
      const leaf = node(
        crown, 'daun-kepala-' + (i + 1), [0, .17, 0],
        Parts.generateDeku_HeadLeafKiri(i), { gloss: .28 }
      );

      leaf.rotation = [
        i === 1 ? .22 : i === 3 ? -.38 : -.11,
        i * Math.PI / 2 + .90,
        0
      ];
      headLeaves.push(leaf);
    }

    for (const side of [-1, 1]) {
      node(
        head, 'sulur-pipi-' + side, [0, 0, 0],
        Parts.generateDeku_Cheek(side), { gloss: .35 }
      );
    }
  } else if (middle) {
    // Deku tengah: satu daun besar berlubang.
    crown.rotation[2] = .20;
    stems.push(node(crown, 'tangkai', [0, 0, 0], Parts.generateDeku_Stem(.065, .32)));

    headLeaves.push(node(
      crown, 'daun-berlubang', [0, .29, 0],
      Parts.generateDeku_HeadLeafTengah(), { gloss: .30 }
    ));
  } else {
    // Deku kanan: dua kuncup, masing-masing dengan tangkai.
    const budMesh = Parts.generateDeku_HeadLeafKanan();

    for (const side of [-1, 1]) {
      const pivot = node(head, 'pivot-kuncup-' + side, [side * .48, .47, -.05]);
      pivot.rotation[2] = -side * .73;

      stems.push(node(
        pivot, 'tangkai-' + side, [0, 0, 0],
        Parts.generateDeku_Stem(.058, .36)
      ));

      headLeaves.push(node(
        pivot, 'kuncup-ellipsoid-' + side, [0, .44, 0],
        budMesh, { gloss: .43 }
      ));
    }
  }

  // Tungkai dan telapak mengikuti pivot kaki masing-masing.
  const legs = [];
  const feet = [];
  const footMeshes = Parts.generateDeku_Feet();

  for (const side of [-1, 1]) {
    const leg = node(
      rig,
      side < 0 ? 'pivot-kaki-kiri' : 'pivot-kaki-kanan',
      [side * .226, .45, -.08]
    );

    node(leg, 'tungkai', [0, -.12, 0], footMeshes.leg, { gloss: .28 });

    const foot = node(
      leg, 'telapak', [0, -.313, .14], footMeshes.foot, { gloss: .42 }
    );
    foot.rotation[1] = side * .16;

    legs.push(leg);
    feet.push(foot);
  }

  const joints = {
    rig, body, head, eyes, mouth, collar,
    neckLeaves, crown, headLeaves, stems, legs, feet
  };

  return {
    variant,
    root,
    joints,
    update(time, mode = 'idle') {
      poseDeku(joints, variant, time, mode);
    },
    draw(renderer, parentMatrix) {
      root.draw(renderer, parentMatrix);
    }
  };
}

function poseDeku(j, variant, t, mode) {
  const walk = mode === 'walk';
  const rest = mode === 'rest';
  const p = t * (walk ? 7 : 2.7) + ({ kiri: .1, tengah: .8, kanan: 1.5 }[variant]);

  j.rig.position[1] = rest ? 0 : walk
    ? .115 * Math.abs(Math.sin(p))
    : .026 * (1 + Math.sin(p));

  j.rig.rotation[2] = walk ? .042 * Math.sin(p) : 0;
  j.head.rotation[1] = rest ? 0 : (walk ? .12 : .065) * Math.sin(p * .52);
  j.head.rotation[0] = rest ? 0 : .033 * Math.sin(p + .6);
  j.head.scale[1] = walk ? 1 + .026 * Math.cos(p * 2) : 1;

  j.legs.forEach((leg, i) => {
    leg.rotation[0] = walk ? .58 * Math.sin(p + i * Math.PI) : 0;
  });

  j.crown.axis = [1, .24, .5];
  j.crown.angle = rest ? 0 : .095 * Math.sin(p + .7);

  j.headLeaves.forEach((leaf, i) => {
    leaf.axis = [1, .32, .46];
    leaf.angle = rest ? 0 : .062 * Math.sin(p + .63 * i);
  });

  j.neckLeaves.forEach((leaf, i) => {
    leaf.rotation[2] = rest ? 0 : .05 * Math.sin(p + .45 * i);
  });
}