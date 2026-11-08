async function main() {
  const [{ LIBS }, { createDekuModel }, { createDekuRenderer }] = await Promise.all([
    import('./libs.js'),
    import('./dekuModel.js'),
    import('./dekuRenderer.js')
  ]);

  const canvas = document.querySelector('#deku');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true });

  if (!gl) throw new Error('WebGL tidak tersedia.');

  const renderer = createDekuRenderer(gl);
  const characters = [
    createDekuModel('kiri', { position: [-2.60, 0, 0] }),
    createDekuModel('tengah', { position: [0, 0, .18] }),
    createDekuModel('kanan', { position: [2.60, 0, 0] })
  ];

  characters[0].root.rotation[1] = -.12;
  characters[2].root.rotation[1] = .13;

  let yaw = .10, pitch = .075, zoom = 1;
  let drag = null, paused = false, time = 0, last;
  let lost = false;

  // Seret canvas untuk memutar kamera.
  canvas.addEventListener('pointerdown', e => {
    if (drag) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (drag?.id !== e.pointerId) return;

    yaw -= (e.clientX - drag.x) * .008;
    pitch = Math.min(1.22, Math.max(-.72, pitch + (e.clientY - drag.y) * .008));

    drag.x = e.clientX;
    drag.y = e.clientY;
  });

  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(name, e => {
      if (drag?.id === e.pointerId) drag = null;
    });
  }

  // Gulir untuk zoom.
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    zoom = Math.max(.52, Math.min(2.1, zoom * Math.exp(e.deltaY * .001)));
  }, { passive: false });

  // Spasi untuk jeda animasi; R untuk reset kamera.
  window.addEventListener('keydown', e => {
    if (e.repeat) return;

    if (e.code === 'Space') {
      e.preventDefault();
      paused = !paused;
    }

    if (e.code === 'KeyR') {
      yaw = .10;
      pitch = .075;
      zoom = 1;
    }
  });

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    lost = true;
    console.error('[Deku] Konteks WebGL terputus. Muat ulang halaman.');
  });

  function frame(now) {
    if (lost) return;

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
    const fov = Math.PI / 4.6;
    const distance = Math.max(7.55, 4.40 / (Math.tan(fov / 2) * aspect)) * zoom;
    const target = [0, 2.10, 0];
    const eye = [
      distance * Math.sin(yaw) * Math.cos(pitch),
      target[1] + distance * Math.sin(pitch),
      distance * Math.cos(yaw) * Math.cos(pitch)
    ];

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderer.beginFrame({
      view: LIBS.lookAt(eye, target),
      projection: LIBS.perspective(fov, aspect, .1, Math.max(100, distance * 2)),
      eye
    });

    for (const character of characters) {
      character.update(time, 'idle');
      character.draw(renderer);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main().catch(err => console.error('[Deku] Gagal memulai:', err));