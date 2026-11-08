import { MyObject } from './myObject.js';
import * as Parts from './majoraParts.js';

function node(parent, name, position = [0, 0, 0], mesh = null, material = {}) {
  const child = parent.add(new MyObject(name, mesh, material));
  child.position = position;
  return child;
}

export function createMajoraModel({ position = [0, 0, 0] } = {}) {
  // Root untuk posisi seluruh karakter; rig untuk gerakan internal.
  const root = new MyObject('majora');
  root.position = [...position];
  const rig = node(root, 'pivot-animasi');

  // Badan topeng: tiga ellipsoid dan satu elliptic cone.
  const body = { gloss: .30 };
  const mask = node(rig, 'wajah', Parts.facePlacement, Parts.generateMajora_Face(), body);
  const lobeMesh = Parts.generateMajora_Lobe();

  // Anak topeng memakai koordinat relatif terhadap pusat wajah.
  const offset = ([x, y, z]) => [x, y - Parts.facePlacement[1], z];

  for (const side of [-1, 1]) {
    node(mask, 'lobus-' + side, offset(Parts.lobePlacement(side)), lobeMesh, body);
  }

  const chin = node(
    mask, 'dagu', offset(Parts.chinPlacement.position), Parts.generateMajora_Chin(), body
  );
  chin.rotation = Parts.chinPlacement.rotation;

  // Mata: bingkai hyperboloid dan bola mata ellipsoid.
  const eyes = [];
  const rims = [];
  const rimMesh = Parts.generateMajora_EyeRim();
  const shadowMesh = Parts.generateMajora_EyeShadow();
  const eyeMesh = Parts.generateMajora_Eyes();

  for (const side of [-1, 1]) {
    const x = side * .74, y = .28;
    const pivot = node(mask, 'pivot-mata-' + side, offset([x, y, Parts.maskFront(x, y) + .14]));
    pivot.rotation[1] = side * .20;

    rims.push(node(pivot, 'bingkai', [0, 0, 0], rimMesh, { gloss: .45 }));
    node(pivot, 'bayangan', [0, 0, .02], shadowMesh);
    eyes.push(node(pivot, 'bola-mata', [0, 0, -.10], eyeMesh, { gloss: .9, emission: .18 }));
  }

  // Sumbu z cone mengarah dari ujung duri ke pangkalnya.
  const spikes = [];

  for (const { name, mesh, base, angle, length } of Parts.generateMajora_Spikes()) {
    const a = angle * Math.PI / 180;

    for (const side of [-1, 1]) {
      const dx = side * Math.cos(a) * length, dy = Math.sin(a) * length;
      const spike = node(
        mask, name + '-' + side, offset([side * base[0] + dx, base[1] + dy, 0]), mesh, { gloss: .55 }
      );

      spike.rotation = Parts.aimRotation([-dx, -dy, 0]);

      // Disimpan agar duri memanjang dari pangkalnya.
      spike.base = offset([side * base[0], base[1], 0]);
      spike.direction = [dx, dy, 0];
      spikes.push(spike);
    }
  }

  const patterns = Parts.generateMajora_FacePatterns().map(({ name, mesh, position, rotation, scale }) => {
    const pattern = node(mask, name, offset(position), mesh, { gloss: .35 });
    pattern.rotation = rotation;
    pattern.scale = scale;
    return pattern;
  });

  const joints = { rig, mask, eyes, rims, spikes, patterns };

  return {
    root,
    joints,
    update(time, mode = 'idle') {
      poseMajora(joints, time, mode);
    },
    draw(renderer, parentMatrix) {
      root.draw(renderer, parentMatrix);
    }
  };
}

// Durasi tiap tahap animasi, dalam detik.
const idleTime = 5, riseTime = .4, spinTime = 1.5, fallTime = .6;
const trickTime = riseTime + spinTime + fallTime;
const jumpHeight = .6, spinTurns = 3;

const clamp = k => Math.min(1, Math.max(0, k));
const easeOut = k => 1 - (1 - clamp(k)) ** 3;
const smooth = k => clamp(k) ** 2 * (3 - 2 * clamp(k));

// Animasi melayang halus khas Majora's Mask.
// Hasil: [naik-turun, putaran Y, putaran Z].
function idlePose(t) {
  return [.16 * Math.sin(t * 2.5), .50 * Math.sin(t * .9), .12 * Math.sin(t * 1.8)];
}

// Detak ganda seperti jantung, satu siklus setiap 1.4 detik.
function heartbeat(t) {
  const k = t % 1.4;
  const beat = (center, width) => Math.exp(-(((k - center) / width) ** 2));

  return beat(.18, .09) + .65 * beat(.48, .10);
}

function poseMajora(j, t, mode) {
  if (mode === 'rest') {
    j.rig.position[1] = j.rig.rotation[1] = j.rig.rotation[2] = 0;
    j.rig.scale = [1, 1, 1];
    j.eyes.forEach(eye => { eye.scale = [1, 1, 1]; });
    j.spikes.forEach(spike => stretchSpike(spike, 1));
    return;
  }

  const flying = mode === 'terbang';
  const cycle = t % (idleTime + trickTime);

  // Mode 'melayang' sama seperti idle, tetapi tanpa putaran cepat.
  const trick = mode === 'idle' && cycle >= idleTime;

  let pose = idlePose(t), lift = 0, spin = 0, pop = 0;

  if (flying) {
    pose = [.20 * Math.sin(t * 5), .14 * Math.sin(t * 2.6), .10 * Math.sin(t * 3.2)];
  }

  if (trick) {
    const k = cycle - idleTime;
    const start = idlePose(idleTime + t - cycle);
    const end = idlePose(t - cycle + idleTime + trickTime);
    const blend = smooth(k / trickTime);

    // Pose idle berpindah ke awal siklus agar idle berikutnya tersambung.
    pose = start.map((value, i) => value + (end[i] - value) * blend);
    lift = jumpHeight * easeOut(k / riseTime) * (1 - smooth((k - riseTime - spinTime) / fallTime));
    spin = spinTurns * 2 * Math.PI * smooth((k - riseTime) / spinTime);

    // Topeng membesar selama berputar, lalu kembali normal.
    pop = smooth(k / riseTime) * (1 - smooth((k - riseTime - spinTime) / fallTime));
  }

  j.rig.position[1] = pose[0] + lift;
  j.rig.rotation[1] = pose[1];
  j.rig.rotation[2] = pose[2] + spin;

  // Scaling: berdetak seperti jantung dan membesar saat berputar.
  const beat = heartbeat(t * (flying ? 1.5 : 1));
  const size = 1 + .11 * beat + .34 * pop;

  j.rig.scale = [size, size, size];

  const eyeSize = 1 + .22 * beat;

  j.eyes.forEach(eye => { eye.scale = [eyeSize, eyeSize, eyeSize]; });

  j.spikes.forEach((spike, i) => {
    stretchSpike(spike, 1 + .24 * Math.sin(t * 2.4 + i * .7) + .32 * pop);
  });
}

// Pusat duri berada di ujung, jadi posisinya ikut digeser.
function stretchSpike(spike, length) {
  spike.scale = [1, 1, length];
  spike.position = spike.base.map((value, i) => value + spike.direction[i] * length);
}
