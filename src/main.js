import * as THREE from 'three';
import './style.css';

import { Elevator } from './world/elevator.js';
import { createElevatorReflectionEnvironment } from './world/elevator_interior.js';
import { ElevatorLevel } from './world/elevator_level.js';
import { ElevatorWorkings } from './world/elevator_workings.js';
import { createElevatorGraffiti } from './world/elevator_graffiti.js';
import { ElevatorWiring } from './world/elevator_wiring.js';

import { Player } from './player/player.js';
import { Inventory } from './systems/inventory.js';
import { Hotbar } from './ui/hotbar.js';
import { Interaction } from './systems/interactions.js';
import { Dialogue } from './ui/dialogue.js';
import { Phone } from './ui/phone.js';

import './ui/phone.css';
import { Floor2 } from './world/floor2.js';
import { LockerLevel } from './world/locker_level.js';


// Scene
const scene = new THREE.Scene();

scene.background = new THREE.Color(0x10141c);
scene.environment = createElevatorReflectionEnvironment();


// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);


// Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

document.querySelector('#app').appendChild(
  renderer.domElement
);


// Crosshair
const crosshair = document.createElement('div');
crosshair.id = 'crosshair';
document.body.appendChild(crosshair);


// Interaction prompt
const interactPrompt = document.createElement('div');
interactPrompt.id = 'interact-prompt';

document.body.appendChild(interactPrompt);


// Elevator
const elevator = new Elevator();
scene.add(elevator.group);

const graffiti = createElevatorGraffiti(elevator);


// Player
const player = new Player(
  camera,
  renderer.domElement,
  elevator
);

camera.position.set(
  player.position?.x ?? 0,
  player.groundY + player.eyeHeight,
  player.position?.z ?? 0
);


// Inventory and HUD
const inventory = new Inventory();
const hotbar = new Hotbar(inventory);

hotbar.render();

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


// Floor Two 
const floor = new Floor2({ elevator, dialogue, player, inventory });
scene.add(floor.group);

// Locker puzzle
const lockerLevel = new LockerLevel({
  scene,
  dialogue,
  onInputChange: () => {
    player.keys = {};
  }
});

//show the lockers immediately.
lockerLevel.start();

// Combine hallway and locker collision boundaries.
player.setColliders([
  ...floor.colliders,
  ...lockerLevel.colliders
]);


