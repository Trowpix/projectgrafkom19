import { LIBS } from './deku_scrub/libs.js';
import { createDekuRenderer } from './octorok/octorokRenderer.js';
import { createForest } from './Environment/forestModel.js';
import { createSceneCharacters } from './sceneCharacters.js';

async function main() {
  const canvas = document.querySelector('#scene');
  const gl = canvas.getContext('webgl', { antialias: true });

  if (!gl) throw new Error('WebGL tidak tersedia.');

  const renderer = createDekuRenderer(gl);
  const forest = createForest();
  const characters = await createSceneCharacters();

  let yaw = .12, pitch = .34, zoom = 1;
  let drag = null, paused = false, time = 0, last;

  canvas.addEventListener('pointerdown', e => {
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY
    };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (drag?.id !== e.pointerId) return;

    yaw -= (e.clientX - drag.x) * .006;
    pitch = Math.max(
      .10,
      Math.min(.95, pitch + (e.clientY - drag.y) * .006)
    );

    drag.x = e.clientX;
    drag.y = e.clientY;
  });

  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(event, e => {
      if (drag?.id === e.pointerId) drag = null;
    });
  }

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    zoom = Math.max(
      .72,
      Math.min(1.55, zoom * Math.exp(e.deltaY * .001))
    );
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.repeat) return;

    if (e.code === 'Space') {
      e.preventDefault();
      paused = !paused;
    }

    if (e.code === 'KeyR') {
      yaw = .12;
      pitch = .34;
      zoom = 1;
    }
  });

  function frame(now) {
    if (last !== undefined && !paused) {
      time += Math.min(.05, (now - last) / 1000);
    }
    last = now;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const aspect = w / h;
    const fov = Math.PI / 4;
    const distance = Math.max(
      19,
      8.2 / (Math.tan(fov / 2) * aspect)
    ) * zoom;

    const target = [-.6, 1.7, -1.7];

    const eye = [
      target[0] + distance * Math.sin(yaw) * Math.cos(pitch),
      target[1] + distance * Math.sin(pitch),
      target[2] + distance * Math.cos(yaw) * Math.cos(pitch)
    ];

    gl.viewport(0, 0, w, h);
    gl.clearColor(.40, .56, .42, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderer.beginFrame({
      view: LIBS.lookAt(eye, target),
      projection: LIBS.perspective(fov, aspect, .1, 150),
      eye
    });

    forest.update(time);
    forest.draw(renderer);

    for (const model of characters) {
      model.update(time, 'idle');
      model.draw(renderer);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main().catch(e => console.error('[Scene hutan]', e));