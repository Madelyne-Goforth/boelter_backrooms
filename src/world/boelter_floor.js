import * as THREE from 'three';
import { makeInteractable } from './interactable.js';

const WALL_T = 0.2;

export class BoelterFloor {
  // doorways: openings cut into the far wall, e.g. [{ x: -17, width: 1.0 }]
  constructor({ elevator, dialogue, doorways = [] }) {
    this.elevator = elevator;
    this.dialogue = dialogue;
    this.doorways = doorways;
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

  // Hall runs left/right (along x) in front of the elevator.
  // Player faces +z when they exit, so their RIGHT is -x and their LEFT is +x.
  // Long stretch of doors to the right, short stub to the left.
  buildCorridor() {
    const e = this.elevator;
    const hw = e.width / 2;
    const z0 = e.depth / 2 + 0.16;     // elevator's outer face; hall's near wall is flush with it
    const HALL_W = 3.4;                // distance across the hall (z)
    const zFar = z0 + HALL_W;          // inner face of the far wall
    const xRight = -34;                // end of the long side
    const xLeft = 8;                   // end of the short stub
    const H = this.wallH;
    const T = WALL_T;

    // floor + ceiling (floor starts at the elevator sill so there's no gap)
    const zStart = e.depth / 2;
    const span = xLeft - xRight;
    const cx = (xLeft + xRight) / 2;
    const cz = (zStart + zFar) / 2;
    const depthZ = zFar - zStart;

    const floor = new THREE.Mesh(new THREE.BoxGeometry(span, 0.1, depthZ), this.floorMat);
    floor.position.set(cx, -0.05, cz);
    this.group.add(floor);

    const ceil = new THREE.Mesh(
      new THREE.BoxGeometry(span, 0.1, depthZ),
      new THREE.MeshStandardMaterial({ color: 0xf4f4f2 })
    );
    ceil.position.set(cx, H + 0.05, cz);
    this.group.add(ceil);

    // near wall (the elevator side), split around the elevator
    this.addRect(xRight, -hw, z0 - T, z0);
    this.addRect(hw, xLeft, z0 - T, z0);

    // far wall (faces the player when they exit), cut around any doorways
    const DOOR_H = 2.1;
    const cuts = [...this.doorways].sort((a, b) => a.x - b.x);
    let cursor = xRight - T;
    for (const d of cuts) {
      const x1 = d.x - d.width / 2;
      const x2 = d.x + d.width / 2;
      this.addRect(cursor, x1, zFar, zFar + T);
      // wall above the opening (visual only; nobody can jump through it)
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(d.width, H - DOOR_H, T),
        this.wallMat
      );
      lintel.position.set(d.x, DOOR_H + (H - DOOR_H) / 2, zFar + T / 2);
      this.group.add(lintel);
      cursor = x2;
    }
    this.addRect(cursor, xLeft + T, zFar, zFar + T);

    // end caps
    this.addRect(xRight - T, xRight, z0 - T, zFar + T);
    this.addRect(xLeft, xLeft + T, z0 - T, zFar + T);

    // dark baseboards (visual only)
    const base = new THREE.MeshStandardMaterial({ color: 0x3b2a22, roughness: 0.8 });
    const addBase = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), base);
      m.position.set(x, 0.075, z);
      this.group.add(m);
    };
    addBase(span, 0.04, cx, zFar - 0.02);                                    // far wall
    addBase(-hw - xRight, 0.04, (xRight - hw) / 2, z0 + 0.02);                // near wall, right side
    addBase(xLeft - hw, 0.04, (xLeft + hw) / 2, z0 + 0.02);                  // near wall, left side

    // doors: mostly on the right (-x). Far wall faces the player; near wall is behind them.
    const farDoorsX  = [-5, -11, -17, -23, -29, 5];
    const nearDoorsX = [-8, -14, -20, -26, -32];
    let n = 0;
    for (const x of farDoorsX) {
      const name = `Room ${3410 + 10 * n++}`;
      if (this.doorways.some(d => Math.abs(d.x - x) < 0.01)) continue;   // real doorway lives here
      this.addDoorSlab('far', x, zFar - 0.03, name);
    }
    for (const x of nearDoorsX) this.addDoorSlab('near', x, z0 + 0.03,   `Room ${3410 + 10 * n++}`);

    this.hall = { z0, zFar, xRight, xLeft, wallT: T };
  }

  // kind: 'far' or 'near'. Both are walls running along x, so the slab is wide in x, thin in z.
  addDoorSlab(kind, x, z, name) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 0.06), this.doorMat);
    slab.position.set(x, 1.05, z);
    this.group.add(slab);

    makeInteractable(slab, {
      kind: 'door',
      id: name,
      label: 'Try door',
      onInteract: () => this.dialogue.show([`${name}: locked.`], 'DOOR', 'SYSTEM'),
    });
  }

  // Hall light fixtures (and their flicker) are built by HallCeiling in hall_ceiling.js.
  // This is just a faint fill so the hall is never pitch black between flickers.
  buildLights() {
    this.group.add(new THREE.HemisphereLight(0xffffff, 0x888070, 0.12));
  }

  update() {
    // doorway is only passable once the doors have slid most of the way open
    this.doorBlock.solid = this.elevator.doorProgress < 0.7;
  }
}