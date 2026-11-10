import * as THREE from 'three';

// Ceiling clutter + flickering lights for the hall built by BoelterFloor.
// Usage:
//   const ceiling = new HallCeiling({ hall: boelterFloor.hall, height: elevator.height });
//   scene.add(ceiling.group);
//   ...in animate():  ceiling.update(delta);
//
// Flicker modes (edit FIXTURE_PLAN below to change which lights do what):
//   'steady'   - always on
//   'flicker'  - on, but stutters in short bursts every few seconds
//   'dying'    - mostly OFF, with occasional brief flashes of light
const FIXTURE_PLAN = [
  { x:   5.0, mode: 'steady'  },
  { x:  -4.0, mode: 'flicker' },
  { x: -12.0, mode: 'dying'   },
  { x: -20.0, mode: 'flicker' },
  { x: -28.0, mode: 'steady'  },
];

const MODE_SETTINGS = {
  steady:  { restOn: true,  gapMin: 0,   gapRange: 0,   onChance: 1,    burst: [0, 0] },
  flicker: { restOn: true,  gapMin: 2.0, gapRange: 5.0, onChance: 0.45, burst: [3, 8] },
  dying:   { restOn: false, gapMin: 1.5, gapRange: 4.0, onChance: 0.55, burst: [2, 7] },
};

export class HallCeiling {
  constructor({ hall, height, fixtures = FIXTURE_PLAN }) {
    this.hall = hall;
    this.H = height;
    this.group = new THREE.Group();
    this.fixtures = [];
    this.master = 1;          // 0..1 dimmer for every hall light (Floor2 turns it down when the player is sealed in the lab)

    const { z0, zFar } = hall;
    this.zMid = (z0 + zFar) / 2;

    this.buildPipes();
    this.buildMainDuct();
    this.buildCrossDucts();
    this.buildVents();
    this.buildFixtures(fixtures);
  }

  mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });
  }

  box(w, h, d, material, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    this.group.add(m);
    return m;
  }

  // cylinder running along x
  pipe(radius, x1, x2, y, z, material) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, Math.abs(x2 - x1), 16),
      material
    );
    m.rotation.z = Math.PI / 2;
    m.position.set((x1 + x2) / 2, y, z);
    this.group.add(m);
    return m;
  }

  // ---------------- pipes along the elevator-side (near) wall ----------------
  buildPipes() {
    const { z0, xRight, xLeft } = this.hall;
    const H = this.H;
    const zBase = z0 + 0.45;

    const copper = this.mat(0xb06a3b, { metalness: 0.7, roughness: 0.35 });
    const red    = this.mat(0xd9481c, { roughness: 0.5 });
    const blue   = this.mat(0x2255cc, { roughness: 0.5 });
    const white  = this.mat(0xf2f2f0, { roughness: 0.6 });
    const clamp  = this.mat(0x2a2a2a, { metalness: 0.6, roughness: 0.4 });

    this.pipe(0.07,  xRight + 0.2, xLeft - 0.2, H - 0.30, zBase,        white);  // insulated main
    this.pipe(0.035, xRight + 0.2, xLeft - 0.2, H - 0.18, zBase + 0.22, copper);
    this.pipe(0.03,  xRight + 0.2, xLeft - 0.2, H - 0.14, zBase + 0.34, red);
    this.pipe(0.03,  xRight + 0.2, xLeft - 0.2, H - 0.14, zBase + 0.44, blue);

    // hangers every 2.5 m: thin rod + a clamp around the white pipe
    for (let x = xLeft - 1; x > xRight + 1; x -= 2.5) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), clamp);
      rod.position.set(x, H - 0.15, zBase);
      this.group.add(rod);
      this.box(0.04, 0.05, 0.18, clamp, x, H - 0.30 - 0.07, zBase);
    }

    // a pipe that dips down and disappears into the wall (like the one in the photo)
    const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 12), copper);
    drop.position.set(xRight + 5, H - 0.8, z0 + 0.12);
    this.group.add(drop);
  }

  // ---------------- big duct along the far wall ----------------
  buildMainDuct() {
    const { zFar, xRight, xLeft } = this.hall;
    const H = this.H;
    const ductMat = this.mat(0xe6e6e1, { roughness: 0.9 });
    const seamMat = this.mat(0xc9c9c4, { roughness: 0.9 });
    const dark    = this.mat(0x777777, { roughness: 0.6 });

    const w = 0.95, h = 0.7, z = zFar - w / 2 - 0.1;
    const y = H - h / 2;
    const x0 = xRight + 0.1, x1 = xLeft - 0.1;
    this.box(x1 - x0, h, w, ductMat, (x0 + x1) / 2, y, z);

    // seams every 3 m
    for (let x = x1 - 1.5; x > x0; x -= 3) {
      this.box(0.04, h + 0.02, w + 0.02, seamMat, x, y, z);
    }
    // two access panels on the underside
    for (const x of [-9, -22]) {
      this.box(0.5, 0.012, 0.35, dark, x, H - h - 0.004, z);
    }
  }

  // ---------------- ducts that cross the hall and hang lower ----------------
  buildCrossDucts() {
    const { z0, zFar } = this.hall;
    const H = this.H;
    const ductMat = this.mat(0xe9e9e4, { roughness: 0.9 });
    const depth = zFar - z0;

    const h = 0.8;
    for (const x of [-16, -25]) {
      this.box(1.3, h, depth, ductMat, x, H - h / 2, (z0 + zFar) / 2);
      // flanges
      this.box(1.36, h + 0.04, 0.03, this.mat(0xcfcfca), x, H - h / 2, z0 + 0.02);
      this.box(1.36, h + 0.04, 0.03, this.mat(0xcfcfca), x, H - h / 2, zFar - 0.02);
    }
  }

  // ---------------- ceiling vent grilles ----------------
  buildVents() {
    const H = this.H;
    const frame = this.mat(0xdcdcd6, { roughness: 0.7 });
    const slat  = this.mat(0x555555, { roughness: 0.6 });
    const gap   = this.mat(0x111111);
    const y = H - 0.02;

    for (const x of [0, -8, -21, -31]) {
      const z = this.zMid - 0.15;
      this.box(0.6, 0.03, 0.6, frame, x, y, z);
      this.box(0.5, 0.032, 0.5, gap,  x, y - 0.002, z);
      for (let i = -2; i <= 2; i++) {
        this.box(0.5, 0.034, 0.03, slat, x, y - 0.004, z + i * 0.09);
      }
    }
  }

  // ---------------- flickering light fixtures ----------------
  buildFixtures(plan) {
    const H = this.H;
    const housing = this.mat(0xdddddd, { roughness: 0.6 });

    for (const spec of plan) {
      const settings = MODE_SETTINGS[spec.mode] ?? MODE_SETTINGS.steady;

      // each fixture gets its own emissive material so it can dim on its own
      const tube = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfff2d8,
        emissiveIntensity: 1.6,
        roughness: 0.4
      });

      const z = this.zMid - 0.1;   // clear of the main duct (far side) and pipes (near side)
      const y = H - 0.05;

      this.box(0.35, 0.06, 1.3, housing, spec.x, y, z);                 // housing
      const lamp = this.box(0.22, 0.03, 1.15, tube, spec.x, y - 0.04, z); // glowing tube

      const light = new THREE.PointLight(0xfff0d8, 16, 13, 1.5);
      light.position.set(spec.x, H - 0.45, z);
      this.group.add(light);

      this.fixtures.push({
        mode: spec.mode,
        settings,
        lamp, tube, light,
        baseIntensity: light.intensity,
        baseEmissive: tube.emissiveIntensity,
        on: true,
        burstLeft: 0,
        timer: settings.gapMin + Math.random() * settings.gapRange
      });

      // 'dying' lights start off
      if (!settings.restOn) {
        const f = this.fixtures[this.fixtures.length - 1];
        f.on = false;
        this.apply(f);
      }
    }
  }

  apply(f) {
    // a lit tube is full brightness; an unlit one keeps a faint glow
    const v = (f.on ? 1 : 0.03) * this.master;
    f.light.intensity = f.baseIntensity * v;
    f.tube.emissiveIntensity = f.baseEmissive * v;
  }

  update(delta) {
    for (const f of this.fixtures) {
      if (f.mode === 'steady') { this.apply(f); continue; }

      f.timer -= delta;
      if (f.timer > 0) { this.apply(f); continue; }

      const s = f.settings;

      if (f.burstLeft > 0) {
        // mid-burst: toggle rapidly
        f.on = Math.random() < s.onChance;
        f.burstLeft--;
        f.timer = 0.03 + Math.random() * 0.09;

        if (f.burstLeft === 0) {
          f.on = s.restOn;
          f.timer = s.gapMin + Math.random() * s.gapRange;
        }
      } else {
        // start a new burst
        const [lo, hi] = s.burst;
        f.burstLeft = lo + Math.floor(Math.random() * (hi - lo + 1));
        f.timer = 0.02;
      }

      this.apply(f);
    }
  }
}