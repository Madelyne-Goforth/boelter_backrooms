
import * as THREE from 'three';
import './style.css';
import { Elevator } from './world/elevator.js';
import { createElevatorReflectionEnvironment } from './world/elevator_interior.js';
import { Player } from './player/player.js';
import { Inventory } from './systems/inventory.js';
import { Hotbar } from './ui/hotbar.js';
import { Interaction } from './systems/interactions.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Reflection environment (NEW)
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

// Metallic lighting / exposure (NEW)
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

// Player/Player view
const player = new Player(camera, renderer.domElement, elevator);

// Inventory and HUD
const inventory = new Inventory();
const hotbar = new Hotbar(inventory);
hotbar.render();

hotbar.render();

// Object interactions
const interaction = new Interaction(camera, scene, (data, object) => {
  console.log('Interacted with:', data.id || data.kind);

  if (data.kind === 'elevatorButton') {
    if (data.action === 'floor') {
      elevator.controls.buttons[data.id]?.userData.setLit?.(true);
      console.log(`Floor ${data.floor} selected`);
    }

    if (data.action === 'doorOpen') {
      console.log('Open doors');
    }

    if (data.action === 'doorClose') {
      console.log('Close doors');
    }

    if (data.action === 'alarm') {
      console.log('Alarm pressed');
    }

    if (data.action === 'help') {
      console.log('Help pressed');
    }
  }

  if (data.kind === 'firePanel') {
    console.log('Firefighter panel inspected');
  }
});

// Camera Pos
camera.position.set(
  player.position.x,
  player.groundY + player.eyeHeight,
  player.position.z
);

// Ambient fill light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const clock = new THREE.Clock();

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  player.updateMovement(delta);
  player.updatePosture(delta);

  // Check what the player is looking at
  const target = interaction.update();

  crosshair.classList.toggle('active', !!target);
  interactPrompt.style.display = target ? 'block' : 'none';

  if (target) {
    const data = target.userData;

    // Show the object's label
    const label = data.label || data.id || 'Interact';
    interactPrompt.innerHTML = `<span>F</span> ${label}`;
  }


  renderer.render(scene, camera);
}

animate();
