import * as THREE from 'three';
import { makeInteractable } from './interactable.js';

// ---------------------------------------------------------------------------
// Science lab puzzle: mix dyes -> feed samples to the fume hood lock -> take the key.
//
//   1. The whiteboard shows three colored samples in order (SOLUTION below).
//   2. Only the three primary dyes are on the bench, so the player has to MIX the rest:
//        red + yellow = orange     yellow + blue = green     red + blue = purple
//      (one dye alone makes that primary; two dyes make a mix; the beaker holds 2)
//   3. Interacting with the beaker pours the sample into the intake. That fills the next
//      lamp on the hood's lock. After the third sample the lock checks the order.
//   4. Right: the sash rises and a key is revealed. Wrong: the lock buzzes and resets.
//   5. The key goes in the hotbar and unlocks the lab door (handled in science_lab.js).
//
// To change the answer, edit SOLUTION. The whiteboard picture updates automatically.
// ---------------------------------------------------------------------------

export const DYE_HEX = { red: 0xd32f2f, yellow: 0xfdd835, blue: 0x1e66d0 };
export const MIX_HEX = { ...DYE_HEX, orange: 0xff8f00, green: 0x2e9d3f, purple: 0x7b3fb5 };

export const SOLUTION = ['orange', 'green', 'purple'];

export const KEY_ID = 'lab-key';

const MIX_TABLE = {
  'red': 'red',
  'yellow': 'yellow',
  'blue': 'blue',
  'red+yellow': 'orange',
  'blue+yellow': 'green',
  'blue+red': 'purple'
};

const BEAKER_MAX = 2;
const SASH_LIFT = 0.7;

// tiny inline SVG so the hotbar icon needs no asset file
const KEY_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<circle cx="20" cy="32" r="12" fill="none" stroke="#e0b93b" stroke-width="6"/>' +
    '<rect x="30" y="29" width="28" height="6" fill="#e0b93b"/>' +
    '<rect x="46" y="35" width="5" height="9" fill="#e0b93b"/>' +
    '<rect x="54" y="35" width="5" height="7" fill="#e0b93b"/>' +
    '</svg>'
  );

export class LabPuzzle {
  constructor(lab) {
    this.lab = lab;
    this.group = lab.group;
    this.dialogue = lab.dialogue;
    this.inventory = lab.inventory;

    this.beaker = [];          // dyes currently in the mixing beaker (max 2)
    this.slots = [null, null, null];
    this.solved = false;
    this.keyTaken = false;

    this.flash = null;         // { hex, t } while the lamps blink
    this.sashLift = 0;         // current lift of the sash (0 .. SASH_LIFT)

    this.buildStation();
    this.buildLockPanel();
    this.buildKey();
    this.refreshBeaker();
    this.refreshLamps();
  }

  // Small props are hard to hit with a crosshair, so each gets an invisible, larger hitbox.
  // (A material with visible:false is still hit by the raycaster.)
  addHitbox(parent, w, h, d, x = 0, y = 0, z = 0) {
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(x, y, z);
    parent.add(hit);
    return hit;
  }

  say(lines, type = 'SYSTEM') {
    this.dialogue.show(lines, 'LAB', type);
  }

  // ------------------------------------------------------------------ station