// In-game clock
class GameClock {
  constructor() {
    this.time = new Date(
      2026, 10, 7, 21, 41, 0
    ).getTime();

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


// Existing elevator puzzle
const elevatorLevel = new ElevatorLevel({
  elevator,
  inventory,
  dialogue,

  onInventoryChange: () => {
    hotbar.render();
  },
  onEscape: () => lockerLevel.start()
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


// Lighting
const ambientLight = new THREE.AmbientLight(
  0xffffff,
  0.35
);

scene.add(ambientLight);


// Elevator workings
const elevatorWorkings = new ElevatorWorkings({
  scene,
  elevator,
  elevatorLevel,
  player,
  camera,
  phone,
  dialogue,
  ambientLight
});


// Wiring puzzle
const wiring = new ElevatorWiring(() => {
  elevatorWorkings.completeWiring();
});

elevatorWorkings.wiringPuzzle = wiring;
elevatorWorkings.graffiti = graffiti;


// Check whether the player is typing
function isTyping(event) {
  const element = event.target;

  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.isContentEditable
  );
}


// Phone keyboard controls
function handlePhoneKeys(event) {
  if (isTyping(event) || event.repeat) {
    return;
  }

  // Phone is open
  if (phone.isOpen) {
    if (
      event.code === 'KeyE' ||
      event.code === 'Escape'
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      phone.close();
      return;
    }

    // Prevent game controls while phone is open
    event.stopImmediatePropagation();
    return;
  }

  // Wiring puzzle is open
  if (elevatorWorkings.wiringOpen) {
    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();

      elevatorWorkings.closeWiring();
      return;
    }

    event.stopImmediatePropagation();
    return;
  }

  // Open phone with E
  if (event.code === 'KeyE') {
    if (dialogue.active) {
      return;
    }

    const selectedItem = inventory.getSelectedItem();

    if (!selectedItem || selectedItem.id !== 'phone') {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    phone.open();
  }
}

window.addEventListener(
  'keydown',
  handlePhoneKeys,
  true
);


// Prevent game controls while phone is open
window.addEventListener('keyup', (event) => {
  if (phone.isOpen || elevatorWorkings.wiringOpen) {
    player.keys = {};
    event.stopImmediatePropagation();
  }
}, true);


// Object interactions
const interaction = new Interaction(
  camera,
  scene,

  (data, object) => {
    if (
      dialogue.active ||
      phone.isOpen ||
      elevatorWorkings.wiringOpen
    ) {
      return;
    }

    console.log('Interacted with:', data.id || data.kind);

    // Objects that carry their own behavior (Floor 2 doors, lab props)
    if (typeof data.onInteract === 'function') {
      data.onInteract(data, object);
      return;
    }

    // Existing elevator items
    if (data.kind === 'elevatorPuzzle') {
      elevatorLevel.interact(data);
      return;
    }

    // Firefighter access panel
    if (data.kind === 'firePanel') {
      if (elevatorLevel.panelUnlocked) {
        elevatorWorkings.openWiring();
        return;
      }

      elevatorLevel.interact({
        kind: 'elevatorPuzzle',
        id: 'puzzlePanel'
      });
      return;
    }

    // Lockers
    if (lockerLevel.interact(data)) {
      return;
    }
    // Elevator buttons
    if (data.kind === 'elevatorButton') {
      // Hidden button inside firefighter panel
      if (data.action === 'secretFloor') {
        if (elevatorLevel.panelUnlocked) {
          elevatorWorkings.openWiring();
        }

        return;
      }

      // Main elevator workings handles floor travel
      // and the binary override puzzle
      if (elevatorWorkings.handleButton(data)) {
        return;
      }

      // Normal door controls before malfunction
      if (data.action === 'doorOpen') {
        if (elevatorWorkings.phase === 'ready') {
          elevator.openDoors();
        }

        return;
      }

      if (data.action === 'doorClose') {
        if (elevatorWorkings.phase === 'ready') {
          elevator.closeDoors();
        }

        return;
      }

      // Alarm
      if (data.action === 'alarm') {
        dialogue.show([
          'You press the alarm button.',
          'A sharp ringing echoes through the elevator.',
          'Somewhere beyond the doors, something shifts.'
        ], 'ELEVATOR', 'SYSTEM');

        return;
      }

      // Help
      if (data.action === 'help') {
        dialogue.show([
          'You press the emergency help button.',
          'A burst of static crackles through the speaker.',
          '...',
          'Nobody answers.'
        ], 'ELEVATOR', 'SYSTEM');

        return;
      }
    }
  }
);


// Animation
const clock = new THREE.Clock();

let phoneTimeUpdate = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(
    clock.getDelta(),
    0.05
  );

  // Game time
  gameClock.update(delta);

  phoneTimeUpdate += delta;

  if (phoneTimeUpdate >= 1) {
    phone.updateTime();
    phoneTimeUpdate = 0;
  }

  // UI state
  const uiOpen =
    dialogue.active ||
    phone.isOpen ||
    elevatorWorkings.wiringOpen;

  // Player movement
  if (!uiOpen) {
    player.updateMovement(delta);
    player.updatePosture(delta);
  } else {
    player.keys = {};
  }

  // Elevator animations
  elevator.update(delta);

  // Existing item puzzle
  elevatorLevel.update(delta);
  floor.update(delta);
  // Update locker level
  lockerLevel.update(delta);

  // Elevator shaft, travel and malfunction
  elevatorWorkings.update(delta);

  // Interaction detection
  let target = null;

  if (!uiOpen) {
    target = interaction.update();
  }

  // Crosshair
  crosshair.style.display = uiOpen
    ? 'none'
    : 'block';

  crosshair.classList.toggle(
    'active',
    Boolean(target)
  );

  // Interaction prompt
  if (target) {
    const data = target.userData;

    const label =
      data.label ||
      data.id ||
      'Interact';

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
  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
});