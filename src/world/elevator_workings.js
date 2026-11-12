import * as THREE from 'three';

export class ElevatorWorkings {
  constructor({ scene, elevator, elevatorLevel, player, camera, phone, dialogue, ambientLight, onEscaped = null }) {
    Object.assign(this, { scene, elevator, elevatorLevel, player, camera, phone, dialogue, ambientLight, onEscaped });

    this.phase = 'ready';
    this.floor = 4;
    this.floorY = { 2: -10, 3: -3.96, 4: 0, 5: 5 };
    this.travelTime = 0;
    this.code = ['01', '10', '11', '01'];
    this.codeIndex = 0;
    this.bits = '';
    this.wired = false;
    this.noteAdded = false;
    this.wiringOpen = false;
    this.graffiti = null;
    this.wiringPuzzle = null;

    this.elevator.group.position.y = 0;
    this.player.groundY = 0;
    if (this.player.position) this.player.position.y = 0;

    this.makeShaft();
    this.makeEscapeLanding();
    this.makeUI();
    this.elevator.controls?.setFloor?.(4);
    if (this.elevatorLevel?.objects) this.elevatorLevel.objects.visible = false;
  }

  makeShaft() {
    const shaft = new THREE.Group();
    shaft.name = 'elevatorShaft';
    const concrete = new THREE.MeshStandardMaterial({ color: 0x353940, roughness: 0.95, side: THREE.DoubleSide });
    const steel = new THREE.MeshStandardMaterial({ color: 0x59616a, metalness: 0.55, roughness: 0.55 });

    const box = (w, h, d, x, y, z, material = concrete) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.raycast = () => {};
      shaft.add(mesh);
    };

    box(7, 22, 0.3, 0, -3, -3.8);
    box(0.3, 22, 6, -3.4, -3, -1);
    box(0.3, 22, 6, 3.4, -3, -1);
    for (const x of [-2.8, 2.8]) box(0.12, 22, 0.12, x, -3, 2.9, steel);

