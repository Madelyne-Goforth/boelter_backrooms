
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

    // Posture: standing, crouching, prone
    this.posture = "standing";

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

    document.addEventListener("pointerlockchange", () => {
      this.isLocked =
        document.pointerLockElement === this.domElement;

      if (!this.isLocked) {
        this.keys = {};
      }
    });

    document.addEventListener("mousemove", (event) => {
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

    // Face elevator doors on startup
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  setupKeyboard() {
    document.addEventListener("keydown", (event) => {
      this.keys[event.code] = true;

      if (!this.isLocked) return;

      // Prevent browser behavior for gameplay keys
      if (
        event.code === "Space" ||
        event.code === "ControlLeft" ||
        event.code === "ControlRight"
      ) {
        event.preventDefault();
      }

      // Only toggle once per keypress
      if (event.repeat) return;

      // C: toggle crouch
      if (
        event.code === "KeyC"
      ) {
        this.posture =
          this.posture === "crouching"
            ? "standing"
            : "crouching";
      }

      // Z: toggle prone
      if (event.code === "KeyZ") {
        this.posture =
          this.posture === "prone"
            ? "standing"
            : "prone";
      }

      // Space: return to standing
      if (event.code === "Space") {
        this.posture = "standing";
      }
    });

    document.addEventListener("keyup", (event) => {
      this.keys[event.code] = false;
    });

    window.addEventListener("blur", () => {
      this.keys = {};
    });
  }

  updateMovement(delta) {
    if (!this.isLocked) return;

    // Movement relative to camera yaw
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

    // Normalize diagonal movement
    if (direction.lengthSq() > 0) {
      direction.normalize();
    }

    const sprinting =
      this.keys.ShiftLeft || this.keys.ShiftRight;

    // Choose speed based on posture
    let speed = this.walkSpeed;

    if (this.posture === "prone") {
      speed = this.crawlSpeed;
    } else if (this.posture === "crouching") {
      speed = this.crouchSpeed;
    } else if (sprinting) {
      speed = this.sprintSpeed;
    }

    this.position.addScaledVector(direction, speed * delta);

    // Keep player inside elevator
    this.checkCollision();

    // Update horizontal camera position
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

  updatePosture(delta) {
    // Determine target height
    if (this.posture === "crouching") {
      this.targetEyeHeight = crouchHeight;
    } else if (this.posture === "prone") {
      this.targetEyeHeight = lowCrawlHeight;
    } else {
      this.targetEyeHeight = standingHeight;
    }

    // Smooth height transition
    const transitionSpeed = 5;
    const step = transitionSpeed * delta;
    const difference =
      this.targetEyeHeight - this.eyeHeight;

    if (Math.abs(difference) <= step) {
      this.eyeHeight = this.targetEyeHeight;
    } else {
      this.eyeHeight += Math.sign(difference) * step;
    }

    // Update vertical camera position
    this.camera.position.y =
      this.groundY + this.eyeHeight;
  }
}
