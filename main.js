import { LIBS } from './libs.js';
import { createOctorokModel } from './octorokModel.js';
import { createDekuRenderer as createOctorokRenderer } from './octorokRenderer.js';

function main() {
  const canvas = document.querySelector('#octorok');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
  if (!gl) throw new Error('WebGL tidak tersedia.');

  const renderer = createOctorokRenderer(gl);
  const character = createOctorokModel();

  let yaw = .23, pitch = .10, zoom = 1;
  let drag = null, paused = false, active = false, time = 0, last;

  canvas.addEventListener('pointerdown', e => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (drag?.id !== e.pointerId) return;

    yaw -= (e.clientX - drag.x) * .008;
    pitch = Math.max(-.7, Math.min(1.2, pitch + (e.clientY - drag.y) * .008));
    drag.x = e.clientX;
    drag.y = e.clientY;
  });

  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(name, e => {
      if (drag?.id === e.pointerId) drag = null;
    });
  }

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    zoom = Math.max(.55, Math.min(2.2, zoom * Math.exp(e.deltaY * .001)));
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.repeat) return;

    if (e.code === 'Space') {
      e.preventDefault();
      paused = !paused;
    }

    if (e.code === 'KeyW') active = !active;

    if (e.code === 'KeyR') {
      yaw = .23;
      pitch = .10;
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
    const distance = Math.max(5.6, 1.9 / (Math.tan(fov / 2) * aspect)) * zoom;
    const eye = [
      distance * Math.sin(yaw) * Math.cos(pitch),
      1.48 + distance * Math.sin(pitch),
      distance * Math.cos(yaw) * Math.cos(pitch)
    ];

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderer.beginFrame({
      view: LIBS.lookAt(eye, [0, 1.48, 0]),
      projection: LIBS.perspective(fov, aspect, .1, Math.max(100, distance * 2)),
      eye
    });

    character.update(time, active ? 'walk' : 'idle');
    character.draw(renderer);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

try {
  main();
} catch (err) {
  console.error('[Octorok] Gagal memulai:', err);
}