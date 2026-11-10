
import * as THREE from 'three';

export class ElevatorLevel {
  constructor({
    elevator,
    inventory,
    dialogue,
    onInventoryChange = () => {},
    onEscape = () => {}
  }) {
    this.elevator = elevator;
    this.inventory = inventory;
    this.dialogue = dialogue;
    this.onInventoryChange = onInventoryChange;
    this.onEscape = onEscape;

    // Demo starts stuck
    this.phase = 'ready';
    this.elapsed = 0;
    this.panelUnlocked = false;
    this.panelOpening = false;

    this.parts = {
      rearTube: false,
      cornerTube: false,
      ductTape: false
    };

    this.rodAssembled = false;
    this.keyRetrieved = false;

    this.objects = new THREE.Group();
    this.elevator.group.add(this.objects);

    this.makeIcons();
    this.makeProps();

    this.elevator.closeDoors();
  }

  makeMesh(id, label, geometry, material, position) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.userData = {
      kind: 'elevatorPuzzle',
      id,
      label,
      interactable: true
    };

    this.objects.add(mesh);
    return mesh;
  }

  addDetail(parent, geometry, material, position) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.userData = { ...parent.userData };
    parent.add(mesh);
    return mesh;
  }

  makeIcon(svg) {
    return 'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(svg);
  }

  makeIcons() {
    this.tubeIcon = this.makeIcon(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <g transform="rotate(-35 32 32)">
          <rect x="27" y="12" width="10" height="40" rx="2"
            fill="#59636b" stroke="#242a2e" stroke-width="2"/>
          <ellipse cx="32" cy="12" rx="5" ry="3"
            fill="#30383e" stroke="#a0a9af" stroke-width="2"/>
          <path d="M29 17V47" stroke="#a0a9af" stroke-width="2"/>
        </g>
      </svg>
    `);

    this.tapeIcon = this.makeIcon(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <ellipse cx="31" cy="34" rx="23" ry="19" fill="#181a1c"/>
        <ellipse cx="31" cy="34" rx="10" ry="9" fill="#a58b66"/>
        <ellipse cx="31" cy="34" rx="6" ry="5" fill="#30343a"/>
        <path d="M47 42L59 50L54 57L40 48" fill="#181a1c"/>
      </svg>
    `);

    this.rodIcon = this.makeIcon(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <g transform="rotate(-35 32 32)">
          <rect x="28" y="4" width="8" height="56" rx="2"
            fill="#59636b" stroke="#242a2e" stroke-width="2"/>
          <rect x="25" y="28" width="14" height="12"
            rx="2" fill="#181a1c"/>
          <path d="M30 8V55" stroke="#a0a9af" stroke-width="2"/>
        </g>
      </svg>
    `);

    this.keyIcon = this.makeIcon(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <circle cx="20" cy="20" r="11"
          fill="none" stroke="#bfc4c7" stroke-width="7"/>
        <path d="M28 28L51 51H58V43H51V36L34 22"
          fill="none" stroke="#bfc4c7" stroke-width="7"
          stroke-linejoin="round"/>
      </svg>
    `);
  }

  makeProps() {
    const metal = new THREE.MeshStandardMaterial({
      color: 0x515b62,
      metalness: 0.7,
      roughness: 0.5
    });

    const tapeMaterial = new THREE.MeshStandardMaterial({
      color: 0x17191b,
      roughness: 0.85
    });

    const cardboard = new THREE.MeshStandardMaterial({
      color: 0x947d5f,
      roughness: 0.95
    });

    const keyMaterial = new THREE.MeshStandardMaterial({
      color: 0xb7b9b5,
      metalness: 0.85,
      roughness: 0.3
    });

    const backZ = -this.elevator.depth / 2 + 0.24;

    // Tube tucked into gap bn rear wall panels
    this.rearTube = this.makeMesh(
      'rearTube',
      'Pick up metal tube',
      new THREE.CylinderGeometry(0.019, 0.019, 0.68, 12),
      metal,
      [-0.655, 1.53, -1.865]
    );

    this.rearTube.rotation.z = 0.015;

    // Tube leaning into back-right corner
    this.cornerTube = this.makeMesh(
      'cornerTube',
      'Pick up metal tube',
      new THREE.CylinderGeometry(0.019, 0.019, 0.82, 12),
      metal,
      [1.73, 0.40, -1.57]
    );

    // Top leans toward right wall
    this.cornerTube.rotation.z = -0.24;
    this.cornerTube.rotation.x = -0.22;

    // Duct tape on floor
    this.ductTape = this.makeMesh(
      'ductTape',
      'Pick up duct tape',
      new THREE.TorusGeometry(0.09, 0.035, 12, 32),
      tapeMaterial,
      [1.48, 0.039, 0.85]
    );

    this.ductTape.rotation.x = Math.PI / 2;

    this.addDetail(
      this.ductTape,
      new THREE.TorusGeometry(0.052, 0.006, 8, 32),
      cardboard,
      [0, 0, 0]
    );

    this.addDetail(
      this.ductTape,
      new THREE.BoxGeometry(0.19, 0.008, 0.065),
      tapeMaterial,
      [0.16, 0, 0]
    );

    // Key taped to ceiling
    const keyY = this.elevator.height - 0.22;

    this.ceilingKey = this.makeMesh(
      'ceilingKey',
      'Inspect taped key',
      new THREE.TorusGeometry(0.065, 0.015, 8, 24),
      keyMaterial,
      [0.35, keyY, -0.55]
    );

    this.ceilingKey.rotation.x = Math.PI / 2;

    this.addDetail(
      this.ceilingKey,
      new THREE.BoxGeometry(0.2, 0.025, 0.025),
      keyMaterial,
      [0.15, 0, 0]
    );

    this.addDetail(
      this.ceilingKey,
      new THREE.BoxGeometry(0.035, 0.025, 0.055),
      keyMaterial,
      [0.22, 0, 0.035]
    );

    this.addDetail(
      this.ceilingKey,
      new THREE.BoxGeometry(0.035, 0.025, 0.055),
      keyMaterial,
      [0.29, 0, 0.035]
    );

    this.ceilingTape = this.makeMesh(
      'ceilingKey',
      'Inspect taped key',
      new THREE.BoxGeometry(0.065, 0.012, 0.2),
      tapeMaterial,
      [0.48, keyY + 0.02, -0.55]
    );
  }

  say(lines) {
    this.dialogue.show(lines, 'ELEVATOR', 'SYSTEM');
  }

  hasItem(id) {
    return this.inventory.inventory.some(
      item => item && item.id === id
    );
  }

  removeItem(id) {
    const index = this.inventory.inventory.findIndex(
      item => item && item.id === id
    );

    if (index === -1) return null;

    const removed = this.inventory.removeItem(index);
    this.onInventoryChange();
    return removed;
  }

  addItem(item) {
    const success = this.inventory.addItem(item);
    if (success) this.onInventoryChange();
    return success;
  }

  start() {
    if (this.phase !== 'ready') return;

    this.phase = 'closing';
    this.elapsed = 0;
    this.elevator.closeDoors();

    this.say([
      'Floor 2 selected.',
      'Finally. Time to get out of here.'
    ]);
  }

  update(delta) {
    // ElevatorSprint owns descent and malfunction timing.
    // Keep this method for compatibility with the main game loop.
  }

  collectPart(id, mesh, item, lines) {
    if (this.parts[id]) return;

    if (!this.addItem(item)) {
      this.say(['My inventory is full.']);
      return;
    }

    if (id === 'rearTube' || id === 'cornerTube') {
      const alreadyFoundTube =
        this.parts.rearTube || this.parts.cornerTube;

      lines = alreadyFoundTube
        ? ['Another metal tube.', 'Huh. Might be useful together.']
        : ['Hmmm... a fun stick?', 'Might as well take it.'];
    }

    this.parts[id] = true;
    mesh.visible = false;
    this.say(lines);
  }

  assembleRod() {
    if (this.phase !== 'stuck') {
      this.say(['I should probably leave that alone for now.']);
      return;
    }

    if (
      !this.hasItem('rear-tube') ||
      !this.hasItem('corner-tube') ||
      !this.hasItem('duct-tape')
    ) {
      this.say([
        'I need two metal tubes and something to hold them together.'
      ]);
      return;
    }

    this.removeItem('rear-tube');
    this.removeItem('corner-tube');

    if (this.addItem({
      id: 'retrieval-rod',
      name: 'Retrieval Rod',
      type: 'tool',
      consumable: true,
      icon: this.rodIcon
    })) {
      this.rodAssembled = true;
      this.say([
        'I fit the two metal tubes together.',
        'A little duct tape should hold them.',
        'There. One very questionable retrieval rod.'
      ]);
    }
  }

  // Register the existing panel's hinge from elevator.js
  setPanelHinge(hinge) {
    this.panelHinge = hinge;
  }

  interact(data) {
    if (data.kind !== 'elevatorPuzzle') return false;

    const id = data.id;

    if (id === 'rearTube') {
      this.collectPart(
        'rearTube',
        this.rearTube,
        {
          id: 'rear-tube',
          name: 'Metal Tube',
          type: 'material',
          icon: this.tubeIcon
        },
        ['Hmmm... a fun stick?']
      );
      return true;
    }

    if (id === 'cornerTube') {
      this.collectPart(
        'cornerTube',
        this.cornerTube,
        {
          id: 'corner-tube',
          name: 'Metal Tube',
          type: 'material',
          icon: this.tubeIcon
        },
        ['Hmmm... a fun stick?']
      );
      return true;
    }

    if (id === 'ductTape') {
      this.collectPart(
        'ductTape',
        this.ductTape,
        {
          id: 'duct-tape',
          name: 'Duct Tape',
          type: 'material',
          icon: this.tapeIcon
        },
        ['Duct tape.', 'Always useful.']
      );
      return true;
    }

    if (id === 'ceilingKey') {
      if (this.keyRetrieved) return true;

      if (!this.hasItem('retrieval-rod')) {
        if (
          this.hasItem('rear-tube') &&
          this.hasItem('corner-tube') &&
          this.hasItem('duct-tape')
        ) {
          this.assembleRod();
        } else {
          this.say([
            'A key taped to the ceiling.',
            'Too high to reach.',
            'I need something longer.'
          ]);
        }
        return true;
      }

      this.removeItem('retrieval-rod');

      if (!this.addItem({
        id: 'maintenance-key',
        name: 'Maintenance Key',
        type: 'quest',
        consumable: true,
        icon: this.keyIcon
      })) {
        this.addItem({
          id: 'retrieval-rod',
          name: 'Retrieval Rod',
          type: 'tool',
          consumable: true,
          icon: this.rodIcon
        });

        this.say(['My inventory is full.']);
        return true;
      }

      this.keyRetrieved = true;
      this.ceilingKey.visible = false;
      this.ceilingTape.visible = false;

      this.say([
        'I hook the key with the rod.',
        'The tape comes loose.',
        'Got it!'
      ]);
      return true;
    }

    if (id === 'puzzlePanel') {
      if (this.panelUnlocked) {
        // Keep visual state synchronized with puzzle state
        this.elevator.controls.openFirePanel();

        this.say([
          'The firefighter panel is already unlocked.'
        ]);
        return true;
      }

      if (!this.hasItem('maintenance-key')) {
        this.say([
          "A locked firefighter's access panel.",
          'There is a small keyhole.'
        ]);
        return true;
      }

      this.removeItem('maintenance-key');
      this.panelUnlocked = true;
      this.phase = 'panel-open';

      // Swing open the existing firefighter panel
      this.elevator.controls.openFirePanel();

      this.say([
        'The key fits.',
        'Click.',
        'The firefighter panel swings open.',
        'There is some kind of control system inside.'
      ]);
      return true;
    }

    return false;
  }
}
