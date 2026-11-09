
import * as THREE from 'three';
import './style.css';

import { Elevator } from './world/elevator.js';
import { createElevatorReflectionEnvironment } from './world/elevator_interior.js';
import { Player } from './player/player.js';
import { Inventory } from './systems/inventory.js';
import { Hotbar } from './ui/hotbar.js';
import { Interaction } from './systems/interactions.js';
import { Dialogue } from './ui/dialogue.js';
import { Phone } from './ui/phone.js';
import './ui/phone.css';
import { ElevatorLevel } from './world/elevator_level.js';
import { BoelterFloor } from './world/boelter_floor.js';


// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.environment = createElevatorReflectionEnvironment();


// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);


// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

document.querySelector('#app').appendChild(renderer.domElement);


// Crosshair
const crosshair = document.createElement('div');
crosshair.id = 'crosshair';
document.body.appendChild(crosshair);


// Interaction prompt
const interactPrompt = document.createElement('div');
interactPrompt.id = 'interact-prompt';
interactPrompt.innerHTML = '<span>F</span> Interact';
document.body.appendChild(interactPrompt);


// Elevator
const elevator = new Elevator();
scene.add(elevator.group);

// Player
const player = new Player(
  camera,
  renderer.domElement,
  elevator
);


// Camera position
camera.position.set(
  player.position.x,
  player.groundY + player.eyeHeight,
  player.position.z
);


// Inventory and HUD
const inventory = new Inventory();
const hotbar = new Hotbar(inventory);
hotbar.render();

// Update hotbar when items are added or removed
inventory.onChange = () => {
  hotbar.render();
};


// Dialogue
const dialogue = new Dialogue({
  onOpen: () => {
    player.keys = {};
  },
  onClose: () => {
    player.keys = {};
  }
});


// Floor Two (needs elevator, player and dialogue to exist first)
const floor = new BoelterFloor({ elevator, dialogue });
scene.add(floor.group);
player.setColliders(floor.colliders);


// In-game clock
class GameClock {
  constructor() {
    this.time = new Date(2026, 10, 7, 21, 41, 0).getTime();
    this.speed = 1;
  }

  update(delta) {
    this.time += delta * 1000 * this.speed;
  }

  getDate() {
    return new Date(this.time);
  }
}

const gameClock = new GameClock();


const elevatorLevel = new ElevatorLevel({
  elevator,
  inventory,
  dialogue,
  onInventoryChange: () => hotbar.render()
});

// DEV ONLY: skip the elevator puzzle so we can test the floor
const DEV_SKIP_ELEVATOR = true;
if (DEV_SKIP_ELEVATOR) {
  elevatorLevel.phase = 'ready';   // unlocks the door buttons too
  elevator.openDoors();
}


// Camera-mounted flashlight
const flashlight = new THREE.SpotLight(
  0xffffff,
  15,
  22,
  Math.PI / 7,
  0.45,
  1.2
);

flashlight.position.set(0, -0.12, -0.15);
flashlight.target.position.set(0, -0.12, -8);
flashlight.visible = false;

camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);


// Phone
const phone = new Phone(
  // Phone opens
  () => {
    player.keys = {};

    if (document.pointerLockElement !== null) {
      document.exitPointerLock();
    }
  },

  // Phone closes
  () => {
    player.keys = {};
  },

  // Flashlight changes
  (enabled) => {
    flashlight.visible = enabled;
  },

  gameClock
);


// Check whether the player is typing
function isTyping(event) {
  const element = event.target;

  if (element instanceof HTMLElement) {
    if (element.tagName === 'INPUT') {
      return true;
    }

    if (element.tagName === 'TEXTAREA') {
      return true;
    }

    if (element.isContentEditable) {
      return true;
    }
  }

  return false;
}


// Phone keyboard controls
function handlePhoneKeys(event) {
  // Allow typing inside phone inputs
  if (isTyping(event)) {
    return;
  }

  if (event.repeat) {
    return;
  }

  // Phone is open
  if (phone.isOpen) {
    if (event.code === 'KeyE' || event.code === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();

      phone.close();
      return;
    }

    // Prevent other game keyboard controls
    event.stopImmediatePropagation();
    return;
  }

  // Open phone with E
  if (event.code === 'KeyE') {
    if (dialogue.active) {
      return;
    }

    const selectedItem = inventory.getSelectedItem();

    if (selectedItem === null) {
      return;
    }

    if (selectedItem.id === 'phone') {
      event.preventDefault();
      event.stopImmediatePropagation();

      phone.open();
    }
  }
}