  buildStation() {
    const { doorX, z1 } = this.lab;
    const topY = 0.9;
    const z = z1 - 0.32;

    // three dye bottles
    const bottleXs = { red: doorX + 1.35, yellow: doorX + 1.75, blue: doorX + 2.15 };
    for (const [name, x] of Object.entries(bottleXs)) {
      this.buildBottle(name, x, topY, z);
    }

    // mixing beaker
    this.beakerX = doorX + 2.8;
    this.buildBeaker(this.beakerX, topY, z);

    // intake funnel the sample is poured into
    const funnelX = doorX + 3.45;
    const funnel = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.12, 20, 1, true), this.lab.steelMat);
    funnel.rotation.x = Math.PI;                  // wide end up
    funnel.position.set(funnelX, topY + 0.14, z);
    funnel.material = funnel.material.clone();
    funnel.material.side = THREE.DoubleSide;
    this.group.add(funnel);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 10), this.lab.steelMat);
    stem.position.set(funnelX, topY + 0.05, z);
    this.group.add(stem);

    // conduit from the intake across the back wall into the hood
    this.lab.block(doorX + this.lab.hood.w / 2, funnelX + 0.02, 1.22, 1.28, z1 - 0.05, z1 - 0.02, this.lab.steelMat);
    this.lab.block(funnelX - 0.02, funnelX + 0.02, topY + 0.15, 1.28, z1 - 0.05, z1 - 0.02, this.lab.steelMat);

    // sign above the intake
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.12),
      new THREE.MeshStandardMaterial({
        map: this.lab.makeCanvasTexture(256, 64, (g, w, h) => {
          g.fillStyle = '#202428'; g.fillRect(0, 0, w, h);
          g.fillStyle = '#e8e8e8'; g.font = 'bold 28px sans-serif';
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('SAMPLE INTAKE', w / 2, h / 2);
        }),
        roughness: 0.6
      })
    );
    sign.rotation.y = Math.PI;
    sign.position.set(funnelX, 1.4, z1 - 0.012);
    this.group.add(sign);
  }

  buildBottle(name, x, y, z) {
    const g = new THREE.Group();
    const hex = DYE_HEX[name];

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 16, 1, true), this.lab.glassMat);
    body.position.y = 0.1;
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.15, 16),
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.25, transparent: true, opacity: 0.9 })
    );
    liquid.position.y = 0.085;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.05, 12), this.lab.glassMat);
    neck.position.y = 0.225;
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.03, 0.07, 12),
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5 })
    );
    cap.position.y = 0.285;

    const letter = { red: 'R', yellow: 'Y', blue: 'B' }[name];
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.07, 0.07),
      new THREE.MeshStandardMaterial({
        map: this.lab.makeCanvasTexture(64, 64, (c, w, h) => {
          c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h);
          c.fillStyle = '#222'; c.font = 'bold 44px sans-serif';
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(letter, w / 2, h / 2 + 2);
        }),
        roughness: 0.7
      })
    );
    label.rotation.y = Math.PI;                 // faces the player (-z)
    label.position.set(0, 0.1, -0.057);

    g.add(body, liquid, neck, cap, label);
    this.addHitbox(g, 0.14, 0.34, 0.14, 0, 0.17, 0);
    g.position.set(x, y, z);
    this.group.add(g);

    makeInteractable(g, {
      kind: 'labDye',
      id: `dye-${name}`,
      label: `Add ${name} dye`,
      onInteract: () => this.addDye(name)
    });
  }

  buildBeaker(x, y, z) {
    const g = new THREE.Group();

    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.22, 20, 1, true), this.lab.glassMat);
    glass.position.y = 0.11;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.01, 20), this.lab.glassMat);
    base.position.y = 0.005;

    this.liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.078, 1, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.92 })
    );

    g.add(glass, base, this.liquid);
    g.position.set(x, y, z);
    this.group.add(g);
    this.beakerGroup = g;

    makeInteractable(g, {
      kind: 'labBeaker',
      id: 'mixing-beaker',
      label: 'Empty beaker',
      onInteract: () => this.pour()
    });
  }

  // ------------------------------------------------------------------ mixing

  mixName(list = this.beaker) {
    if (!list.length) return null;
    return MIX_TABLE[[...new Set(list)].sort().join('+')] ?? null;
  }

  addDye(name) {
    if (this.busy) return;

    if (this.solved) {
      this.say(["The lock is already open.", "No need for more samples."]);
      return;
    }

    if (this.beaker.length >= BEAKER_MAX) {
      this.say(["The beaker's full.", "Time to send it through the intake."]);
      return;
    }

    this.beaker.push(name);
    this.refreshBeaker();
  }

  refreshBeaker() {
    const name = this.mixName();

    if (!name) {
      this.liquid.visible = false;
    } else {
      const h = 0.05 + 0.06 * this.beaker.length;
      this.liquid.visible = true;
      this.liquid.scale.y = h;
      this.liquid.position.y = 0.01 + h / 2;
      this.liquid.material.color.setHex(MIX_HEX[name]);
    }

    const label = name ? `Pour ${name} sample into intake` : 'Empty beaker';
    this.beakerGroup.traverse((m) => { if (m.isMesh) m.userData.label = label; });
  }

  pour() {
    if (this.busy) return;

    if (this.solved) {
      this.say(["The lock is already open."]);
      return;
    }

    const name = this.mixName();
    if (!name) {
      this.say(["The beaker is empty.", "The shelf has dyes in red, yellow and blue."]);
      return;
    }

    const index = this.slots.indexOf(null);
    this.slots[index] = name;

    this.beaker = [];
    this.refreshBeaker();
    this.refreshLamps();

    if (index < this.slots.length - 1) {
      this.say([`The ${name} sample drains into the intake.`, `Lock slot ${index + 1} lights up.`]);
      return;
    }

    this.checkLock();
  }

  // ------------------------------------------------------------------ the hood lock

  buildLockPanel() {
    const { doorX } = this.lab;
    const { frontZ } = this.lab.hood;
    const y = 2.25;

    const panel = new THREE.Group();

    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.3),
      new THREE.MeshStandardMaterial({
        map: this.lab.makeCanvasTexture(512, 160, (g, w, h) => {
          g.fillStyle = '#1c2024'; g.fillRect(0, 0, w, h);
          g.strokeStyle = '#666'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
          g.fillStyle = '#d8d8d8'; g.font = 'bold 26px sans-serif';
          g.textAlign = 'center'; g.fillText('SAMPLE LOCK', w / 2, 34);
          g.font = 'bold 22px sans-serif'; g.fillStyle = '#999';
          [0, 1, 2].forEach((i) => g.fillText(String(i + 1), w / 2 + (i - 1) * 130, 148));
        }),
        roughness: 0.5
      })
    );
    plate.rotation.y = Math.PI;                  // faces the player (-z)
    plate.position.set(doorX, y, frontZ - 0.003);
    panel.add(plate);

    this.lamps = [];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.3, emissive: 0x000000 });
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20), mat);
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(doorX + (i - 1) * 0.255, y - 0.02, frontZ - 0.02);
      panel.add(lamp);
      this.lamps.push(lamp);
    }

    this.group.add(panel);

    makeInteractable(panel, {
      kind: 'labLock',
      id: 'sample-lock',
      label: 'Sample lock',
      onInteract: () => this.useLockPanel()
    });
  }

  useLockPanel() {
    if (this.busy) return;

    if (this.solved) {
      this.say(["The lock is open."]);
      return;
    }

    if (this.slots.some(Boolean)) {
      this.slots = [null, null, null];
      this.refreshLamps();
      this.say(["I cleared the samples from the lock."]);
      return;
    }

    this.say([
      "A three-slot sample lock.",
      "Each slot wants a colored sample, in order."
    ]);
  }

  refreshLamps() {
    this.lamps.forEach((lamp, i) => {
      const name = this.slots[i];

      if (name) {
        lamp.material.color.setHex(MIX_HEX[name]);
        lamp.material.emissive.setHex(MIX_HEX[name]);
        lamp.material.emissiveIntensity = 1.1;
      } else {
        lamp.material.color.setHex(0x1c1c1c);
        lamp.material.emissive.setHex(0x000000);
        lamp.material.emissiveIntensity = 1;
      }
    });
  }

  checkLock() {
    const ok = SOLUTION.every((name, i) => this.slots[i] === name);

    this.busy = true;
    this.flash = { hex: ok ? 0x2ecc71 : 0xe53935, t: ok ? 1.0 : 0.9, ok };

    if (ok) {
      this.say([
        "All three samples accepted.",
        "The lock disengages and the sash begins to rise.",
        "There's a key on the work surface."
      ]);
    } else {
      this.say([
        "The lock buzzes angrily.",
        "The samples were rejected. Slots cleared."
      ]);
    }
  }

  // ------------------------------------------------------------------ the key

  buildKey() {
    const { doorX, z1 } = this.lab;
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.3 });

    const key = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 8, 20), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-0.07, 0, 0);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.014, 0.014), gold);
    shaft.position.set(0.03, 0, 0);
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.03), gold);
    t1.position.set(0.075, 0, 0.012);
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.022), gold);
    t2.position.set(0.05, 0, 0.009);
    key.add(ring, shaft, t1, t2);
    this.addHitbox(key, 0.3, 0.1, 0.16, 0, 0.03, 0);

    key.position.set(doorX - 0.1, 0.92, z1 - 0.4);
    key.rotation.y = 0.5;
    this.group.add(key);
    this.keyMesh = key;

    // The sash glass is a solid, non-interactable mesh, so the raycast can't reach the key
    // until the sash has been lifted. No extra gating needed.
    makeInteractable(key, {
      kind: 'labKey',
      id: KEY_ID,
      label: 'Take key',
      onInteract: () => this.takeKey()
    });
  }

  takeKey() {
    if (this.keyTaken) return;

    const added = this.inventory?.addItem({
      id: KEY_ID,
      name: 'Lab Key',
      type: 'key',
      consumable: true,
      icon: KEY_ICON
    });

    if (!added) {
      this.say(["My hands are full.", "I need a free hotbar slot first."]);
      return;
    }

    this.keyTaken = true;
    this.keyMesh.removeFromParent();
    this.say(["A brass key, tagged \"LAB DOOR\".", "That's my way out."]);
  }

  // ------------------------------------------------------------------ per-frame

  update(delta) {
    // lamps blink after the third sample, then the result applies
    if (this.flash) {
      this.flash.t -= delta;
      const on = Math.floor(this.flash.t * 8) % 2 === 0;

      this.lamps.forEach((lamp) => {
        lamp.material.color.setHex(on ? this.flash.hex : 0x1c1c1c);
        lamp.material.emissive.setHex(on ? this.flash.hex : 0x000000);
        lamp.material.emissiveIntensity = 1.4;
      });

      if (this.flash.t <= 0) {
        const ok = this.flash.ok;
        this.flash = null;
        this.busy = false;

        if (ok) {
          this.solved = true;
          this.lamps.forEach((lamp) => {
            lamp.material.color.setHex(0x2ecc71);
            lamp.material.emissive.setHex(0x2ecc71);
            lamp.material.emissiveIntensity = 1.2;
          });
        } else {
          this.slots = [null, null, null];
          this.refreshLamps();
        }
      }
    }

    // sash rises once solved
    if (this.solved && this.sashLift < SASH_LIFT) {
      this.sashLift = Math.min(SASH_LIFT, this.sashLift + delta * 0.35);
      this.lab.hoodSash.position.y = this.lab.hoodSashY + this.sashLift;
    }
  }
}