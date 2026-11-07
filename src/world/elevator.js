
import * as THREE from 'three';
import { createElevatorInterior } from './elevator_interior.js';

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
}
