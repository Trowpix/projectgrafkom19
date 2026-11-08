import { hyperboloid } from './majora_quadric.js';

// Bingkai mata: bagian belakang melebar, bagian depan menyempit di sekitar bola mata.
export function generateMajora_EyeRim() {
  return hyperboloid(.50, .50, .30, [-.75, 0], t => {
    const gold = Math.max(0, (t - .72) / .28);
    return [.45 + .50 * gold, .05 + .68 * gold, .22 - .10 * gold];
  });
}

// Lingkar gelap tepat di belakang bola mata.
export function generateMajora_EyeShadow() {
  return hyperboloid(.455, .455, .10, [-.55, .12], () => [.05, .03, .07]);
}
