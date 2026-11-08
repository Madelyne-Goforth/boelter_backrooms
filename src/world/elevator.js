
import * as THREE from 'three';
import { createElevatorInterior } from './elevator_interior.js';

export class Elevator {
  constructor() {
    this.group = new THREE.Group();

    this.currentFloor = 'floor n∊ℕ';

    this.width = 4.2;
    this.height = 3.5;
    this.depth = 4.0;
    this.thickness = 0.1;

    this.doorWidth = 2.1;
    this.doorHeight = 2.7;

    this.createShell();
    this.createDoors();
    this.createButtons();

    this.interior = createElevatorInterior(this);
    this.group.add(this.interior);
  }

  createShell() {
    const {
      width, height, depth, thickness,
      doorWidth, doorHeight
    } = this;

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x777b80,
      roughness: 0.65,
      metalness: 0.2
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x777777,
      roughness: 0.9
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x55585b,
      roughness: 0.7
    });

    function box(w, h, d, material, x, y, z) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        material
      );

      mesh.position.set(x, y, z);
      return mesh;
    }

    // Floor
    this.group.add(box(
      width, thickness, depth,
      floorMaterial,
      0, -thickness / 2, 0
    ));

    // Ceiling
    this.group.add(box(
      width, thickness, depth,
      ceilingMaterial,
      0, height + thickness / 2, 0
    ));

    // Back wall
    this.group.add(box(
      width, height, thickness,
      wallMaterial,
      0, height / 2,
      -depth / 2 + thickness / 2
    ));

    // Left wall
    this.group.add(box(
      thickness, height, depth,
      wallMaterial,
      -width / 2 + thickness / 2,
      height / 2, 0
    ));

    // Right wall
    this.group.add(box(
      thickness, height, depth,
      wallMaterial,
      width / 2 - thickness / 2,
      height / 2, 0
    ));

    // Front wall with space for doors
    const sideWidth = (width - doorWidth) / 2;
    const headerHeight = height - doorHeight;
    const frontZ = depth / 2 - thickness / 2;

    this.group.add(box(
      sideWidth, doorHeight, thickness,
      wallMaterial,
      -(doorWidth + sideWidth) / 2,
      doorHeight / 2, frontZ
    ));

    this.group.add(box(
      sideWidth, doorHeight, thickness,
      wallMaterial,
      (doorWidth + sideWidth) / 2,
      doorHeight / 2, frontZ
    ));

    this.group.add(box(
      width, headerHeight, thickness,
      wallMaterial,
      0, doorHeight + headerHeight / 2, frontZ
    ));
  }

  createDoors() {
    const {
      depth, thickness, doorWidth, doorHeight
    } = this;

    const gap = 0.018;
    const panelWidth = (doorWidth - gap) / 2;
    const panelThickness = 0.05;

    const doorZ =
      depth / 2 - thickness - panelThickness / 2 - 0.01;

    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0xb6bcc2,
      metalness: 0.82,
      roughness: 0.3,
      envMapIntensity: 0.9
    });

    const doorGeometry = new THREE.BoxGeometry(
      panelWidth,
      doorHeight,
      panelThickness
    );

    this.leftDoor = new THREE.Mesh(
      doorGeometry,
      doorMaterial
    );

    this.rightDoor = new THREE.Mesh(
      doorGeometry,
      doorMaterial
    );

    // Small gap between the doors
    const closedX = gap / 2 + panelWidth / 2;

    this.leftDoor.position.set(
      -closedX,
      doorHeight / 2,
      doorZ
    );

    this.rightDoor.position.set(
      closedX,
      doorHeight / 2,
      doorZ
    );

    this.group.add(this.leftDoor);
    this.group.add(this.rightDoor);

    // Dark line behind the gap
    
    const seamMaterial = new THREE.MeshBasicMaterial({
        color: 0x050608
    });


    this.doorSeam = new THREE.Mesh(
      new THREE.BoxGeometry(
        gap + 0.008,
        doorHeight,
        0.008
      ),
      seamMaterial
    );

    this.doorSeam.position.set(
      0,
      doorHeight / 2,
      doorZ + panelThickness / 2 + 0.005
    );

    this.group.add(this.doorSeam);

    // Save positions for when doors move
    this.leftDoorClosedX = this.leftDoor.position.x;
    this.rightDoorClosedX = this.rightDoor.position.x;
  }

  createButtons() {
  this.buttons = [];

  // This group holds the whole control panel.
  const controls = new THREE.Group();

  // Place it beside the doors, facing inside the cabin.
  controls.position.set(
    (this.width + this.doorWidth) / 4,
    0,
    this.depth / 2 - this.thickness - 0.015
  );

  // Turn its front toward the inside of the elevator.
  controls.rotation.y = Math.PI;
  this.group.add(controls);

  const metal = new THREE.MeshStandardMaterial({
    color: 0x999b98,
    metalness: 0.75,
    roughness: 0.4
  });

  const silver = new THREE.MeshStandardMaterial({
    color: 0xd0d0cc,
    metalness: 0.85,
    roughness: 0.25
  });

  const black = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.6
  });

  // Tall metal backing.
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 2.75, 0.025),
    metal
  );

  panel.position.set(0, 1.45, 0);
  controls.add(panel);

  // Draw text on a small flat surface.
  function makeLabel(text, width, height, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 110px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
      })
    );
  }

  const rows = [
    ['8', '9'],
    ['6', '7'],
    ['4', '5'],
    ['★2', '3'],
    ['◀ | ▶', '▶ | ◀'],
    ['BELL', 'HELP']
  ];

  rows.forEach((row, rowIndex) => {
    row.forEach((text, columnIndex) => {
      const x = columnIndex === 0 ? -0.155 : 0.155;
      const y = 1.42 - rowIndex * 0.16;

      // Silver backing around the label and button.
      const backing = new THREE.Mesh(
        new THREE.BoxGeometry(0.285, 0.125, 0.018),
        silver
      );

      backing.position.set(x, y, 0.025);
      controls.add(backing);

      // Black area behind the number.
      const labelBackground = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.105, 0.01),
        black
      );

      labelBackground.position.set(x - 0.055, y, 0.04);
      controls.add(labelBackground);

      const label = makeLabel(text, 0.2, 0.15);
      label.position.set(x - 0.055, y, 0.047);
      controls.add(label);

      // Outer silver ring.
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.053, 0.053, 0.022, 32),
        silver
      );

      ring.rotation.x = Math.PI / 2;
      ring.position.set(x + 0.075, y, 0.045);
      controls.add(ring);

      // Actual pressable button.
      const button = new THREE.Mesh(
        new THREE.CylinderGeometry(0.039, 0.039, 0.026, 32),
        metal.clone()
      );

      button.rotation.x = Math.PI / 2;
      button.position.set(x + 0.075, y, 0.059);

      if (rowIndex < 4) {
        button.userData.floor = Number(text.replace('★', ''));
        button.userData.action = 'floor';
      } else {
        button.userData.action = [
          ['open', 'close'],
          ['alarm', 'help']
        ][rowIndex - 4][columnIndex];
      }

      controls.add(button);
      this.buttons.push(button);
    });
  });

  // Floor display above the buttons.
  const display = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.3, 0.02),
    black
  );

  display.position.set(0, 2.45, 0.025);
  controls.add(display);

  const floorNumber = makeLabel(this.currentFloor, 0.4, 0.22, '#8cff98');
  floorNumber.position.set(0, 2.45, 0.038);
  controls.add(floorNumber);

  // Speaker slots above the button rows.
  for (let i = 0; i < 5; i++) {
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.19, 0.008, 0.005),
      black
    );

    slot.position.set(0, 1.75 - i * 0.025, 0.016);
    controls.add(slot);
  }
}
}
