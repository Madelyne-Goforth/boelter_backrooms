
import * as THREE from 'three';
import './style.css';

import { Elevator } from './world/elevator.js';
import { createElevatorReflectionEnvironment } from './world/elevator_interior.js';
import { Player } from './player/player.js';
import { Inventory } from './systems/inventory.js';
import { Hotbar } from './ui/hotbar.js';
import { Interaction } from './systems/interactions.js';
import { Dialogue } from './ui/dialogue.js';

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

// Dialogue
const dialogue = new Dialogue({
  onOpen: () => {
    player.keys = {};
  },
  onClose: () => {
    player.keys = {};
  }
});

// Object interactions
const interaction = new Interaction(
  camera,
  scene,
  (data, object) => {
    if (dialogue.active) return;

    console.log('Interacted with:', data.id || data.kind);

    // Elevator buttons
    if (data.kind === 'elevatorButton') {
      if (data.action === 'floor') {
        elevator.controls.buttons[data.id]?.userData.setLit?.(true);

        console.log(`Floor ${data.floor} selected`);
      }

      if (data.action === 'doorOpen') {
        elevator.openDoors();
      }

      if (data.action === 'doorClose') {
        elevator.closeDoors();
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
      dialogue.show([
        "A locked firefighter's access panel.",
        "There's a small keyhole.",
        "Probably not something I should mess with.",
        "...Probably."
      ]);
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

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  // Pause movement during dialogue
  if (!dialogue.active) {
    player.updateMovement(delta);
    player.updatePosture(delta);
  }

  elevator.update(delta);

  // Object detection
  const target = dialogue.active
    ? null
    : interaction.update();

  crosshair.style.display = dialogue.active
    ? 'none'
    : 'block';

  crosshair.classList.toggle('active', !!target);

  interactPrompt.style.display = target
    ? 'block'
    : 'none';

  if (target) {
    const data = target.userData;
    const label = data.label || data.id || 'Interact';

    interactPrompt.innerHTML = `<span>F</span> ${label}`;
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
