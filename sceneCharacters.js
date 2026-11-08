import { createDekuModel } from './deku_scrub/dekuModel.js';
import { createOctorokModel } from './octorok/octorokModel.js';

export async function createSceneCharacters() {
  const models = [
    createDekuModel('kiri', {
      position: [-5.5, 0, 1.1]
    }),

    createDekuModel('tengah', {
      position: [-3.1, 0, 1.4]
    }),

    createDekuModel('kanan', {
      position: [-.8, 0, 1.1]
    }),

    createOctorokModel({
      position: [3.0, 0, 1.3]
    })
  ];

  // Sambungan Majora belum diaktifkan.
  // Nama file, fungsi, dan cara pemanggilannya perlu disesuaikan
  // dengan kode model Majora yang kamu punya.
  //
  // const { createMajoraModel } =
  //   await import('./majora_mask/majoraModel.js');
  //
  // const majora = createMajoraModel({
  //   position: [1.2, 0, -1.8]
  // });
  //
  // models.push(majora);

  return models;
}