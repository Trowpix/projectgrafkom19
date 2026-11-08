import { MyObject } from '../deku_scrub/myObject.js';
import * as G from './forestGeometry.js';

export function createForest() {
  const root = new MyObject('forest');

  function add(
    name,
    mesh,
    position = [0, 0, 0],
    scale = [1, 1, 1],
    material = { gloss: 0 }
  ) {
    const n = root.add(new MyObject(name, mesh, material));
    n.position = position;
    n.scale = scale;
    return n;
  }

  add('tanah', G.ground());

  add(
    'jalan-setapak',
    G.ribbon(
      z => -.6 + Math.sin(z * .32) * .55,
      .82,
      .003,
      [.47, .41, .23]
    )
  );

  add(
    'tepi-sungai',
    G.ribbon(
      z => 5 + Math.sin(z * .39) * .9,
      1.05,
      .007,
      [.28, .30, .17]
    )
  );

  const water = add(
    'air',
    G.ribbon(
      z => 5 + Math.sin(z * .39) * .9,
      .79,
      .016,
      [.17, .48, .43]
    ),
    [0, 0, 0],
    [1, 1, 1],
    { gloss: .4 }
  );

  // Mesh yang sama dipakai ulang oleh beberapa pohon.
  const trunkMesh = G.trunk();
  const crownA = G.ellipsoid(1.35, .90, 1.18, [.16, .34, .11]);
  const crownB = G.ellipsoid(1.12, .75, 1.05, [.25, .44, .13]);

  function tree(x, z, size = 1) {
    const t = root.add(new MyObject('pohon'));
    t.position = [x, 0, z];
    t.scale = [size, size, size];

    function piece(name, mesh, position) {
      const n = t.add(new MyObject(name, mesh, { gloss: 0 }));
      n.position = position;
      return n;
    }

    piece('batang', trunkMesh, [0, 0, 0]);
    piece('tajuk-1', crownA, [0, 3.75, 0]);
    piece('tajuk-2', crownB, [-.72, 3.39, .24]);
    piece('tajuk-3', crownB, [.70, 3.55, -.18]);

    const rootMesh = G.ellipsoid(.55, .14, .20, [.25, .15, .06]);

    for (let i = 0; i < 3; i++) {
      const a = i * 2 * Math.PI / 3;
      const n = piece(
        'akar',
        rootMesh,
        [Math.cos(a) * .28, .04, Math.sin(a) * .28]
      );
      n.rotation[1] = -a;
    }
  }

  // Area depan-tengah dibiarkan terbuka untuk karakter.
  [
    [-8, 5, 1.35],
    [8, 4, 1.30],
    [-8, -1, 1.2],
    [8, -2, 1.15],
    [-8, -7, 1.1],
    [-5, -8, 1.28],
    [-2, -9, 1.1],
    [1, -9, 1.2],
    [4, -8, 1.18],
    [8, -8, 1.3]
  ].forEach(p => tree(...p));

  const bush = G.ellipsoid(.72, .50, .61, [.28, .46, .12]);

  [
    [-7, 2], [-6, -5], [-3, -6], [2, -6],
    [8, 1], [8, -4], [-8, -3], [3, -7]
  ].forEach(([x, z], i) => {
    add('semak-' + i, bush, [x, .27, z]);
    add('semak-kecil-' + i, bush, [x + .5, .2, z + .2], [.7, .8, .8]);
  });

  const rock = G.ellipsoid(.55, .34, .43, [.36, .39, .30]);

  [
    [3.9, 3], [6, 1], [3.7, -2], [5.5, -5],
    [-5, 3], [-6, -4], [2.8, -6]
  ].forEach(([x, z], i) => {
    const n = add(
      'batu-' + i,
      rock,
      [x, .18, z],
      [1, .8 + (i % 3) * .15, 1]
    );
    n.rotation[1] = i * .9;
  });

  const flower = G.ellipsoid(.09, .10, .09, [.85, .72, .26]);

  [
    [-6, 1], [-5.7, 1.2], [-6.1, .7],
    [2.4, -5], [2.6, -5.2], [7, 2]
  ].forEach(([x, z], i) => {
    add('bunga-' + i, flower, [x, .15, z]);
  });

  return {
    root,

    update(time) {
      // Perubahan kilap ringan, bukan simulasi gelombang air.
      water.material.gloss = .35 + .08 * Math.sin(time * .8);
    },

    draw(renderer) {
      root.draw(renderer);
    }
  };
}