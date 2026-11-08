import { createDekuModel } from './deku_scrub/dekuModel.js';
import { createOctorokModel } from './octorok/octorokModel.js';
import { createMajoraModel } from './MajoraMask/majoraModel.js';

export async function createSceneCharacters() {
  return [
    createDekuModel('kiri', {
      position: [-13.5, 0, 1]
    }),

    createDekuModel('tengah', {
      position: [-11, 0, 1.4]
    }),

    createDekuModel('kanan', {
      position: [-8.5, 0, 1]
    }),

    // Posisi awal Octorok berada di sungai.
    createOctorokModel({
      position: [7, 0, 1.2]
    }),

    createMajoraModel({
      position: [-11, 4, 12]
    })
  ];
}
