import * as THREE from 'three';
import { makeInteractable } from './interactable.js';
import { LabPuzzle, MIX_HEX, SOLUTION, KEY_ID } from './lab_puzzle.js';

const LAB_W = 8;          
const LAB_D = 7;           
const DOOR_W = 1.0;
const DOOR_H = 2.1;
const AJAR_ANGLE = 0.38;  
const OPEN_ANGLE = 1.85;   

export class ScienceLab {
  constructor({ hall, doorX, height, dialogue, player, colliders, inventory = null, onEscape = null }) {
    this.hall = hall;
    this.doorX = doorX;
    this.H = height;
    this.dialogue = dialogue;
    this.player = player;
    this.colliders = colliders;       
    this.inventory = inventory;
    this.onEscape = onEscape;
    this.unlocked = false;           

    this.group = new THREE.Group();
    this.lights = [];
    this.T = hall.wallT;
    this.zFar = hall.zFar;
    this.zIn = hall.zFar + this.T;    
    this.x0 = doorX - LAB_W / 2;
    this.x1 = doorX + LAB_W / 2;
    this.z1 = this.zIn + LAB_D;       

    // materials
    this.wallMat   = new THREE.MeshStandardMaterial({ color: 0xf1eee2, roughness: 0.9 });
    this.floorMat  = new THREE.MeshStandardMaterial({ color: 0x4d545c, roughness: 0.45, metalness: 0.05 });
    this.ceilMat   = new THREE.MeshStandardMaterial({ color: 0xdfe1e2, roughness: 0.9 });
    this.cabMat    = new THREE.MeshStandardMaterial({ color: 0xe6e6e1, roughness: 0.6 });
    this.topMat    = new THREE.MeshStandardMaterial({ color: 0x1b1e21, roughness: 0.3, metalness: 0.15 });
    this.steelMat  = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.7 });
    this.doorMat   = new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.6 });
    this.trimMat   = new THREE.MeshStandardMaterial({ color: 0xdad6c8, roughness: 0.7 });
    this.glassMat  = new THREE.MeshStandardMaterial({
      color: 0xaad4e6, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1
    });

    this.level = 0.2;                
    this.slamFlicker = 0;

    this.buildShell();
    this.buildDoor();
    this.buildProps();
    this.puzzle = new LabPuzzle(this);   
    this.buildLights();
  }

  addCollider(minX, maxX, minZ, maxZ, solid = true) {
    const box = new THREE.Box3(
      new THREE.Vector3(minX, 0, minZ),
      new THREE.Vector3(maxX, this.H, maxZ)
    );
    const collider = { box, solid };
    this.colliders.push(collider);
    return collider;
  }

  block(minX, maxX, minY, maxY, minZ, maxZ, material) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ),
      material
    );
    m.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    this.group.add(m);
    return m;
  }

  solid(cx, cz, w, d, h, material, y0 = 0) {
    const m = this.block(cx - w / 2, cx + w / 2, y0, y0 + h, cz - d / 2, cz + d / 2, material);
    this.addCollider(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2);
    return m;
  }

  wall(minX, maxX, minZ, maxZ) {
    this.block(minX, maxX, 0, this.H, minZ, maxZ, this.wallMat);
    this.addCollider(minX, maxX, minZ, maxZ);
  }


  buildShell() {
    const { x0, x1, zIn, z1, T, zFar, H } = this;

    this.block(x0, x1, -0.1, 0, zFar, z1, this.floorMat);
    this.block(x0, x1, H, H + 0.1, zIn, z1, this.ceilMat);

    this.wall(x0 - T, x0, zIn, z1 + T);        
    this.wall(x1, x1 + T, zIn, z1 + T);        
    this.wall(x0 - T, x1 + T, z1, z1 + T);    

    const base = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.8 });
    this.block(x0, x1, 0, 0.12, z1 - 0.03, z1, base);
    this.block(x0, x0 + 0.03, 0, 0.12, zIn, z1, base);
    this.block(x1 - 0.03, x1, 0, 0.12, zIn, z1, base);
  }

  buildDoor() {
    const { doorX, zFar, T, zIn } = this;

    this.block(doorX - DOOR_W / 2 - 0.06, doorX - DOOR_W / 2, 0, DOOR_H + 0.06, zFar - 0.02, zIn + 0.02, this.trimMat);
    this.block(doorX + DOOR_W / 2, doorX + DOOR_W / 2 + 0.06, 0, DOOR_H + 0.06, zFar - 0.02, zIn + 0.02, this.trimMat);
    this.block(doorX - DOOR_W / 2 - 0.06, doorX + DOOR_W / 2 + 0.06, DOOR_H, DOOR_H + 0.06, zFar - 0.02, zIn + 0.02, this.trimMat);

    const signMat = new THREE.MeshStandardMaterial({
      color: 0x113322, emissive: 0x22ff77, emissiveIntensity: 1.2
    });
    this.block(doorX - 0.22, doorX + 0.22, DOOR_H + 0.2, DOOR_H + 0.35, zIn + 0.01, zIn + 0.05, signMat);

    this.pivot = new THREE.Group();
    this.pivot.position.set(doorX + DOOR_W / 2 - 0.01, 0, zFar + T / 2);

    const slabW = DOOR_W - 0.03;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(slabW, DOOR_H - 0.04, 0.05), this.doorMat);
    slab.position.set(-slabW / 2, (DOOR_H - 0.04) / 2, 0);
    this.pivot.add(slab);

    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.45, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x1a2a30, roughness: 0.2, metalness: 0.2 })
    );
    win.position.set(-slabW / 2, 1.55, 0);
    this.pivot.add(win);

    for (const side of [-1, 1]) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.05), this.steelMat);
      handle.position.set(-slabW + 0.1, 1.0, side * 0.045);
      this.pivot.add(handle);
    }

    this.group.add(this.pivot);

    this.state = 'ajar';
    this.angle = AJAR_ANGLE;
    this.closeSpeed = 0;
    this.pivot.rotation.y = this.angle;

    this.doorBlock = this.addCollider(
      doorX - DOOR_W / 2, doorX + DOOR_W / 2, zFar - 0.05, zIn + 0.02, true
    );

    makeInteractable(this.pivot, {
      kind: 'door',
      id: 'labDoor',
      label: 'Push door',
      onInteract: () => this.onDoorInteract()
    });
  }

  setDoorLabel(label) {
    this.pivot.traverse((m) => { if (m.isMesh) m.userData.label = label; });
  }

  setDoorInteractable(on) {
    this.pivot.traverse((m) => { if (m.isMesh) m.userData.interactable = on; });
  }

  onDoorInteract() {
    if (this.state === 'ajar') {
      this.state = 'opening';
      this.setDoorInteractable(false);
      return;
    }

    if (this.state === 'locked') {
      if (this.inventory?.hasItem(KEY_ID)) {
        this.unlockWithKey();
        return;
      }

      this.dialogue.show([
        "The door won't budge.",
        "It locked behind me."
      ], 'DOOR', 'SYSTEM');
    }
  }

  unlockWithKey() {
    this.inventory.removeItemById(KEY_ID);
    this.unlocked = true;              
    this.state = 'opening';
    this.setDoorInteractable(false);

    this.dialogue.show([
      "The key turns. The lock clicks open."
    ], 'DOOR', 'SYSTEM');

    this.onEscape?.();
  }

  get sealed() {
    return this.state === 'closing' || this.state === 'locked';
  }

  buildProps() {
    const { x0, x1, zIn, z1, doorX, H } = this;

    const benchW = 2.4, benchD = 0.9, benchH = 0.9;
    for (const rowZ of [zIn + 3.2, zIn + 5.2]) {
      for (const dx of [-1.8, 1.8]) {
        const cx = doorX + dx;
        this.solid(cx, rowZ, benchW - 0.1, benchD - 0.1, benchH - 0.05, this.cabMat);   // cabinet base
        this.block(cx - benchW / 2, cx + benchW / 2, benchH - 0.05, benchH, rowZ - benchD / 2, rowZ + benchD / 2, this.topMat);
      }
    }

    const counterD = 0.6;
    const cz = z1 - counterD / 2;
    const runs = [
      [x0 + 0.1,       doorX - 0.9],
      [doorX + 0.9,    x1 - 0.1]
    ];
    for (const [a, b] of runs) {
      this.solid((a + b) / 2, cz, b - a, counterD, 0.85, this.cabMat);
      this.block(a, b, 0.85, 0.9, z1 - counterD - 0.02, z1, this.topMat);
      for (const y of [1.55, 2.0]) {
        this.block(a, b, y, y + 0.03, z1 - 0.3, z1, this.cabMat);
      }
    }

    const sinkX = x0 + 1.4;
    this.block(sinkX - 0.35, sinkX + 0.35, 0.86, 0.905, cz - 0.2, cz + 0.2, new THREE.MeshStandardMaterial({ color: 0x2c3034, metalness: 0.8, roughness: 0.3 }));
    const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10), this.steelMat);
    faucet.position.set(sinkX, 1.05, z1 - 0.12);
    this.group.add(faucet);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 10), this.steelMat);
    spout.rotation.x = Math.PI / 2;
    spout.position.set(sinkX, 1.2, z1 - 0.22);
    this.group.add(spout);

    const hoodW = 1.6, hoodD = 0.8;
    const hoodZ = z1 - hoodD / 2;
    this.solid(doorX, hoodZ, hoodW, hoodD, 0.85, this.cabMat);                     
    this.block(doorX - hoodW / 2, doorX + hoodW / 2, 0.85, 0.9, z1 - hoodD, z1, this.steelMat); 
    this.block(doorX - hoodW / 2, doorX + hoodW / 2, 2.05, 2.45, z1 - hoodD, z1, this.steelMat); 
    this.block(doorX - hoodW / 2, doorX - hoodW / 2 + 0.06, 0.9, 2.05, z1 - hoodD, z1, this.steelMat); 
    this.block(doorX + hoodW / 2 - 0.06, doorX + hoodW / 2, 0.9, 2.05, z1 - hoodD, z1, this.steelMat);
    this.hoodSash = this.block(doorX - hoodW / 2, doorX + hoodW / 2, 0.9, 1.7, z1 - hoodD + 0.02, z1 - hoodD + 0.04, this.glassMat); 
    this.hoodSashY = this.hoodSash.position.y;  
    this.hood = { w: hoodW, d: hoodD, frontZ: z1 - hoodD };

    this.buildTallCabinet(x1 - 0.3, zIn + 1.5, 0x8a1f1f, 'Chemical cabinet'); 
    this.buildTallShelf(x0 + 0.25, zIn + 1.5);                                  

    this.buildWhiteboard(x1 - 0.03, zIn + 4.1);
    this.buildPoster(x0 + 0.03, zIn + 4.1);

    for (const dx of [-1.8, 1.8]) {
      this.buildStool(doorX + dx, zIn + 4.2);
    }

    const glassSpots = [
      [doorX - 2.6, zIn + 3.2], [doorX - 1.6, zIn + 3.3], [doorX + 1.2, zIn + 3.1], [doorX + 2.4, zIn + 3.25],
      [doorX - 2.2, zIn + 5.2], [doorX + 1.6, zIn + 5.3], [doorX + 2.5, zIn + 5.1]
    ];
    glassSpots.forEach(([x, z], i) => (i % 2 ? this.buildFlask : this.buildBeaker).call(this, x, 0.9, z, i));

    this.buildMicroscope(doorX - 0.9, 0.9, zIn + 3.4);

    for (let i = 0; i < 9; i++) {
      const x = x0 + 0.5 + i * 0.35;
      if (Math.abs(x - doorX) < 1.0) continue;
      this.buildBeaker(x, 1.58, z1 - 0.15, i);
    }
    for (let i = 0; i < 7; i++) {
      const x = doorX + 1.1 + i * 0.4;
      if (x > x1 - 0.3) break;
      this.buildFlask(x, 2.03, z1 - 0.15, i);
    }
  }

  buildTallCabinet(x, z, color, label) {
    const w = 0.5, d = 1.0, h = 2.0;
    const body = this.solid(x, z, w, d, h, new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    const seam = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    this.block(x - w / 2 - 0.005, x - w / 2 + 0.005, 0.1, h - 0.1, z - 0.01, z + 0.01, seam);
    this.block(x - w / 2 - 0.03, x - w / 2, 1.0, 1.15, z + 0.08, z + 0.11, this.steelMat);
    makeInteractable(body, {
      kind: 'labProp',
      id: 'chemCabinet',
      label: 'Check cabinet',
      onInteract: () => this.dialogue.show([
        "A flammables cabinet.",
        "Locked."
      ], 'YOU', 'INSPECT')
    });
  }

  buildTallShelf(x, z) {
    const w = 0.4, d = 1.2, h = 2.1;
    const metal = new THREE.MeshStandardMaterial({ color: 0x6d7378, roughness: 0.5, metalness: 0.5 });
    this.addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    this.block(x - w / 2, x + w / 2, 0, h, z - d / 2, z - d / 2 + 0.03, metal);   
    this.block(x - w / 2, x + w / 2, 0, h, z + d / 2 - 0.03, z + d / 2, metal);
    this.block(x - w / 2, x - w / 2 + 0.03, 0, h, z - d / 2, z + d / 2, metal);   
    const boxMat = [0xb89968, 0x9a7b4f, 0xc9ad7f].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
    for (let i = 0; i < 5; i++) {
      const y = 0.15 + i * 0.45;
      this.block(x - w / 2, x + w / 2, y, y + 0.03, z - d / 2, z + d / 2, metal);
      this.block(x - 0.1, x + 0.12, y + 0.03, y + 0.3, z - 0.45, z - 0.05, boxMat[i % 3]);
      this.block(x - 0.1, x + 0.12, y + 0.03, y + 0.26, z + 0.08, z + 0.46, boxMat[(i + 1) % 3]);
    }
  }

  buildStool(x, z) {
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x25272a, roughness: 0.6 }));
    seat.position.set(x, 0.66, z);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.64, 10), this.steelMat);
    leg.position.set(x, 0.32, z);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 20), this.steelMat);
    foot.position.set(x, 0.01, z);
    this.group.add(seat, leg, foot);
  }

  buildBeaker(x, y, z, i = 0) {
    const h = 0.13;
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, h, 14, 1, true), this.glassMat);
    glass.position.set(x, y + h / 2, z);
    const colors = [0x4fc3f7, 0x9ccc65, 0xffb74d, 0xba68c8];
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, h * 0.55, 14),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.75, roughness: 0.2 })
    );
    liquid.position.set(x, y + h * 0.3, z);
    this.group.add(glass, liquid);
  }

  buildFlask(x, y, z, i = 0) {
    const colors = [0xef5350, 0x4fc3f7, 0xfff176, 0x81c784];
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.13, 16, 1, true), this.glassMat);
    body.position.set(x, y + 0.065, z);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 10, 1, true), this.glassMat);
    neck.position.set(x, y + 0.17, z);
    const liquid = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.07, 16),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.75, roughness: 0.2 })
    );
    liquid.position.set(x, y + 0.035, z);
    this.group.add(body, neck, liquid);
  }

  buildMicroscope(x, y, z) {
    const dark = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.5, metalness: 0.4 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.24), dark);
    base.position.set(x, y + 0.015, z);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10), dark);
    arm.position.set(x, y + 0.18, z + 0.08);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 10), this.steelMat);
    tube.position.set(x, y + 0.3, z - 0.02);
    tube.rotation.x = -0.4;
    const stage = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.1), this.steelMat);
    stage.position.set(x, y + 0.14, z - 0.02);
    this.group.add(base, arm, tube, stage);
  }

  makeCanvasTexture(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  buildWhiteboard(x, z) {
    const tex = this.makeCanvasTexture(1024, 512, (g, w, h) => {
      g.fillStyle = '#f4f5f2'; g.fillRect(0, 0, w, h);

      // ghosting from old erased writing
      g.fillStyle = 'rgba(0,0,0,0.05)';
      for (let i = 0; i < 14; i++) g.fillRect(40 + Math.random() * 900, 30 + Math.random() * 440, 120 + Math.random() * 200, 8);

      g.fillStyle = 'rgba(29,59,139,0.35)';
      g.font = '34px "Comic Sans MS", cursive, sans-serif';
      g.fillText('PV = nRT', 760, 70);
      g.fillText('\u0394G = \u0394H \u2212 T\u0394S', 700, 120);

      g.fillStyle = '#1d1d1d';
      g.font = 'bold 44px "Comic Sans MS", cursive, sans-serif';
      g.fillText('HOOD SAMPLES - IN ORDER', 70, 90);

      SOLUTION.forEach((name, i) => {
        const cx = 170 + i * 250, cy = 230;
        g.fillStyle = '#' + MIX_HEX[name].toString(16).padStart(6, '0');
        g.beginPath(); g.arc(cx, cy, 70, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#222'; g.lineWidth = 5; g.stroke();

        g.fillStyle = '#222';
        g.font = 'bold 40px "Comic Sans MS", cursive, sans-serif';
        g.textAlign = 'center';
        g.fillText(String(i + 1), cx, cy + 118);

        if (i < SOLUTION.length - 1) {
          g.font = 'bold 60px sans-serif';
          g.fillText('\u2192', cx + 125, cy + 20);
        }
        g.textAlign = 'left';
      });

      g.fillStyle = '#9b1c1c';
      g.font = '36px "Comic Sans MS", cursive, sans-serif';
      g.fillText("primaries only - we're out of", 70, 430);
      g.fillText('everything else!', 70, 475);
    });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.26, 2.46), this.steelMat);
    frame.position.set(x, 1.7, z);
    this.group.add(frame);

    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.2),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 })
    );
    face.rotation.y = -Math.PI / 2;           
    face.position.set(x - 0.025, 1.7, z);
    this.group.add(face);

    makeInteractable(face, {
      kind: 'labProp',
      id: 'whiteboard',
      label: 'Read whiteboard',
      onInteract: () => this.dialogue.show([
        "Three colored circles, numbered 1 to 3, with arrows between them.",
        "Above them: \"HOOD SAMPLES - IN ORDER\".",
        "Below, in red marker: \"primaries only - we're out of everything else!\"",
        "The fume hood has a lock with three lights. Samples... of these colors?"
      ], 'YOU', 'INSPECT')
    });
  }

  buildPoster(x, z) {
    const tex = this.makeCanvasTexture(512, 320, (g, w, h) => {
      g.fillStyle = '#f2efe4'; g.fillRect(0, 0, w, h);
      const cols = 18, rows = 7, cw = (w - 20) / cols, ch = (h - 40) / rows;
      const palette = ['#e57373', '#ffb74d', '#fff176', '#81c784', '#4fc3f7', '#ba68c8', '#a1887f'];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const skip = (r === 0 && c > 0 && c < 17) || (r < 3 && c > 1 && c < 12 && r > 0);
          if (skip) continue;
          g.fillStyle = palette[(c + r * 2) % palette.length];
          g.fillRect(10 + c * cw + 1, 30 + r * ch + 1, cw - 2, ch - 2);
        }
      }
      g.fillStyle = '#222'; g.font = 'bold 18px sans-serif';
      g.fillText('PERIODIC TABLE OF THE ELEMENTS', 100, 20);
    });
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.0),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })
    );
    poster.rotation.y = Math.PI / 2;          
    poster.position.set(x + 0.005, 1.7, z);
    this.group.add(poster);
  }

  // lights

  buildLights() {
    const { doorX, zIn, H } = this;
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xe8f4ff, emissiveIntensity: 1.5
    });

    for (const z of [zIn + 2.2, zIn + 5.0]) {
      for (const dx of [-1.6, 1.6]) {
        this.block(doorX + dx - 0.15, doorX + dx + 0.15, H - 0.05, H, z - 0.7, z + 0.7, panelMat);
      }
      const light = new THREE.PointLight(0xe6f2ff, 18, 10, 1.5);
      light.position.set(doorX, H - 0.5, z);
      this.group.add(light);
      this.lights.push({ light, base: light.intensity });
    }
    this.panelMat = panelMat;
    this.applyLevel(this.level);
  }

  applyLevel(v) {
    for (const l of this.lights) l.light.intensity = l.base * v;
    this.panelMat.emissiveIntensity = 0.2 + 1.3 * v;
  }


  update(delta) {
    const p = this.player.position;

    if (this.state === 'opening') {
      this.angle += 2.2 * delta;
      if (this.angle >= OPEN_ANGLE) {
        this.angle = OPEN_ANGLE;
        this.state = 'open';
        this.doorBlock.solid = false;     
      }
    }

    if (this.state === 'open') {
      const insideX = Math.abs(p.x - this.doorX) < LAB_W / 2;
      if (!this.unlocked && insideX && p.z > this.zIn + 1.0) {
        this.state = 'closing';
        this.closeSpeed = 0;
        this.doorBlock.solid = true;        
      }
    }

    if (this.state === 'closing') {
      this.closeSpeed += 30 * delta;       
      this.angle -= this.closeSpeed * delta;
      if (this.angle <= 0) {
        this.angle = 0;
        this.state = 'locked';
        this.setDoorLabel('Locked door');
        this.setDoorInteractable(true);
        this.slamFlicker = 0.7;
        this.dialogue.show([
          "The door slams shut behind you.",
          "...",
          "You hear the lock click."
        ], 'DOOR', 'SYSTEM');
      }
    }

    this.pivot.rotation.y = this.angle;

    if (this.state === 'locked') {
      const label = this.inventory?.hasItem(KEY_ID) ? 'Unlock door' : 'Locked door';
      if (label !== this.doorLabel) {
        this.doorLabel = label;
        this.setDoorLabel(label);
      }
    }

    this.puzzle.update(delta);

    const playerInLab = p.z > this.zFar;
    const target = (this.sealed || playerInLab) ? 1 : 0.2;
    this.level += (target - this.level) * Math.min(1, delta * 5);

    let mul = 1;
    if (this.slamFlicker > 0) {
      this.slamFlicker -= delta;
      mul = Math.floor(this.slamFlicker * 18) % 2 === 0 ? 0.1 : 1;
    }
    this.applyLevel(this.level * mul);
  }
}