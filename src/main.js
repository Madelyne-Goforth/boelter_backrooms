
import * as THREE from 'three';
import './style.css';
import { Elevator } from './world/elevator.js';
import { createElevatorReflectionEnvironment } from './world/elevator_interior.js';
import { Player } from './player/player.js';

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

// Elevator
const elevator = new Elevator();
scene.add(elevator.group);

// Player/Player view
const player = new Player(camera, renderer.domElement, elevator);

camera.position.set(
  player.position.x,
  player.groundY + player.eyeHeight,
  player.position.z
);

// Ambient fill light (NEW)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

// Debugging helpers
scene.add(new THREE.AxesHelper(2));
scene.add(new THREE.GridHelper(10, 10));

const clock = new THREE.Clock();

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  player.updateMovement(delta);

  renderer.render(scene, camera);
}

animate();
