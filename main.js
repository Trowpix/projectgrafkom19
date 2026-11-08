import { LIBS } from './deku_scrub/libs.js';

import {
  createDekuRenderer
} from './octorok/octorokRenderer.js';

import {
  createForest
} from './Environment/forestModel.js';

import {
  createSceneCharacters
} from './sceneCharacters.js';

async function main() {
  const canvas = document.querySelector('#scene');

  const gl = canvas.getContext('webgl', {
    antialias: true,
    alpha: true,
    premultipliedAlpha: true
  });

  if (!gl) {
    throw new Error('WebGL tidak tersedia.');
  }

  const renderer = createDekuRenderer(gl);
  const environment = createForest();
  const characters = await createSceneCharacters();

  let yaw = .12;
  let pitch = .40;
  let zoom = 1;

  let drag = null;
  let paused = false;
  let time = 0;
  let last;

  // ==================== KONTROL MOUSE ====================

  canvas.addEventListener('pointerdown', event => {
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };

    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;

    yaw -= (event.clientX - drag.x) * .006;

    pitch = Math.max(
      -.12,
      Math.min(
        .95,
        pitch + (event.clientY - drag.y) * .006
      )
    );

    drag.x = event.clientX;
    drag.y = event.clientY;
  });

  for (const namaEvent of [
    'pointerup',
    'pointercancel',
    'lostpointercapture'
  ]) {
    canvas.addEventListener(namaEvent, event => {
      if (drag?.id === event.pointerId) {
        drag = null;
      }
    });
  }

  canvas.addEventListener('wheel', event => {
    event.preventDefault();

    zoom = Math.max(
      .65,
      Math.min(
        1.6,
        zoom * Math.exp(event.deltaY * .001)
      )
    );
  }, { passive: false });

  // ==================== KONTROL KEYBOARD ====================

  window.addEventListener('keydown', event => {
    if (event.repeat) return;

    if (event.code === 'Space') {
      event.preventDefault();
      paused = !paused;
    }

    if (event.code === 'KeyR') {
      yaw = .12;
      pitch = .40;
      zoom = 1;
    }
  });

  // ==================== ANIMASI ====================

  function frame(now) {
    if (last !== undefined && !paused) {
      time += Math.min(.05, (now - last) / 1000);
    }

    last = now;

    const dpr = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    const width = Math.max(
      1,
      Math.round(canvas.clientWidth * dpr)
    );

    const height = Math.max(
      1,
      Math.round(canvas.clientHeight * dpr)
    );

    if (
      canvas.width !== width ||
      canvas.height !== height
    ) {
      canvas.width = width;
      canvas.height = height;
    }

    const aspect = width / height;
    const fov = Math.PI / 4;

    // Jarak kamera menyesuaikan layar agar pulau terlihat.
    const distance = Math.max(
      23,
      11.5 / (Math.tan(fov / 2) * aspect)
    ) * zoom;

    const target = [0, .2, -.5];

    const eye = [
      target[0] +
        distance * Math.sin(yaw) * Math.cos(pitch),

      target[1] +
        distance * Math.sin(pitch),

      target[2] +
        distance * Math.cos(yaw) * Math.cos(pitch)
    ];

    gl.viewport(0, 0, width, height);

    // Alpha 0 membuat bagian kosong canvas transparan.
    // Gambar background di belakang canvas menjadi terlihat.
    gl.clearColor(0, 0, 0, 0);

    gl.clear(
      gl.COLOR_BUFFER_BIT |
      gl.DEPTH_BUFFER_BIT
    );

    renderer.beginFrame({
      view: LIBS.lookAt(eye, target),

      projection: LIBS.perspective(
        fov,
        aspect,
        .1,
        150
      ),

      eye
    });

    environment.update(time);
    environment.draw(renderer);

    for (const model of characters) {
      model.update(time, 'idle');
      model.draw(renderer);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main().catch(error => {
  console.error('[Pulau Melayang]', error);
});