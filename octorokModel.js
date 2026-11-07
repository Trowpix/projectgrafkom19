import { MyObject } from './myObject.js';
import * as Parts from './octorokParts.js';

function add(parent, name, position = [0, 0, 0], mesh = null, material = { gloss: .50 }) {
  const n = parent.add(new MyObject(name, mesh, material));
  n.position = position;
  return n;
}

export function createOctorokModel({ position = [0, 0, 0] } = {}) {
  // Root untuk penempatan seluruh karakter dalam scene.
  const root = new MyObject('octorok');
  root.position = [...position];

  const rig = add(root, 'pivot-animasi');
  const head = add(rig, 'pivot-kepala', [0, 1.28, 0]);

  add(head, 'wajah', [0, 0, 0], Parts.generateOctorok_Face());

  add(
    head, 'kepala-bawah', [0, .75, -.23],
    Parts.generateOctorok_HeadLower(), { gloss: .65 }
  );

  add(
    head, 'kubah-paraboloid', [0, .75 + .76 * .52, -.23],
    Parts.generateOctorok_HeadUpper(), { gloss: .65 }
  );

  // Setiap mata punya pivot untuk seluruh komponennya.
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = add(head, 'pivot-mata-' + side, [side * .29, .15, .48]);
    eye.rotation[1] = side * .12;

    add(eye, 'bingkai', [0, 0, 0], Parts.generateOctorok_EyeFrame());

    add(
      eye, 'bola-mata', [0, 0, .028],
      Parts.generateOctorok_Eye(), { gloss: .24 }
    );

    const pupil = add(
      eye, 'pupil', [0, -.01, .168],
      Parts.generateOctorok_Pupil(), { gloss: 0 }
    );
    pupil.rotation[2] = side * .33;

    add(eye, 'kelopak-bezier', [0, 0, 0], Parts.generateOctorok_Eyelid());
    eyes.push(eye);
  }

  const mouth = add(head, 'pivot-moncong', [0, -.16, .47]);

  add(mouth, 'hyperboloid-luar', [0, 0, 0], Parts.generateOctorok_Snout());

  add(
    mouth, 'hyperboloid-dalam', [0, 0, 0],
    Parts.generateOctorok_Snout(true), { gloss: .1 }
  );

  add(mouth, 'torus-bibir', [0, 0, .53], Parts.generateOctorok_MouthRim());

  add(
    mouth, 'disk-gelap', [0, 0, .40],
    Parts.generateOctorok_MouthHole(), { emission: 1 }
  );

  // Tentakel berada di bawah rig, sehingga tidak ikut saat kepala menoleh.
  const legs = [];
const totalLegs = 8;

for (let i = 0; i < totalLegs; i++) {
  const angle = Math.PI / 8 + i * 2 * Math.PI / totalLegs;

  // Pangkal dipindahkan ke atas dan lebih dekat ke tengah
  // agar tertanam sedikit di dalam badan.
  const leg = add(
    rig,
    'pivot-tentakel-' + i,
    [
      Math.sin(angle) * .17,
      .92,
      Math.cos(angle) * .17
    ]
  );

  leg.rotation[1] = angle;

  add(
    leg,
    'tentakel-bezier',
    [0, 0, 0],
    Parts.generateOctorok_Tentacle()
  );

  const tip = add(
    leg,
    'cone-kuning',
    [0, -.34, .99],
    Parts.generateOctorok_Tip(),
    { gloss: .25 }
  );

  tip.rotation[0] = .72;
  legs.push(leg);
}

  const joints = { rig, head, eyes, mouth, legs };

  return {
    root,
    joints,

    update(time, mode = 'idle') {
      const active = mode === 'walk';
      const rest = mode === 'rest';
      const speed = active ? 6 : 2;

      rig.position[1] = rest ? 0 : (active ? .10 : .025) * (1 + Math.sin(time * speed));
      rig.rotation[2] = rest ? 0 : Math.sin(time * speed) * .025;
      head.rotation[1] = rest ? 0 : Math.sin(time * 1.1) * .09;
      head.rotation[0] = rest ? 0 : Math.sin(time * 1.5) * .025;

      legs.forEach((leg, i) => {
        const phase = i * 2 * Math.PI / legs.length;

        leg.rotation[0] = rest
          ? 0
          : Math.sin(time * speed + phase) * (active ? .15 : .045);
      });
    },

    draw(renderer, parentMatrix) {
      root.draw(renderer, parentMatrix);
    }
  };
}