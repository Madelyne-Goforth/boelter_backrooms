// second floor - want flickering lights, lab, etc
import * as THREE from 'three';
import { BoelterFloor } from './boelter_floor.js';
import { HallCeiling } from './hall_ceiling.js';
import { ScienceLab } from './science_lab.js';

// Floor 2 = the base Boelter hall + ceiling clutter/flickering lights + the science lab.
//
//   boelter_floor.js  - hall walls, floor, ordinary doors, elevator doorway blocker
//   hall_ceiling.js   - pipes, ducts, vents, flickering fixtures
//   science_lab.js    - ajar door + lab room (where the escape puzzles go)
//
// main.js only talks to this class:
//   const floor = new Floor2({ elevator, dialogue, player });
//   scene.add(floor.group);
//   player.setColliders(floor.colliders);
//   ...in animate():  floor.update(delta);

const LAB_DOOR_X = -17;   // where along the hall the ajar door is (negative = player's right)

// Out in the hall the scene's global ambient light + environment reflections are turned down,
// otherwise they wash everything out and the flickering lights barely register.
// The elevator keeps whatever lighting you set in main.js; these fade in once the player steps out.
const HALL_AMBIENT = 0.10;        // AmbientLight intensity in the hall
const HALL_ENVIRONMENT = 0.25;    // scene.environmentIntensity in the hall
const HALL_START_Z = 2.3;         // player z past the elevator's front wall

export class Floor2 {
  constructor({ elevator, dialogue, player }) {
    this.group = new THREE.Group();

    // base hall, with an opening cut into the far wall for the lab door
    this.hallFloor = new BoelterFloor({
      elevator,
      dialogue,
      doorways: [{ x: LAB_DOOR_X, width: 1.0 }]
    });
    this.group.add(this.hallFloor.group);

    // one shared collider list: the player reads it, every piece pushes into it
    this.colliders = this.hallFloor.colliders;

    this.ceiling = new HallCeiling({
      hall: this.hallFloor.hall,
      height: elevator.height
    });
    this.group.add(this.ceiling.group);

    this.lab = new ScienceLab({
      hall: this.hallFloor.hall,
      doorX: LAB_DOOR_X,
      height: elevator.height,
      dialogue,
      player,
      colliders: this.colliders
    });
    this.group.add(this.lab.group);

    this.player = player;
    this.mood = { ready: false, t: 0, scene: null, ambient: null, baseAmbient: 0, baseEnv: 1 };
  }

  // fade the scene's global lighting between the elevator's look and the hall's darker look
  updateMood(delta) {
    const m = this.mood;

    if (!m.ready) {
      const scene = this.group.parent;           // floor.group has been added to the scene by main.js
      if (!scene) return;
      m.scene = scene;
      m.ambient = scene.children.find((c) => c.isAmbientLight) ?? null;
      m.baseAmbient = m.ambient ? m.ambient.intensity : 0;
      m.baseEnv = scene.environmentIntensity ?? 1;
      m.ready = true;
    }

    const outside = this.player.position.z > HALL_START_Z ? 1 : 0;
    m.t += (outside - m.t) * Math.min(1, delta * 3);

    if (m.ambient) m.ambient.intensity = THREE.MathUtils.lerp(m.baseAmbient, HALL_AMBIENT, m.t);
    m.scene.environmentIntensity = THREE.MathUtils.lerp(m.baseEnv, HALL_ENVIRONMENT, m.t);
  }

  update(delta = 0.016) {
    this.hallFloor.update();     // elevator doorway blocker
    this.ceiling.update(delta);  // light flicker
    this.lab.update(delta);      // door + lab lights
    this.updateMood(delta);      // darker global lighting once outside the elevator

    // once the player is sealed in the lab, the hall lights fade out
    // (the lights have no shadows, so they'd otherwise leak through the walls and flicker in the lab)
    const target = this.lab.sealed ? 0 : 1;
    this.ceiling.master += (target - this.ceiling.master) * Math.min(1, delta * 5);
  }
}