import { LIBS } from './libs.js';

const vertexShaderSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormal;

varying vec3 vNormal;
varying vec3 vColor;
varying vec3 vPosition;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);

  vPosition = world.xyz;
  vNormal = uNormal * aNormal;
  vColor = aColor;

  gl_Position = uProjection * uView * world;
}
`;

const fragmentShaderSource = `
precision mediump float;

varying vec3 vNormal;
varying vec3 vColor;
varying vec3 vPosition;

uniform vec3 uEye;
uniform float uGloss;
uniform float uEmission;

void main() {
  vec3 viewDirection = normalize(uEye - vPosition);
  vec3 normal = normalize(vNormal);

  // Permukaan tipis dapat dilihat dari dua sisi.
  if (dot(normal, viewDirection) < 0.0) {
    normal = -normal;
  }

  vec3 mainLight = normalize(vec3(-0.52, 0.85, 0.66));
  vec3 fillLight = normalize(vec3(0.57, 0.22, -0.69));

  float mainIntensity = max(dot(normal, mainLight), 0.0);
  float fillIntensity = max(dot(normal, fillLight), 0.0);

  vec3 halfDirection = normalize(mainLight + viewDirection);

  float specular = pow(
    max(dot(normal, halfDirection), 0.0),
    33.0
  );

  float rim = pow(
    1.0 - max(dot(viewDirection, normal), 0.0),
    3.0
  ) * fillIntensity;

  vec3 color =
    vColor * (
      0.56 +
      0.50 * mainIntensity +
      0.17 * fillIntensity
    )
    + uGloss * specular * vec3(1.0, 0.91, 0.72)
    + rim * vec3(0.045, 0.075, 0.065);

  gl_FragColor = vec4(
    mix(color, vColor, uEmission),
    1.0
  );
}
`;

export function createDekuRenderer(gl) {
  function compileShader(type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message);
    }

    return shader;
  }

  const program = gl.createProgram();
  const vertexShader = compileShader(
    gl.VERTEX_SHADER,
    vertexShaderSource
  );
  const fragmentShader = compileShader(
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }

  const attributes = [
    'aPosition',
    'aNormal',
    'aColor'
  ].map(name => gl.getAttribLocation(program, name));

  const uniforms = Object.fromEntries(
    [
      'Model',
      'View',
      'Projection',
      'Normal',
      'Eye',
      'Gloss',
      'Emission'
    ].map(name => [
      name,
      gl.getUniformLocation(program, 'u' + name)
    ])
  );

  // Satu mesh hanya diunggah ke GPU sekali.
  const cache = new Map();

  function createBuffer(target, data) {
    const buffer = gl.createBuffer();

    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);

    return buffer;
  }

  return {
    beginFrame({ view, projection, eye }) {
      gl.useProgram(program);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);

      gl.uniformMatrix4fv(uniforms.View, false, view);
      gl.uniformMatrix4fv(
        uniforms.Projection,
        false,
        projection
      );
      gl.uniform3fv(uniforms.Eye, eye);
    },

    drawMesh(mesh, world, material = {}) {
      if (!cache.has(mesh)) {
        // Setiap vertex: posisi XYZ, normal XYZ, dan warna RGB.
        const values = new Float32Array(
          mesh.vertices.length * 3
        );

        for (let i = 0; i < mesh.vertices.length; i += 3) {
          values.set(
            mesh.vertices.slice(i, i + 3),
            i * 3
          );
          values.set(
            mesh.normals.slice(i, i + 3),
            i * 3 + 3
          );
          values.set(
            mesh.colors.slice(i, i + 3),
            i * 3 + 6
          );
        }

        cache.set(mesh, {
          vertexBuffer: createBuffer(
            gl.ARRAY_BUFFER,
            values
          ),
          indexBuffer: createBuffer(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(mesh.indices)
          ),
          count: mesh.indices.length
        });
      }

      const buffers = cache.get(mesh);

      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        buffers.vertexBuffer
      );
      gl.bindBuffer(
        gl.ELEMENT_ARRAY_BUFFER,
        buffers.indexBuffer
      );

      attributes.forEach((location, i) => {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(
          location,
          3,
          gl.FLOAT,
          false,
          36,
          i * 12
        );
      });

      gl.uniformMatrix4fv(
        uniforms.Model,
        false,
        world
      );
      gl.uniformMatrix3fv(
        uniforms.Normal,
        false,
        LIBS.normalMatrix(world)
      );
      gl.uniform1f(
        uniforms.Gloss,
        material.gloss ?? .15
      );
      gl.uniform1f(
        uniforms.Emission,
        material.emission ?? 0
      );

      gl.drawElements(
        gl.TRIANGLES,
        buffers.count,
        gl.UNSIGNED_SHORT,
        0
      );
    },

    dispose() {
      for (const buffers of cache.values()) {
        gl.deleteBuffer(buffers.vertexBuffer);
        gl.deleteBuffer(buffers.indexBuffer);
      }

      cache.clear();
      gl.deleteProgram(program);
    }
  };
}