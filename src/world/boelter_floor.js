import * as THREE from 'three';
import { makeInteractable } from './interactable.js';

const WALL_T = 0.2;

export class BoelterFloor {
  constructor({ elevator, dialogue, doorways = [] }) {
    this.elevator = elevator;
    this.dialogue = dialogue;
    this.doorways = doorways;
    this.group = new THREE.Group();
    this.colliders = [];

    this.wallH = elevator.height;          

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
    const hw = e.width / 2;            
    const hd = e.depth / 2;            
    const t  = e.thickness;            
    const gap = e.doorWidth / 2;      
    const outer = 0.16;               
    const inv = { visible: false };   

    this.addRect(-hw - 0.2, -hw + t, -hd - 0.2, hd + outer, inv);        
    this.addRect( hw - t,    hw + 0.2, -hd - 0.2, hd + outer, inv);      
    this.addRect(-hw, hw, -hd - 0.2, -hd + t, inv);                      
    this.addRect(-hw, -gap, hd - t, hd + outer, inv);
    this.addRect( gap,  hw, hd - t, hd + outer, inv);

    this.doorBlock = this.addRect(-gap, gap, hd - t - 0.1, hd, inv);
  }

//hall
  buildCorridor() {
    const e = this.elevator;
    const hw = e.width / 2;
    const z0 = e.depth / 2 + 0.16;     
    const HALL_W = 3.4;                
    const zFar = z0 + HALL_W;         
    const xRight = -34;                
    const xLeft = 8;                  
    const H = this.wallH;
    const T = WALL_T;

    // floor & ceiling 
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

    this.addRect(xRight, -hw, z0 - T, z0);
    this.addRect(hw, xLeft, z0 - T, z0);


    const DOOR_H = 2.1;
    const cuts = [...this.doorways].sort((a, b) => a.x - b.x);
    let cursor = xRight - T;
    for (const d of cuts) {
      const x1 = d.x - d.width / 2;
      const x2 = d.x + d.width / 2;
      this.addRect(cursor, x1, zFar, zFar + T);
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(d.width, H - DOOR_H, T),
        this.wallMat
      );
      lintel.position.set(d.x, DOOR_H + (H - DOOR_H) / 2, zFar + T / 2);
      this.group.add(lintel);
      cursor = x2;
    }
    this.addRect(cursor, xLeft + T, zFar, zFar + T);

    this.addRect(xRight - T, xRight, z0 - T, zFar + T);
    this.addRect(xLeft, xLeft + T, z0 - T, zFar + T);

    // baseboards 
    const base = new THREE.MeshStandardMaterial({ color: 0x3b2a22, roughness: 0.8 });
    const addBase = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), base);
      m.position.set(x, 0.075, z);
      this.group.add(m);
    };
    addBase(span, 0.04, cx, zFar - 0.02);                                   
    addBase(-hw - xRight, 0.04, (xRight - hw) / 2, z0 + 0.02);               
    addBase(xLeft - hw, 0.04, (xLeft + hw) / 2, z0 + 0.02);                 

    // doors
    const farDoorsX  = [-5, -11, -17, -23, -29, 5];
    const nearDoorsX = [-8, -14, -20, -26, -32];
    let n = 0;
    for (const x of farDoorsX) {
      const name = `Room ${3410 + 10 * n++}`;
      if (this.doorways.some(d => Math.abs(d.x - x) < 0.01)) continue;  
      this.addDoorSlab('far', x, zFar - 0.03, name);
    }
    for (const x of nearDoorsX) this.addDoorSlab('near', x, z0 + 0.03,   `Room ${3410 + 10 * n++}`);

    this.hall = { z0, zFar, xRight, xLeft, wallT: T };
  }

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

  // lighting
  buildLights() {
    this.group.add(new THREE.HemisphereLight(0xffffff, 0x888070, 0.12));
  }

  update() {
    this.doorBlock.solid = this.elevator.doorProgress < 0.7;
  }
}