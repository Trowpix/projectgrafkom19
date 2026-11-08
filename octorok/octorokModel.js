import { LIBS } from './libs.js';
import { MyObject } from './myObject.js';
import * as Parts from './octorokParts.js';

function add(
  parent,
  name,
  position = [0, 0, 0],
  mesh = null,
  material = { gloss: .50 }
) {
  const node = parent.add(
    new MyObject(name, mesh, material)
  );

  node.position = position;
  return node;
}

// Gerakan halus dengan kombinasi dua gelombang.
// Fase berbeda memberi variasi pada tiap tentakel dan joint.
function gentleMotion(time, seed) {
  return (
    Math.sin(time * .57 + seed) * .65 +
    Math.sin(time * .31 + seed * 2.37) * .35
  );
}

export function createOctorokModel({
  position = [0, 0, 0]
} = {}) {
  const root = new MyObject('octorok');
  root.position = [...position];

  const rig = add(root, 'pivot-animasi');
  const head = add(rig, 'pivot-kepala', [0, 1.28, 0]);

  add(
    head, 'wajah', [0, 0, 0],
    Parts.generateOctorok_Face()
  );

  add(
    head, 'kepala-bawah', [0, .75, -.23],
    Parts.generateOctorok_HeadLower(),
    { gloss: .65 }
  );

  add(
    head, 'kubah-paraboloid',
    [0, .75 + .76 * .52, -.23],
    Parts.generateOctorok_HeadUpper(),
    { gloss: .65 }
  );

  const eyes = [];

  for (const side of [-1, 1]) {
    const eye = add(
      head, 'pivot-mata-' + side,
      [side * .29, .15, .48]
    );

    eye.rotation[1] = side * .12;

    add(
      eye, 'bingkai', [0, 0, 0],
      Parts.generateOctorok_EyeFrame()
    );

    add(
      eye, 'bola-mata', [0, 0, .028],
      Parts.generateOctorok_Eye(),
      { gloss: .24 }
    );

    const pupil = add(
      eye, 'pupil', [0, -.01, .168],
      Parts.generateOctorok_Pupil(),
      { gloss: 0 }
    );

    pupil.rotation[2] = side * .33;

    add(
      eye, 'kelopak-bezier', [0, 0, 0],
      Parts.generateOctorok_Eyelid()
    );

    eyes.push(eye);
  }

  // Moncong dipendekkan, tetapi ukuran bibir tetap.
  const mouth = add(
    head, 'pivot-moncong', [0, -.16, .47]
  );

  const mouthLength = .78;

  const outer = add(
    mouth, 'hyperboloid-luar', [0, 0, 0],
    Parts.generateOctorok_Snout()
  );
  outer.scale[2] = mouthLength;

  const inner = add(
    mouth, 'hyperboloid-dalam', [0, 0, 0],
    Parts.generateOctorok_Snout(true),
    { gloss: .1 }
  );
  inner.scale[2] = mouthLength;

  add(
    mouth, 'torus-bibir',
    [0, 0, .53 * mouthLength],
    Parts.generateOctorok_MouthRim()
  );

  add(
    mouth, 'disk-gelap',
    [0, 0, .40 * mouthLength],
    Parts.generateOctorok_MouthHole(),
    { emission: 1 }
  );

  const legs = [];
  const tentacles = [];

  for (let i = 0; i < 8; i++) {
    const angle = Math.PI / 8 + i * 2 * Math.PI / 8;

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

    // Setiap kaki harus memiliki mesh sendiri,
    // karena posisinya berubah mengikuti joint masing-masing.
    const mesh = Parts.generateOctorok_Tentacle();
    const skin = Parts.setupTentacleSkin(mesh, LIBS);

    const joint1 = add(
      leg, 'joint-1', [0, 0, 0]
    );

    const joint2 = add(
      joint1,
      'joint-2',
      skin.bind[1].map((v, k) => v - skin.bind[0][k])
    );

    const joint3 = add(
      joint2,
      'joint-3',
      skin.bind[2].map((v, k) => v - skin.bind[1][k])
    );

    // Mesh mengikuti ketiga joint melalui deformasi.
    add(
      leg, 'mesh-tentakel', [0, 0, 0],
      mesh, { gloss: .50 }
    );

    // Cone mengikuti joint terakhir.
    const tip = add(
      joint3,
      'cone-kuning',
      skin.end.map((v, k) => v - skin.bind[2][k]),
      Parts.generateOctorok_Tip(),
      { gloss: .50 }
    );

    tip.rotation[0] = Math.atan2(.21, .27);

    legs.push(leg);
    tentacles.push({
      joints: [joint1, joint2, joint3],
      skin,
      seed: i * 2.71 + .4
    });
  }

  const joints = {
    rig, head, eyes, mouth, legs, tentacles
  };

  return {
    root,
    joints,

    update(time, mode = 'idle') {
      const rest = mode === 'rest';
      const t = time * (mode === 'walk' ? 1.25 : 1);

      // Badan bergerak sangat sedikit.
      rig.position[1] = rest
        ? 0
        : .012 * (1 + Math.sin(t * 1.15));

      rig.rotation[2] = rest
        ? 0
        : .012 * Math.sin(t * .75);

      head.rotation[1] = rest
        ? 0
        : .035 * Math.sin(t * .65);

      head.rotation[0] = rest
        ? 0
        : .015 * Math.sin(t * .9);

      // Gerakan mengisap udara.
      const breath = rest ? 0 : Math.sin(t * 1.35);

      // Moncong maju-mundur mengikuti napas.
      mouth.position[2] = .47 + .055 * breath;  

      // Sedikit perubahan bukaan mulut.
      mouth.scale[0] = 1 - .018 * breath;
      mouth.scale[1] = 1 - .018 * breath;

      for (const tentacle of tentacles) {
        tentacle.joints.forEach((joint, j) => {
          const seed = tentacle.seed + j * 1.83;

          // Joint pangkal paling tenang.
          // Pangkal tenang, bagian tengah dan ujung lebih lentur.
          const amplitude = [.07, .14, .22][j];

          joint.rotation[0] = rest ? 0
            : amplitude * gentleMotion(t, seed);

          joint.rotation[1] = rest ? 0
            : amplitude * .65 * gentleMotion(t, seed + 5.2);

          joint.rotation[2] = rest ? 0
            : amplitude * .45 * gentleMotion(t, seed + 9.4);
        });

        tentacle.skin.deform(tentacle.joints);
      }
    },

    draw(renderer, parentMatrix) {
      root.draw(renderer, parentMatrix);
    }
  };
}