    this.scene.add(shaft);
    this.shaft = shaft;
  }

  makeEscapeLanding() {
    const landing = new THREE.Group();
    landing.name = 'floor2EscapeLanding';
    landing.visible = false;

    const concrete = new THREE.MeshStandardMaterial({
      color: 0x5a5e62, roughness: 0.98, side: THREE.DoubleSide
    });
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x666a6e, roughness: 0.95
    });

    const box = (w, h, d, x, y, z, material = concrete) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.raycast = () => {};
      landing.add(mesh);
      return mesh;
    };
    const doorWidth = this.elevator.doorWidth ?? 2.1;
    const doorHeight = this.elevator.doorHeight ?? 2.7;
    const gapHeight = 0.82;
    const frontZ = (this.elevator.depth ?? 4) / 2 + 0.20;
    box(doorWidth + 0.25, doorHeight - gapHeight, 0.24,
      0, gapHeight + (doorHeight - gapHeight) / 2, frontZ);

    if (!this.onEscaped) {
      const floorDrop = 0.65;
      const floorThickness = 0.22;
      box(doorWidth + 2.2, floorThickness, 5.5,
        0, -floorDrop - floorThickness / 2, frontZ + 2.8, floorMaterial);
    }

    this.scene.add(landing);
    this.escapeLanding = landing;
  }

  showEscapeLanding() {
    if (!this.escapeLanding) return;
    this.escapeLanding.position.y = this.elevator.group.position.y;
    this.escapeLanding.visible = true;
  }

  // Cut power to the ceiling fixtures, including self-lit panels
  setCeilingLights(enabled) {
    const ceilingY = (this.elevator.height ?? 3.5) - 0.55;
    this.elevator.group.traverse(obj => {
      if (!obj.isMesh || !obj.material || !obj.geometry) return;
      if (obj.parent === this.graffiti) return;

      const bounds = new THREE.Box3().setFromObject(obj);
      const center = bounds.getCenter(new THREE.Vector3());
      const local = this.elevator.group.worldToLocal(center.clone());
      if (local.y < ceilingY) return;

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      if (!obj.userData.ceilingOriginalMaterials) {
        obj.userData.ceilingOriginalMaterials = materials.map(m => m);
        obj.userData.ceilingBlackMaterials = materials.map(m => {
          const black = m.clone();
          if (black.color) black.color.set(0x080808);
          if (black.emissive) black.emissive.set(0x000000);
          if ('emissiveIntensity' in black) black.emissiveIntensity = 0;
          if (black.isMeshBasicMaterial) black.map = null;
          return black;
        });
      }
      const selected = enabled
        ? obj.userData.ceilingOriginalMaterials
        : obj.userData.ceilingBlackMaterials;
      obj.material = Array.isArray(obj.material) ? selected : selected[0];
    });
  }

  makeUI() {
    if (!document.getElementById('elevator-note-style')) {
      const style = document.createElement('style');
      style.id = 'elevator-note-style';
      style.textContent = `
        #elevator-note {
          position: fixed;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          background: #151b22e8;
          color: #e8f2f6;
          padding: 10px 18px;
          font: 13px monospace;
          border-radius: 7px;
          z-index: 200;
          pointer-events: none;
          max-width: 85vw;
          text-align: center;
        }
        #elevator-note[hidden] { display: none; }
      `;
      document.head.appendChild(style);
    }

    this.hint = document.getElementById('elevator-note');
    if (!this.hint) {
      this.hint = document.createElement('div');
      this.hint.id = 'elevator-note';
      document.body.appendChild(this.hint);
    }
    this.showHint('Floor 4; press 2 to descend.');
  }

  showHint(message) {
    if (!this.hint) return;
    this.hint.textContent = message;
    this.hint.hidden = false;
  }

  say(lines) {
    this.dialogue?.show?.(lines, 'ELEVATOR', 'SYSTEM');
  }

  openWiring() {
    if (this.wired) {
      this.showHint('Power restored. Enter the override code.');
      return;
    }

    if (this.phase !== 'stuck') return;

    if (this.wiringPuzzle?.open) {
      this.wiringOpen = this.wiringPuzzle.open() !== false;
    } else {
      this.showHint('Wiring puzzle not connected in main.js.');
      return;
    }

    if (document.pointerLockElement) document.exitPointerLock();
    if (this.player.keys) this.player.keys = {};
  }

  closeWiring() {
    this.wiringOpen = false;
    this.wiringPuzzle?.close?.();
  }

  completeWiring() {
    if (this.wired) return;
    this.wired = true;
    this.wiringOpen = false;
    this.phase = 'override';
    this.elevatorLevel.phase = 'override';
    this.restorePower();
    this.saveNote();
  }

  saveNote() {
    if (this.noteAdded) return;
    this.noteAdded = true;
    this.note = `FIREFIGHTER SERVICE OVERRIDE\nOPEN = 1\nCLOSE = 0\nHELP = submit pair\n\nFour correct pairs are required.\nAfter authorization, press OPEN to release the doors.`;

    if (Array.isArray(this.phone?.notes)) {
      this.phone.notes.push({ title: 'Service Override', text: this.note });
    }
  }

  restorePower() {
    if (this.ambientLight) this.ambientLight.intensity = this.savedAmbientIntensity ?? 0.35;
    if (this.savedEnvironment) this.scene.environment = this.savedEnvironment;
    this.setCeilingLights(true);
    this.elevator.controls?.setWiringProgress?.([0, 1, 2, 3]);
    this.elevator.interior?.traverse?.(obj => {
      if (!obj.isLight) return;
      if (obj.userData.originalIntensity !== undefined) {
        obj.intensity = obj.userData.originalIntensity;
      }
    });
    this.showHint('Power restored. Enter the service override code.');
    this.say(['The ceiling lights buzz back to life.', 'The elevator is still stuck.']);
  }

  startDescent() {
    if (this.phase !== 'ready') return;
    this.phase = 'closing';
    this.elevatorLevel.phase = 'closing';
    this.elevator.closeDoors();
    this.elevator.controls?.buttons?.floor2?.userData?.setLit?.(true);
    this.say(['Floor 2 selected.', 'The elevator begins its descent.']);
  }

  moveCab(dy) {
    this.elevator.group.position.y += dy;
    this.player.groundY = this.elevator.group.position.y;
    this.camera.position.y = this.player.groundY + (this.player.eyeHeight ?? 1.7);
  }

  malfunction() {
    if (this.phase === 'stuck') return;
    this.phase = 'stuck';
    this.elevatorLevel.phase = 'stuck';
    this.floor = 3;
    if (this.elevatorLevel.objects) this.elevatorLevel.objects.visible = true;
    if (this.ambientLight) {
      this.savedAmbientIntensity ??= this.ambientLight.intensity;
      this.ambientLight.intensity = 0;
    }
    this.savedEnvironment ??= this.scene.environment;
    this.scene.environment = null;
    this.setCeilingLights(false);
    this.player.shake?.(0.12, 0.8);

    this.elevator.interior?.traverse?.(obj => {
      if (!obj.isLight) return;
      if (obj.userData.originalIntensity === undefined) {
        obj.userData.originalIntensity = obj.intensity;
      }
      obj.intensity = 0;
    });

    this.elevator.controls?.setFloor?.(3, 'idle');
    this.graffiti?.show?.();
    this.showHint('POWER FAILURE: select your phone (1), press E, and turn on the flashlight. Find the service panel.');
    this.say(['The elevator jolts violently.', 'The lights flicker out.', 'Something is wrong.']);
  }

  // dev to skip level
  skipToEscape() {
    if (this.phase === 'escaped') return;
    this.elevator.group.position.y = this.floorY[3];
    this.moveCab(0);
    this.floor = 3;
    this.elevator.controls?.setFloor?.(3, 'idle');
    this.phase = 'doorReady';
    this.elevatorLevel.phase = 'doorReady';
    this.handleButton({ action: 'doorOpen' });
  }

  handleButton(data) {
    if (this.phase === 'doorReady') {
      if (data.action === 'doorOpen') {
        this.phase = 'escaped';
        this.elevatorLevel.phase = 'escaped';
        this.showEscapeLanding();
        this.elevator.openDoors();
        this.player.setElevatorExit?.(true);
        this.onEscaped?.();                      
        this.showHint('EMERGENCY DOOR RELEASE: press Z to crawl through the gap. Floor 2 is below; watch the drop.');
        this.say([
          'The emergency locks release.',
          'The elevator does not move.',
          'The doors have opened onto a wall, with a gap at the bottom. I could crawl through.'
        ]);
      }
      return true;
    }

    if (data.action === 'floor' && this.phase === 'ready') {
      if (Number(data.floor) === 2) this.startDescent();
      else this.say(['Floor 2. I just need to get downstairs.']);
      return true;
    }

    if (this.phase === 'override') {
      if (data.action === 'doorOpen') return this.enterBit('1');
      if (data.action === 'doorClose') return this.enterBit('0');
      if (data.action === 'help') return this.submitPair();
    }

    if (this.phase !== 'ready' && ['floor', 'doorOpen', 'doorClose', 'help'].includes(data.action)) {
      this.showHint('The elevator controls are unresponsive.');
      return true;
    }
    return false;
  }

  enterBit(bit) {
    if (this.bits.length >= 2) {
      this.showHint('Press HELP to submit this pair.');
      return true;
    }
    this.bits += bit;
    this.showHint(`OVERRIDE ${this.codeIndex + 1}/4: ${this.bits.padEnd(2, '_')}; HELP to submit`);
    return true;
  }

  submitPair() {
    if (this.bits.length !== 2) {
      this.showHint('Enter two bits before HELP.');
      return true;
    }

    if (this.bits !== this.code[this.codeIndex]) {
      this.bits = '';
      this.codeIndex = 0;
      this.clearProgress();
      this.showHint('INCORRECT CODE; sequence reset.');
      return true;
    }

    this.codeIndex++;
    this.bits = '';
    const floorIds = ['floor2', 'floor3', 'floor4', 'floor5'];
    this.elevator.controls?.buttons?.[floorIds[this.codeIndex - 1]]?.userData?.setLit?.(true);

    if (this.codeIndex === this.code.length) {
      this.phase = 'doorReady';
      this.elevatorLevel.phase = 'doorReady';
      this.showHint('OVERRIDE ACCEPTED: press OPEN to release doors.');
      this.say(['Override accepted.', 'Press OPEN to release the emergency doors.']);
    } else {
      this.showHint(`PAIR ACCEPTED: ${this.codeIndex}/4`);
    }
    return true;
  }

  clearProgress() {
    for (const id of ['floor2', 'floor3', 'floor4', 'floor5']) {
      this.elevator.controls?.buttons?.[id]?.userData?.setLit?.(false);
    }
  }

  update(delta) {
    if (this.phase === 'escaped' && !this.exited && this.player.position.z > 2.6) {
      this.exited = true;
      if (this.hint) this.hint.hidden = true;
    }

    if (this.phase === 'closing' && this.elevator.doorState === 'closed') {
      this.phase = 'descending';
      this.elevatorLevel.phase = 'descending';
      this.travelTime = 0;
    }

    if (this.phase === 'descending') {
      const step = Math.min(delta, Math.max(0, 2.4 - this.travelTime));
      this.travelTime += step;
      this.moveCab(-step * 1.65);
      if (this.travelTime >= 2.4) this.malfunction();
    }
  }
}
