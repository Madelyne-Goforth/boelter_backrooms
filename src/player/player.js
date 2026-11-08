// Note: Y = 0 is elevator baseline/floor 5 (ground level)

// Elevator boundaries
// -2 < x < 2
// -1.9 < z < 1.9
// 0 < y < 3.5
// Doorway centered at x = 0, faces positive Z

import * as THREE from 'three';

const standingHeight = 1.7;
const crouchHeight = 1.3;
const lowCrawlHeight = 0.3;

export class Player {
  constructor(camera, domElement, elevator) {
    this.camera = camera;
    this.domElement = domElement;

    this.position = new THREE.Vector3(0, 0, 0);

    this.yaw = Math.PI;
    this.pitch = 0;

    this.radius = 0.25;
    this.eyeHeight = standingHeight;
    this.groundY = 0;

    this.isLocked = false;
    this.keys = {};

    this.walkSpeed = 3.2;
    this.sprintSpeed = 5.5;

    this.elevator = elevator;

    this.setupMouseLook();
    this.setupKeyboard();
  }

    setupMouseLook() {
    this.camera.rotation.order = 'YXZ';

    // Lock mouse when clicking the game
    this.domElement.addEventListener("click", () => {
        if (!this.isLocked) {
        this.domElement.requestPointerLock();
        }
    });

    // Check whether mouse is locked
    document.addEventListener("pointerlockchange", () => {
        this.isLocked = document.pointerLockElement === this.domElement;
    });

    // Rotate camera based on mouse movement
    document.addEventListener("mousemove", (event) => {
        if (!this.isLocked) return;

        const sensitivity = 0.002;

        this.yaw -= event.movementX * sensitivity;
        this.pitch -= event.movementY * sensitivity;

        // Prevent looking too far up or down
        this.pitch = THREE.MathUtils.clamp(
        this.pitch,
        -Math.PI / 2 + 0.05,
        Math.PI / 2 - 0.05
        );

        this.camera.rotation.set(this.pitch, this.yaw, 0);
    });

    // Face elevator doors when starting
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    }

    setupKeyboard() {
        document.addEventListener("keydown", (event) => {
            this.keys[event.code] = true;
        });

        document.addEventListener("keyup", (event) => {
            this.keys[event.code] = false;
        });

        window.addEventListener("blur", () => {
            this.keys = {};
        });
    }


    updateMovement(delta) {
        // Don't move when the mouse is unlocked
        if (!this.isLocked) return;

        // Forward direction based on where the player is facing
        const forward = new THREE.Vector3(
            -Math.sin(this.yaw),
            0,
            -Math.cos(this.yaw)
        );

        const right = new THREE.Vector3(
            Math.cos(this.yaw),
            0,
            -Math.sin(this.yaw)
        );

        const direction = new THREE.Vector3();

        // WASD input
        if (this.keys.KeyW) direction.add(forward);
        if (this.keys.KeyS) direction.sub(forward);
        if (this.keys.KeyD) direction.add(right);
        if (this.keys.KeyA) direction.sub(right);

        // Prevent diagonal movement from being faster
        if (direction.lengthSq() > 0) {
            direction.normalize();
        }

        // Sprint when holding Shift
        const sprinting = this.keys.ShiftLeft || this.keys.ShiftRight;
        const speed = sprinting ? this.sprintSpeed : this.walkSpeed;

        // Move player based on elapsed time
        this.position.addScaledVector(direction, speed * delta);
        this.checkCollision();

        // Update camera position
        this.camera.position.set(
            this.position.x,
            this.groundY + this.eyeHeight,
            this.position.z
        );
    }

    
    checkCollision() {
        if (!this.elevator) return;

        const halfWidth = this.elevator.width / 2;
        const halfDepth = this.elevator.depth / 2;
        const wallThickness = this.elevator.thickness;

        // Account for wall thickness and player width
        const maxX = halfWidth - wallThickness - this.radius;
        const maxZ = halfDepth - wallThickness - this.radius;

        this.position.x = THREE.MathUtils.clamp(
            this.position.x,
            -maxX,
            maxX
        );

        this.position.z = THREE.MathUtils.clamp(
            this.position.z,
            -maxZ,
            maxZ
        );
    }


}