
import * as THREE from 'three';
import './style.css';
import { Elevator } from './world/elevator.js';
import { createElevatorReflectionEnvironment } from './world/elevator_interior.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

// Ambient fill light (NEW)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

// Temporary modeling camera
camera.position.set(0, 1.7, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.7, 1); // FIX: Look toward doors (+Z)
controls.update();

// Debugging helpers
scene.add(new THREE.AxesHelper(2));
scene.add(new THREE.GridHelper(10, 10));

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}

animate();
