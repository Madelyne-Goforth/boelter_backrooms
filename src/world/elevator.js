
import * as THREE from 'three';
import { createElevatorInterior } from './elevator_interior.js';
import { createElevatorControls } from './elevator_controlls.js';

export class Elevator {
  constructor() {
    this.group = new THREE.Group();

    this.width = 4.2;
    this.height = 3.5;
    this.depth = 4.0;
    this.thickness = 0.1;

    this.doorWidth = 2.1;
    this.doorHeight = 2.7;

    this.createShell();
    this.createDoors();

    // Door animation
    this.doorState = 'closed';
    this.doorProgress = 0;
    this.doorSpeed = 0.65;

    this.interior = createElevatorInterior(this);
    this.group.add(this.interior);

    this.controls = createElevatorControls(this);
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

    // Side walls
    this.group.add(box(
      thickness, height, depth,
      wallMaterial,
      -width / 2 + thickness / 2,
      height / 2, 0
    ));

    this.group.add(box(
      thickness, height, depth,
      wallMaterial,
      width / 2 - thickness / 2,
      height / 2, 0
    ));

    const sideWidth = (width - doorWidth) / 2;
    const headerHeight = height - doorHeight;
    const frontZ = depth / 2 - thickness / 2;

    // Original front walls
    this.group.add(box(
      sideWidth, doorHeight, thickness,
      wallMaterial,
      -(doorWidth + sideWidth) / 2,
      doorHeight / 2,
      frontZ
    ));

    this.group.add(box(
      sideWidth, doorHeight, thickness,
      wallMaterial,
      (doorWidth + sideWidth) / 2,
      doorHeight / 2,
      frontZ
    ));

    // Above the doors
    this.group.add(box(
      width, headerHeight, thickness,
      wallMaterial,
      0,
      doorHeight + headerHeight / 2,
      frontZ
    ));

    // Hallway-side wall extensions
    const outerWallDepth = 0.16;
    const outerWallZ = depth / 2 + outerWallDepth / 2;

    for (const side of [-1, 1]) {
      this.group.add(box(
        sideWidth,
        doorHeight,
        outerWallDepth,
        wallMaterial,
        side * (doorWidth + sideWidth) / 2,
        doorHeight / 2,
        outerWallZ
      ));
    }
  }

  createDoors() {
    const {
      depth, thickness, doorWidth, doorHeight
    } = this;

    const gap = 0.018;
    const panelWidth = (doorWidth - gap) / 2;
    const panelThickness = 0.05;

    // Recess the doors toward the hallway
    const doorZ =
      depth / 2 - thickness - panelThickness / 2 + 0.045;

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

    // Center seam
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
      doorZ - panelThickness / 2 - 0.005
    );

    this.group.add(this.doorSeam);

    // Save closed positions
    this.leftDoorClosedX = this.leftDoor.position.x;
    this.rightDoorClosedX = this.rightDoor.position.x;
  }

  openDoors() {
    if (this.doorState === 'open') return;
    this.doorState = 'opening';
  }

  closeDoors() {
    if (this.doorState === 'closed') return;
    this.doorState = 'closing';
  }

  update(delta) {
    this.controls?.updateFirePanel?.(delta);
    if (this.doorState === 'opening') {
      this.doorProgress += delta * this.doorSpeed;

      if (this.doorProgress >= 1) {
        this.doorProgress = 1;
        this.doorState = 'open';
      }
    }

    if (this.doorState === 'closing') {
      this.doorProgress -= delta * this.doorSpeed;

      if (this.doorProgress <= 0) {
        this.doorProgress = 0;
        this.doorState = 'closed';
      }
    }

    // Smooth start and stop
    const t = this.doorProgress;
    const eased = t * t * (3 - 2 * t);

    // Slide into the side walls
    const travel = this.doorWidth / 2;

    this.leftDoor.position.x =
      this.leftDoorClosedX - travel * eased;

    this.rightDoor.position.x =
      this.rightDoorClosedX + travel * eased;

    // Hide seam when opening
    this.doorSeam.visible = this.doorProgress < 0.01;
  }
}
