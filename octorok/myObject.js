import { LIBS } from './libs.js';

export class MyObject {
  constructor(name, mesh = null, material = {}) {
    this.name = name;
    this.mesh = mesh;
    this.material = material;

    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0];
    this.scale = [1, 1, 1];

    // Untuk rotasi terhadap sumbu bebas.
    this.axis = [0, 1, 0];
    this.angle = 0;

    this.children = [];
    this.parent = null;
  }

  add(child) {
    // Mencegah hubungan parent–child membentuk lingkaran.
    for (let node = this; node; node = node.parent) {
      if (node === child) {
        throw new Error(
          'Node tidak dapat menjadi anak dari turunannya.'
        );
      }
    }

    if (child.parent) {
      child.parent.remove(child);
    }

    child.parent = this;
    this.children.push(child);

    return child;
  }

  remove(child) {
    const index = this.children.indexOf(child);

    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }

  localMatrix() {
    return LIBS.compose(
      this.position,
      this.rotation,
      this.scale,
      this.axis,
      this.angle
    );
  }

  draw(renderer, parentMatrix = LIBS.identity()) {
    // Matriks dunia = matriks parent × matriks lokal.
    const world = LIBS.multiply(
      parentMatrix,
      this.localMatrix()
    );

    if (this.mesh) {
      renderer.drawMesh(
        this.mesh,
        world,
        this.material
      );
    }

    // Child menerima transformasi dunia dari parent.
    for (const child of this.children) {
      child.draw(renderer, world);
    }
  }
}