// Capture keyboard events before game listeners
window.addEventListener('keydown', handlePhoneKeys, true);


// Prevent game controls when typing in phone
window.addEventListener('keyup', (event) => {
  if (phone.isOpen) {
    player.keys = {};
    event.stopImmediatePropagation();
  }
}, true);


// Object interactions
const interaction = new Interaction(
  camera,
  scene,
  (data, object) => {
    if (dialogue.active || phone.isOpen) {
      return;
    }

    if (typeof data.onInteract === 'function') {
      data.onInteract(data, object);
      return;
    }

    console.log('Interacted with:', data.id || data.kind);

    if (elevatorLevel.interact(data)) {
      return;
    }

    // Elevator buttons
    if (data.kind === 'elevatorButton') {
      if (data.action === 'floor') {
        if (elevatorLevel.phase !== 'ready') {
          dialogue.show([
            "The elevator isn't responding."
          ], 'ELEVATOR', 'SYSTEM');

          return;
        }

        const button = elevator.controls.buttons[data.id];

        if (data.floor === 2) {
          if (button && button.userData.setLit) {
            button.userData.setLit(true);
          }

          elevatorLevel.start();
        } else {
          dialogue.show([
            "The elevator doesn't respond.",
            "Maybe I should try Floor 2."
          ], 'ELEVATOR', 'SYSTEM');
        }
      }

      if (data.action === 'doorOpen') {
        if (elevatorLevel.phase === 'ready') {
          elevator.openDoors();
        } else {
          dialogue.show([
            "The doors won't open."
          ], 'ELEVATOR', 'SYSTEM');
        }
      }

      if (data.action === 'doorClose') {
        if (elevatorLevel.phase === 'ready') {
          elevator.closeDoors();
        } else {
          dialogue.show(
            ["The doors aren't responding"],
            'ELEVATOR',
            'SYSTEM'
          );
        }
      }

      if (data.action === 'alarm') {
        dialogue.show([
          "You press the alarm button.",
          "A sharp ringing echoes through the elevator.",
          "Somewhere beyond the doors, something shifts."
        ], 'ELEVATOR', 'SYSTEM');
      }

      if (data.action === 'help') {
        dialogue.show([
          "You press the emergency help button.",
          "A burst of static crackles through the speaker.",
          "...",
          "Nobody answers."
        ], 'ELEVATOR', 'SYSTEM');
      }

      if (data.action === 'secretFloor') {
        dialogue.show([
          "There's an unmarked button behind the panel.",
          "Where does this even go?"
        ]);
      }
    }

    // Firefighter panel
    if (data.kind === 'firePanel') {
      elevatorLevel.interact({
        kind: 'elevatorPuzzle',
        id: 'puzzlePanel'
      });
      return;
    }
  }
);


// Lighting
const ambientLight = new THREE.AmbientLight(
  0xffffff,
  0.35
);

scene.add(ambientLight);


const clock = new THREE.Clock();
let phoneTimeUpdate = 0;


// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  // Update game time
  gameClock.update(delta);

  // Update phone clock every second
  phoneTimeUpdate += delta;

  if (phoneTimeUpdate >= 1) {
    phone.updateTime();
    phoneTimeUpdate = 0;
  }

  // Pause movement while UI is open
  if (!dialogue.active && !phone.isOpen) {
    player.updateMovement(delta);
    player.updatePosture(delta);
  }

  // Elevator door animation
  elevator.update(delta);
  elevatorLevel.update(delta);
  floor.update();

  // Check UI state
  let uiOpen = false;

  if (dialogue.active || phone.isOpen) {
    uiOpen = true;
  }

  // Object detection
  let target = null;

  if (!uiOpen) {
    target = interaction.update();
  }

  // Crosshair
  if (uiOpen) {
    crosshair.style.display = 'none';
  } else {
    crosshair.style.display = 'block';
  }

  if (target) {
    crosshair.classList.add('active');
  } else {
    crosshair.classList.remove('active');
  }

  // Interaction prompt
  if (target) {
    const data = target.userData;
    let label = 'Interact';

    if (data.label) {
      label = data.label;
    } else if (data.id) {
      label = data.id;
    }

    interactPrompt.textContent = '';

    const keyLabel = document.createElement('span');
    keyLabel.textContent = 'F';

    interactPrompt.appendChild(keyLabel);
    interactPrompt.appendChild(
      document.createTextNode(' ' + label)
    );

    interactPrompt.style.display = 'block';
  } else {
    interactPrompt.style.display = 'none';
  }

  renderer.render(scene, camera);
}

animate();


// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
});