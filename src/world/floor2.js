// second floor - want flickering lights, lab, etc
import * as THREE from 'three';
import { BoelterFloor } from './boelter_floor.js';
import { HallCeiling } from './hall_ceiling.js';
import { ScienceLab } from './science_lab.js';

const LAB_DOOR_X = -17;   
const HALL_AMBIENT = 0.10;        
const HALL_ENVIRONMENT = 0.25;    
const HALL_START_Z = 2.3;         


export const FLOOR_DROP = 0.65;
const GATE_Z_MIN = 2.08;
const GATE_Z_MAX = 2.32;
const CRAWL_EYE_HEIGHT = 0.6;    

export class Floor2 {
 
  constructor({ elevator, dialogue, player, inventory = null, onLabEscape = null }) {
    this.group = new THREE.Group();
    this.group.visible = false;      
    this.revealed = false;
    this.floorY = 0;                 
    this.elevator = elevator;

    this.hallFloor = new BoelterFloor({
      elevator,
      dialogue,
      doorways: [{ x: LAB_DOOR_X, width: 1.0 }]
    });
    this.group.add(this.hallFloor.group);

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
      colliders: this.colliders,
      inventory,
      onEscape: onLabEscape
    });
    this.group.add(this.lab.group);

    const gap = elevator.doorWidth / 2;
    this.gate = {
      box: new THREE.Box3(
        new THREE.Vector3(-gap, 0, GATE_Z_MIN),
        new THREE.Vector3(gap, elevator.height, GATE_Z_MAX)
      ),
      solid: true
    };
    this.colliders.push(this.gate);

    this.player = player;
    this.mood = { ready: false, active: false, t: 0, scene: null, ambient: null, baseAmbient: 0, baseEnv: 1 };
  }
  updateMood(delta) {
    const m = this.mood;

    if (!m.ready) {
      const scene = this.group.parent;          
      if (!scene) return;
      m.scene = scene;
      m.ambient = scene.children.find((c) => c.isAmbientLight) ?? null;
      m.baseAmbient = m.ambient ? m.ambient.intensity : 0;
      m.baseEnv = scene.environmentIntensity ?? 1;
      m.ready = true;
    }

    const outside = this.player.position.z > HALL_START_Z ? 1 : 0;
    m.t += (outside - m.t) * Math.min(1, delta * 3);

    if (m.t < 0.001 && !m.active) return;
    m.active = m.t >= 0.001;

    if (m.ambient) m.ambient.intensity = THREE.MathUtils.lerp(m.baseAmbient, HALL_AMBIENT, m.t);
    m.scene.environmentIntensity = THREE.MathUtils.lerp(m.baseEnv, HALL_ENVIRONMENT, m.t);
  }

  reveal() {
    if (this.revealed) return this.floorY;

    this.revealed = true;
    this.floorY = this.elevator.group.position.y - FLOOR_DROP;
    this.group.position.y = this.floorY;
    this.group.visible = true;
    return this.floorY;
  }

  // Crawl-out logic
  updateCrawlExit(delta) {
    const p = this.player;
    const insideGate = p.position.z > GATE_Z_MIN && p.position.z < GATE_Z_MAX &&
                       Math.abs(p.position.x) < this.elevator.doorWidth / 2;

    if (insideGate) {
      p.posture = 'prone';
      this.gate.solid = false;
    } else {
      this.gate.solid = p.eyeHeight >= CRAWL_EYE_HEIGHT;
    }

    const carY = this.elevator.group.position.y;
    const target = p.position.z > (GATE_Z_MIN + GATE_Z_MAX) / 2 ? this.floorY : carY;
    const diff = target - p.groundY;
    const step = 4 * delta;
    p.groundY = Math.abs(diff) <= step ? target : p.groundY + Math.sign(diff) * step;
  }

  update(delta = 0.016) {
    this.hallFloor.update();     // elevator doorway blocker

    if (!this.revealed) {
      this.hallFloor.doorBlock.solid = true;
      return;
    }

    this.updateCrawlExit(delta);
    this.ceiling.update(delta);  // light flicker
    this.lab.update(delta);      // door + lab lights
    this.updateMood(delta);      // darker global lighting once outside the elevator
    const target = this.lab.sealed ? 0 : 1;
    this.ceiling.master += (target - this.ceiling.master) * Math.min(1, delta * 5);
  }
}