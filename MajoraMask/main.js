async function main() {
  const [{ LIBS }, { createMajoraModel }, { createMajoraRenderer }] = await Promise.all([
    import('./libs.js'),
    import('./majoraModel.js'),
    import('./majoraRenderer.js')
  ]);

  const canvas = document.querySelector('#majora');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true });

  if (!gl) throw new Error('WebGL tidak tersedia.');

  const renderer = createMajoraRenderer(gl);
  const character = createMajoraModel();

  const friction = .08, keySpeed = .04;
  let yaw = 0, pitch = 0, distance = 8.5;
  let spinX = 0, spinY = 0;
  let drag = null, paused = false, time = 0, last;
  let lost = false;
  let split = false;

  const splitButton = document.querySelector('#split');

  // Tombol tidak mengambil fokus klik, agar Spasi tetap menjeda animasi.
  splitButton.addEventListener('mousedown', e => e.preventDefault());

  splitButton.addEventListener('click', () => {
    split = !split;
    character.setSplit(split);
    splitButton.textContent = split ? 'Gabungkan' : 'Pisahkan';
    splitButton.setAttribute('aria-pressed', String(split));
  });

  const turn = () => {
    yaw -= spinX;
    pitch = Math.min(1.5, Math.max(-1.5, pitch + spinY));
  };

  // Seret canvas untuk memutar kamera; putaran berlanjut saat dilepas.
  canvas.addEventListener('pointerdown', e => {
    if (drag) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (drag?.id !== e.pointerId) return;

    spinX = (e.clientX - drag.x) * 2 * Math.PI / canvas.clientWidth;
    spinY = (e.clientY - drag.y) * 2 * Math.PI / canvas.clientHeight;
    turn();

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
    distance = Math.max(3, Math.min(14, distance + e.deltaY * .005));
  }, { passive: false });

  // WASD memutar kamera; Spasi untuk animasi; R untuk reset kamera; E untuk garis sumbu.
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyW') spinY -= keySpeed;
    if (e.code === 'KeyS') spinY += keySpeed;
    if (e.code === 'KeyA') spinX -= keySpeed;
    if (e.code === 'KeyD') spinX += keySpeed;

    if (e.repeat) return;

    if (e.code === 'Space') {
      e.preventDefault();
      paused = !paused;
    }

    if (e.code === 'KeyE') character.toggleAxisLine();

    if (e.code === 'KeyR') {
      yaw = 0;
      pitch = 0;
      spinX = 0;
      spinY = 0;
      distance = 8.5;
    }
  });

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    lost = true;
    console.error('[Majora] Konteks WebGL terputus. Muat ulang halaman.');
  });

  function frame(now) {
    if (lost) return;

    if (last !== undefined && !paused) {
      time += Math.min(.05, (now - last) / 1000);
    }
    last = now;

    if (!drag) {
      spinX *= 1 - friction;
      spinY *= 1 - friction;
      turn();
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // Lebar pandang tetap, jadi topeng tidak terpotong saat jendela menyempit.
    const aspect = w / h;
    const fov = 2 * Math.atan(2 * Math.tan(Math.PI / 9) / aspect);
    const target = [0, 0, 0];

    // Kamera mundur saat terpisah agar tanduk tidak terpotong di atas.
    const reach = distance * (split ? 1.3 : 1);
    const eye = [
      reach * Math.sin(yaw) * Math.cos(pitch),
      reach * Math.sin(pitch),
      reach * Math.cos(yaw) * Math.cos(pitch)
    ];

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    renderer.beginFrame({
      view: LIBS.lookAt(eye, target),
      projection: LIBS.perspective(fov, aspect, 1, 100)
    });

    character.update(time, paused ? 'rest' : 'idle');
    character.draw(renderer);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main().catch(err => console.error('[Majora] Gagal memulai:', err));
