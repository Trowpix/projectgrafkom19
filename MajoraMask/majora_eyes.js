import { ellipsoid } from './majora_quadric.js';

// t = 1 adalah titik paling depan bola mata.
function eyeColor(t) {
  const fromFront = (1 - t) * Math.PI;

  if (fromFront < .20) return [.03, .03, .04]; // Pupil hitam.
  if (fromFront < .40) return [.15, .82, .35]; // Iris hijau terang.
  if (fromFront < .50) return [.04, .10, .06]; // Cincin luar iris.

  // Gradasi kuning ke oranye-merah di tepi bola mata.
  const k = Math.min(1, (fromFront - .50) / .75);
  return [1, .92 * (1 - k) + .28 * k, .10 * (1 - k)];
}

export function generateMajora_Eyes() {
  return ellipsoid(.45, .45, .30, eyeColor, 72, 64);
}
