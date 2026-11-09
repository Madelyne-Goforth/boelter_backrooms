import * as THREE from 'three';
import { makeInteractable } from './interactable.js';

const WALL_T = 0.2;

export class BoelterFloor {
  constructor({ elevator, dialogue }) {
    this.elevator = elevator;
    this.dialogue = dialogue;
    this.group = new THREE.Group();
    this.colliders = [];

    this.wallH = elevator.height;          // 3.5, so the ceiling lines up with the elevator

    this.wallMat  = new THREE.MeshStandardMaterial({ color: 0xf1eee2, roughness: 0.9 });
    this.floorMat = new THREE.MeshStandardMaterial({ color: 0x9d978c, roughness: 0.3, metalness: 0.1 });
    this.doorMat  = new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.6 });

    this.buildElevatorShellColliders();
    this.buildCorridor();
    this.buildLights();
  }

  addRect(minX, maxX, minZ, maxZ, { visible = true, material = this.wallMat, solid = true } = {}) {
    const box = new THREE.Box3(
      new THREE.Vector3(minX, 0, minZ),
      new THREE.Vector3(maxX, this.wallH, maxZ)
    );
    const collider = { box, solid };
    this.colliders.push(collider);

    if (visible) {
      const size = box.getSize(new THREE.Vector3());
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
      box.getCenter(mesh.position);
      this.group.add(mesh);
    }
    return collider;
  }

  wallX(x1, x2, z) { this.addRect(Math.min(x1, x2), Math.max(x1, x2), z - WALL_T / 2, z + WALL_T / 2); }
  wallZ(z1, z2, x) { this.addRect(x - WALL_T / 2, x + WALL_T / 2, Math.min(z1, z2), Math.max(z1, z2)); }

  buildElevatorShellColliders() {
    const e = this.elevator;
    const hw = e.width / 2;            // 2.1
    const hd = e.depth / 2;            // 2.0
    const t  = e.thickness;            // 0.1
    const gap = e.doorWidth / 2;       // 1.05, half the doorway
    const outer = 0.16;                // hallway-side wall extension
    const inv = { visible: false };    // the elevator already draws its own walls

    this.addRect(-hw - 0.2, -hw + t, -hd - 0.2, hd + outer, inv);        // left
    this.addRect( hw - t,    hw + 0.2, -hd - 0.2, hd + outer, inv);      // right
    this.addRect(-hw, hw, -hd - 0.2, -hd + t, inv);                      // back

    // front wall, either side of the doorway
    this.addRect(-hw, -gap, hd - t, hd + outer, inv);
    this.addRect( gap,  hw, hd - t, hd + outer, inv);

    // fills the doorway until the doors are open enough to pass
    this.doorBlock = this.addRect(-gap, gap, hd - t - 0.1, hd, inv);
  }

  buildCorridor() {
    const e = this.elevator;
    const z0 = e.depth / 2 + 0.16;     // where the elevator's outer wall ends
    const W = e.width;                 // same width as the elevator so it lines up
    const hw = W / 2;
    const L = 40;
    const H = this.wallH;

    // floor + ceiling
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 24, 0.1, L), this.floorMat);
    floor.position.set(11, -0.05, z0 + L / 2);
    this.group.add(floor);

    const ceil = new THREE.Mesh(
      new THREE.BoxGeometry(W + 24, 0.1, L),
      new THREE.MeshStandardMaterial({ color: 0xf4f4f2 })
    );
    ceil.position.set(11, H + 0.05, z0 + L / 2);
    this.group.add(ceil);

    // main corridor walls
    this.wallZ(z0, z0 + L, -hw);                // left
    this.wallX(-hw, hw, z0 + L);                // end

    // right wall, with a gap for a side hallway at z0+22 .. z0+28
    this.wallZ(z0, z0 + 22, hw);
    this.wallZ(z0 + 28, z0 + L, hw);

    // side hallway going +x
    this.wallX(hw, 22, z0 + 22);
    this.wallX(hw, 22, z0 + 28);
    this.wallZ(z0 + 22, z0 + 28, 22);

    // doors on the left wall
    // slab sits just proud of the wall's inner face (wall is WALL_T thick, centered on -hw)
    let n = 0;
    for (let z = z0 + 4; z < z0 + L - 2; z += 6) {
      this.addDoorSlab(-hw + WALL_T / 2 + 0.03, z, `Room ${3410 + n * 10}`);
      n++;
    }
  }

  addDoorSlab(x, z, name) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 1.0), this.doorMat);
    slab.position.set(x, 1.05, z);
    this.group.add(slab);

    makeInteractable(slab, {
      kind: 'door',
      id: name,
      label: 'Try door',
      onInteract: () => this.dialogue.show([`${name}: locked.`], 'DOOR', 'SYSTEM'),
    });
  }

  buildLights() {
    this.group.add(new THREE.HemisphereLight(0xffffff, 0x888070, 0.5));
    const z0 = this.elevator.depth / 2 + 0.16;
    for (let z = z0 + 6; z < z0 + 40; z += 12) {
      const l = new THREE.PointLight(0xfff4e0, 14, 14, 1.6);
      l.position.set(0, this.wallH - 0.8, z);
      this.group.add(l);
    }
  }

  update() {
    // doorway is only passable once the doors have slid most of the way open
    this.doorBlock.solid = this.elevator.doorProgress < 0.7;
  }
}