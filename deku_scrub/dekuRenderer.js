import { LIBS } from './libs.js';

const vertex = `
attribute vec3 aPosition, aNormal, aColor;
uniform mat4 uModel, uView, uProjection;
uniform mat3 uNormal;
varying vec3 vNormal, vColor, vPosition;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vPosition = world.xyz;
  vNormal = uNormal * aNormal;
  vColor = aColor;
  gl_Position = uProjection * uView * world;
}
`;

const fragment = `
precision mediump float;
varying vec3 vNormal, vColor, vPosition;
uniform vec3 uEye;
uniform float uGloss, uEmission;

void main() {
  vec3 viewDir = normalize(uEye - vPosition);
  vec3 n = normalize(vNormal);
  if (dot(n, viewDir) < 0.0) n = -n;

  vec3 light = normalize(vec3(-0.52, 0.85, 0.66));
  vec3 fill = normalize(vec3(0.57, 0.22, -0.69));
  float key = max(dot(n, light), 0.0);
  float back = max(dot(n, fill), 0.0);
  float spec = pow(max(dot(n, normalize(light + viewDir)), 0.0), 33.0);
  float rim = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0) * back;

  vec3 lit = vColor * (0.56 + 0.50 * key + 0.17 * back)
           + uGloss * spec * vec3(1.0, 0.91, 0.72)
           + rim * vec3(0.045, 0.075, 0.065);

  gl_FragColor = vec4(mix(lit, vColor, uEmission), 1.0);
}
`;

export function createDekuRenderer(gl) {
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  const p = gl.createProgram();
  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);

  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p));
  }

  const a = ['aPosition', 'aNormal', 'aColor'].map(n => gl.getAttribLocation(p, n));
  const u = Object.fromEntries(
    ['Model', 'View', 'Projection', 'Normal', 'Eye', 'Gloss', 'Emission']
      .map(n => [n, gl.getUniformLocation(p, 'u' + n)])
  );
  const cache = new Map();

  const buffer = (target, data) => {
    const b = gl.createBuffer();
    gl.bindBuffer(target, b);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return b;
  };

  return {
    beginFrame({ view, projection, eye }) {
      gl.useProgram(p);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE); // Daun tipis terlihat dari kedua sisi.
      gl.uniformMatrix4fv(u.View, false, view);
      gl.uniformMatrix4fv(u.Projection, false, projection);
      gl.uniform3fv(u.Eye, eye);
    },

    drawMesh(mesh, world, material = {}) {
      if (!cache.has(mesh)) {
        const values = new Float32Array(mesh.vertices.length * 3);
        for (let i = 0; i < mesh.vertices.length; i += 3) {
          values.set(mesh.vertices.slice(i, i + 3), i * 3);
          values.set(mesh.normals.slice(i, i + 3), i * 3 + 3);
          values.set(mesh.colors.slice(i, i + 3), i * 3 + 6);
        }
        cache.set(mesh, {
          v: buffer(gl.ARRAY_BUFFER, values),
          i: buffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices)),
          count: mesh.indices.length
        });
      }

      const b = cache.get(mesh);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.v);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.i);

      a.forEach((loc, i) => {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 36, i * 12);
      });

      gl.uniformMatrix4fv(u.Model, false, world);
      gl.uniformMatrix3fv(u.Normal, false, LIBS.normalMatrix(world));
      gl.uniform1f(u.Gloss, material.gloss ?? .15);
      gl.uniform1f(u.Emission, material.emission ?? 0);
      gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_SHORT, 0);
    },

    dispose() {
      for (const { v, i } of cache.values()) {
        gl.deleteBuffer(v);
        gl.deleteBuffer(i);
      }
      cache.clear();
      gl.deleteProgram(p);
    }
  };
}