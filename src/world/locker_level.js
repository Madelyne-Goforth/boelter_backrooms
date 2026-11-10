import * as THREE from 'three';

export class LockerLevel {
  constructor({
    scene,
    dialogue,
    onInputChange = () => {},
    onComplete = () => {}
  }) {
    this.dialogue = dialogue;
    this.onInputChange = onInputChange;
    this.onComplete = onComplete;

    this.phase = 'inactive';
    this.doors = [];
    this.colliders = [];

    this.objects = new THREE.Group();
    this.objects.position.set(7.55, 0, 3.86);
    this.objects.rotation.y = -Math.PI / 2;
    this.objects.visible = false;

    scene.add(this.objects);

    this.makeProps();
    this.makeInput();
    this.update(0);
  }

  get inputOpen() {
    return this.inputDialog.open;
  }

  makeMesh(
    id,
    label,
    geometry,
    material,
    position,
    parent = this.objects
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);

    if (id !== null) {
      mesh.userData = {
        kind: 'lockerPuzzle',
        id,
        label,
        interactable: true
      };
    }

    parent.add(mesh);
    return mesh;
  }

  addDetail(parent, geometry, material, position) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.userData = { ...parent.userData };

    parent.add(mesh);
    return mesh;
  }

  addLabel(parent, text, position) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d9cfad';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#252a25';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return this.addDetail(
      parent,
      new THREE.PlaneGeometry(0.19, 0.085),
      new THREE.MeshBasicMaterial({ map: texture }),
      position
    );
  }

  makeProps() {
    const steel = new THREE.MeshStandardMaterial({
      color: 0x858b80,
      metalness: 0.5,
      roughness: 0.7
    });

    const dark = new THREE.MeshStandardMaterial({
      color: 0x252a26
    });

    const silver = new THREE.MeshStandardMaterial({
      color: 0xc2c5bd,
      metalness: 0.8,
      roughness: 0.3
    });

    const gold = new THREE.MeshStandardMaterial({
      color: 0xc7a44c,
      metalness: 0.7,
      roughness: 0.3
    });

    const frame = (size, position) => this.makeMesh(
      null,
      '',
      new THREE.BoxGeometry(...size),
      steel,
      position
    );

    // Back panel.
    this.makeMesh(
      null,
      '',
      new THREE.BoxGeometry(2.48, 2.55, 0.04),
      dark,
      [0, 1.275, -0.29]
    );

    // Vertical dividers.
    for (let i = 0; i <= 4; i++) {
      frame(
        [0.035, 2.55, 0.58],
        [-1.24 + i * 0.62, 1.275, 0]
      );
    }

    // Bottom, middle shelf, and top.
    for (const y of [0.06, 1.29, 2.55]) {
      frame([2.48, 0.04, 0.58], [0, y, 0]);
    }

    this.bodyCollider = {
      box: new THREE.Box3(),
      solid: false
    };

    this.colliders.push(this.bodyCollider);

    for (let i = 0; i < 8; i++) {
      const hinge = new THREE.Group();

      hinge.position.set(
        -1.24 + (i % 4) * 0.62 + 0.0225,
        i < 4 ? 1.92 : 0.68,
        0.305
      );

      this.objects.add(hinge);

      const mesh = this.makeMesh(
        `locker-${i}`,
        i === 5
          ? 'Inspect combination lock'
          : 'Open / close locker',
        new THREE.BoxGeometry(0.575, 1.19, 0.035),
        steel,
        [0.2875, 0, 0],
        hinge
      );

      // Handle.
      this.addDetail(
        mesh,
        new THREE.BoxGeometry(0.025, 0.15, 0.035),
        silver,
        [0.1975, 0, 0.04]
      );

      // Vent slots.
      for (let slot = 0; slot < 4; slot++) {
        this.addDetail(
          mesh,
          new THREE.BoxGeometry(0.25, 0.012, 0.008),
          dark,
          [0, 0.48 - slot * 0.035, 0.023]
        );
      }

      this.addLabel(mesh, String(201 + i), [0, 0.31, 0.02]);

      // Only locker 206 has a combination lock.
      if (i === 5) {
        this.padlock = new THREE.Group();
        this.padlock.position.set(0.1975, -0.08, 0.085);
        this.padlock.userData = { ...mesh.userData };
        mesh.add(this.padlock);

        this.addDetail(
          this.padlock,
          new THREE.BoxGeometry(0.145, 0.12, 0.055),
          gold,
          [0, 0, 0]
        );

        this.addDetail(
          this.padlock,
          new THREE.TorusGeometry(
            0.055, 0.012, 8, 20, Math.PI
          ),
          silver,
          [0, 0.07, 0]
        );
      }

      const collider = {
        box: new THREE.Box3(),
        solid: false
      };

      this.colliders.push(collider);
      this.doors.push({
        hinge,
        mesh,
        collider,
        target: 0
      });
    }
  }

  makeInput() {
    this.inputDialog = document.createElement('dialog');

    this.inputDialog.style.cssText = `
      background: #0c0e12;
      color: #f5f5f5;
      border: 2px solid #d9dce1;
      border-radius: 8px;
      padding: 24px;
      width: 320px;
      max-width: 80vw;
      font: 16px/1.5 monospace;
    `;

    this.inputDialog.innerHTML = `
      <form method="dialog">
        <div style="color:#d4b77d">LOCKERS</div>
        <p>Locker for: CS174A · Fall 2026</p>
        <p>Hint: Where does class meet?</p>

        <label>
          Four digits
          <input
            aria-label="Locker code"
            inputmode="numeric"
            maxlength="4"
            autocomplete="off"
            required
            pattern="[0-9]{4}"
            style="
              display:block;
              box-sizing:border-box;
              width:100%;
              margin:12px 0;
              padding:10px;
              font:28px monospace;
            "
          >
        </label>

        <p role="status"></p>
        <button type="button">Cancel</button>
        <button type="submit">Unlock</button>
      </form>
    `;

    document.body.appendChild(this.inputDialog);

    this.input = this.inputDialog.querySelector('input');
    this.status = this.inputDialog.querySelector('[role=status]');

    this.inputDialog.querySelector('[type=button]').onclick = () => {
      this.inputDialog.close();
    };

    this.inputDialog.addEventListener('close', () => {
      this.onInputChange(false);
    });

    this.input.oninput = () => {
      this.input.value = this.input.value
        .replace(/\D/g, '')
        .slice(0, 4);

      this.status.textContent = '';
    };

    this.inputDialog.querySelector('form').onsubmit = event => {
      event.preventDefault();

      if (this.input.value !== '5249') {
        this.status.textContent = 'Wrong combination. Try again.';
        this.input.select();
        return;
      }

      this.phase = 'unlocked';
      this.padlock.visible = false;
      this.doors[5].target = -Math.PI * 0.55;

      this.inputDialog.close();

      this.say([
        'Click.',
        'The lock comes loose.',
        'The locker swings open.'
      ]);

      this.onComplete();
    };

    this.blockGameKeys = event => {
      if (this.inputOpen) event.stopImmediatePropagation();
    };

    window.addEventListener('keydown', this.blockGameKeys, true);
    window.addEventListener('keyup', this.blockGameKeys, true);
  }

  say(lines) {
    this.dialogue.show(lines, 'LOCKERS', 'SYSTEM');
  }

  start() {
    if (this.phase !== 'inactive') return;

    this.phase = 'locked';
    this.objects.visible = true;
    this.update(0);
  }

  interact(data) {
    if (data.kind !== 'lockerPuzzle') return false;
    if (this.phase === 'inactive' || this.inputOpen) return true;

    if (data.id === 'courseNote') {
      this.say([
        'CS174A — Fall 2026',
        'Lecture classroom: Boelter Hall 5249.'
      ]);

      return true;
    }

    const index = this.doors.findIndex(
      (_, i) => data.id === `locker-${i}`
    );

    if (index === -1) return true;

    if (index === 5 && this.phase === 'locked') {
      this.onInputChange(true);

      if (document.pointerLockElement) {
        document.exitPointerLock();
      }

      this.input.value = '';
      this.status.textContent = '';
      this.inputDialog.showModal();
      this.input.focus();
    } else {
      const door = this.doors[index];

      door.target = door.target === 0
        ? -Math.PI * 0.55
        : 0;
    }

    return true;
  }

  update(delta) {
    const active = this.phase !== 'inactive';

    for (const door of this.doors) {
      door.hinge.rotation.y = THREE.MathUtils.damp(
        door.hinge.rotation.y,
        door.target,
        7,
        delta
      );

      door.collider.solid = active;
    }

    this.objects.updateWorldMatrix(true, true);
    this.bodyCollider.solid = active;

    this.bodyCollider.box.set(
      new THREE.Vector3(-1.26, 0, -0.31),
      new THREE.Vector3(1.26, 2.57, 0.29)
    ).applyMatrix4(this.objects.matrixWorld);

    for (const door of this.doors) {
      door.collider.box.setFromObject(door.mesh);
    }
  }

  dispose() {
    if (this.inputOpen) this.inputDialog.close();

    window.removeEventListener('keydown', this.blockGameKeys, true);
    window.removeEventListener('keyup', this.blockGameKeys, true);

    this.inputDialog.remove();
    this.objects.removeFromParent();
  }
}