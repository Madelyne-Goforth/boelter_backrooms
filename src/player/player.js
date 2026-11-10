
import * as THREE from 'three';

// Player eye heights
const standingHeight = 1.7;
const crouchHeight = 1.3;
const lowCrawlHeight = 0.3;

export class Player {
  constructor(camera, domElement, elevator) {
    this.camera = camera;
    this.domElement = domElement;
    this.elevator = elevator;

    this.position = new THREE.Vector3(0, 0, 0);

    this.yaw = Math.PI;
    this.pitch = 0;

    this.radius = 0.25;
    this.eyeHeight = standingHeight;
    this.targetEyeHeight = standingHeight;
    this.groundY = 0;

    this.isLocked = false;
    this.keys = {};

    // Movement speeds
    this.walkSpeed = 3.2;
    this.sprintSpeed = 5.5;
    this.crouchSpeed = 1.8;
    this.crawlSpeed = 0.8;

    // Posture
    this.posture = 'standing';

    // Elevator and Floor 2
    this.canExitElevator = false;
    this.hasExitedElevator = false;

    // Camera movement effects
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this.shakeDuration = 0;

    this.setupMouseLook();
    this.setupKeyboard();
  }

  setupMouseLook() {
    this.camera.rotation.order = 'YXZ';

    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked =
        document.pointerLockElement === this.domElement;

      if (!this.isLocked) {
        this.keys = {};
      }
    });

    document.addEventListener('mousemove', (event) => {
      if (!this.isLocked) return;

      const sensitivity = 0.002;

      this.yaw -= event.movementX * sensitivity;
      this.pitch -= event.movementY * sensitivity;

      this.pitch = THREE.MathUtils.clamp(
        this.pitch,
        -Math.PI / 2 + 0.05,
        Math.PI / 2 - 0.05
      );

      this.camera.rotation.set(this.pitch, this.yaw, 0);
    });

    // Face elevator doors
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  setupKeyboard() {
    document.addEventListener('keydown', (event) => {
      this.keys[event.code] = true;

      if (!this.isLocked) return;

      if (
        event.code === 'Space' ||
        event.code === 'ControlLeft' ||
        event.code === 'ControlRight'
      ) {
        event.preventDefault();
      }

      if (event.repeat) return;

      // C: crouch
      if (event.code === 'KeyC') {
        this.posture =
          this.posture === 'crouching'
            ? 'standing'
            : 'crouching';
      }

      // Z: prone
      if (event.code === 'KeyZ') {
        this.posture =
          this.posture === 'prone'
            ? 'standing'
            : 'prone';
      }

      // Space: stand
      if (event.code === 'Space') {
        this.posture = 'standing';
      }
    });

    document.addEventListener('keyup', (event) => {
      this.keys[event.code] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
    });
  }

  // Allow exit only after the elevator arrives
  setElevatorExit(enabled) {
    this.canExitElevator = enabled;
  }

  // Camera shake for elevator motion
  shake(amount = 0.025, duration = 0.4) {
    this.shakeAmount = amount;
    this.shakeDuration = duration;
    this.shakeTime = duration;
  }

  updateMovement(delta) {
    if (!this.isLocked) return;

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

    if (this.keys.KeyW) direction.add(forward);
    if (this.keys.KeyS) direction.sub(forward);
    if (this.keys.KeyD) direction.add(right);
    if (this.keys.KeyA) direction.sub(right);

    if (direction.lengthSq() > 0) {
      direction.normalize();
    }

    const sprinting =
      this.keys.ShiftLeft || this.keys.ShiftRight;

    let speed = this.walkSpeed;

    if (this.posture === 'prone') {
      speed = this.crawlSpeed;
    } else if (this.posture === 'crouching') {
      speed = this.crouchSpeed;
    } else if (sprinting) {
      speed = this.sprintSpeed;
    }

    this.position.addScaledVector(direction, speed * delta);

    this.checkCollision();

    this.camera.position.x = this.position.x;
    this.camera.position.z = this.position.z;
  }

  checkCollision() {
    if (!this.elevator) return;

    const halfWidth = this.elevator.width / 2;
    const halfDepth = this.elevator.depth / 2;
    const wallThickness = this.elevator.thickness;

    const maxX =
      halfWidth - wallThickness - this.radius;

    const maxZ =
      halfDepth - wallThickness - this.radius;

    const elevatorFront = maxZ;
    const elevatorBack = -maxZ;

    // Normal elevator collision
    if (!this.canExitElevator) {
      this.position.x = THREE.MathUtils.clamp(
        this.position.x,
        -maxX,
        maxX
      );

      this.position.z = THREE.MathUtils.clamp(
        this.position.z,
        elevatorBack,
        elevatorFront
      );

      return;
    }

    // Floor 2 exit is on the positive Z side
    const doorHalfWidth =
      this.elevator.doorWidth / 2 - this.radius;

    // The player can only pass through the doorway
    const insideDoorway =
      Math.abs(this.position.x) <= doorHalfWidth;

    // Prevent walking through the front wall
    if (
      !insideDoorway &&
      !this.hasExitedElevator &&
      this.position.z > elevatorFront
    ) {
      this.position.z = elevatorFront;
    }

    // Keep the player inside the elevator's side walls
    // until they cross the doorway
    if (this.position.z <= elevatorFront) {
      this.position.x = THREE.MathUtils.clamp(
        this.position.x,
        -maxX,
        maxX
      );
    }

    // Mark the player as having left the elevator
    if (this.position.z > elevatorFront) {
      this.hasExitedElevator = true;
    }

    // Floor 2 placeholder platform boundaries
    // Platform spans X -3.5 to 3.5 and Z 2.1 to 8.1
    if (this.hasExitedElevator) {
      const roomMaxX = 3.5 - this.radius;
      const roomMaxZ = 8.1 - this.radius;

      this.position.x = THREE.MathUtils.clamp(
        this.position.x,
        -roomMaxX,
        roomMaxX
      );

      this.position.z = Math.min(
        this.position.z,
        roomMaxZ
      );

      // Prevent walking through the elevator's
      // side walls when returning from the room
      if (
        this.position.z < elevatorFront &&
        Math.abs(this.position.x) > doorHalfWidth
      ) {
        this.position.z = elevatorFront;
      }

      this.position.z = Math.max(
        this.position.z,
        elevatorBack
      );
    }
  }

  updatePosture(delta) {
    if (this.posture === 'crouching') {
      this.targetEyeHeight = crouchHeight;
    } else if (this.posture === 'prone') {
      this.targetEyeHeight = lowCrawlHeight;
    } else {
      this.targetEyeHeight = standingHeight;
    }

    const transitionSpeed = 5;
    const step = transitionSpeed * delta;

    const difference =
      this.targetEyeHeight - this.eyeHeight;

    if (Math.abs(difference) <= step) {
      this.eyeHeight = this.targetEyeHeight;
    } else {
      this.eyeHeight += Math.sign(difference) * step;
    }

    // Ground height is the source of truth
    this.camera.position.y =
      this.groundY + this.eyeHeight;

    // Temporary camera shake
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(
        0,
        this.shakeTime - delta
      );

      const fade = this.shakeDuration > 0
        ? this.shakeTime / this.shakeDuration
        : 0;

      const amount = this.shakeAmount * fade;

      this.camera.position.x +=
        (Math.random() - 0.5) * amount;

      this.camera.position.y +=
        (Math.random() - 0.5) * amount;

      this.camera.position.z +=
        (Math.random() - 0.5) * amount;
    }
  }
}
