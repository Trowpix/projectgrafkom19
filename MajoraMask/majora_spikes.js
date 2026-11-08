import { ellipticCone } from './majora_quadric.js';

const orange = [1, .50, .04];
const yellow = [.98, .92, .15];
const pale = [1, 1, .65];
const red = [.94, .12, .18];
const green = [.10, .80, .32];
const blue = [.12, .45, .95];

function sampleColor(stops, t) {
  const scaled = t * (stops.length - 1);
  const i = Math.min(Math.floor(scaled), stops.length - 2);
  const f = scaled - i;

  return stops[i].map((k, c) => k + (stops[i + 1][c] - k) * f);
}

// Duri kanan dari atas ke bawah; sisi kiri dicerminkan di majoraModel.js.
// Warna dari pangkal ke ujung, sudut dalam derajat dari sumbu +x.
const spikes = [
  { name: 'tanduk', base: [.80, 1.10], angle: 82, length: 1.32, radius: .26, stops: [orange, yellow, pale] },
  { name: 'duri-1', base: [1.20, .85], angle: 38, length: 1.25, radius: .22, stops: [orange, yellow] },
  { name: 'duri-2', base: [1.38, .42], angle: 8, length: 1.32, radius: .22, stops: [yellow, yellow, pale] },
  { name: 'duri-3', base: [1.28, -.02], angle: -16, length: 1.28, radius: .22, stops: [yellow, orange, red] },
  { name: 'duri-4', base: [.95, -.32], angle: -38, length: 1.26, radius: .20, stops: [yellow, green] },
  { name: 'duri-5', base: [.62, -.66], angle: -60, length: 1.20, radius: .19, stops: [yellow, green, blue] }
];

export function generateMajora_Spikes() {
  return spikes.map(({ stops, radius, length, ...placement }) => ({
    ...placement,
    length,
    // Puncak cone (v = 0) menjadi ujung duri.
    mesh: ellipticCone(radius, radius * .8, length, [0, 1], t => sampleColor(stops, 1 - t))
  }));
}
