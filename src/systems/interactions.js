
import * as THREE from 'three';

export class Interaction {
  constructor(camera, scene, onInteract, maxDistance = 2.5) {
    this.camera = camera;
    this.scene = scene;
    this.onInteract = onInteract;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = maxDistance;

    this.center = new THREE.Vector2(0, 0);
    this.target = null;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  getTarget() {
    // Shoot a ray through the center of the camera
    this.raycaster.setFromCamera(this.center, this.camera);

    const hits = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );

    for (const hit of hits) {
      const object = hit.object;

      // Skip anything hidden
      let current = object;
      let visible = true;

      while (current) {
        if (!current.visible) {
          visible = false;
          break;
        }
        current = current.parent;
      }

      if (!visible) continue;

      // Disabled objects don't block interaction
      if (object.userData.interactable === false) continue;

      if (object.userData.interactable === true) {
        return object;
      }

      // Solid objects block the ray
      return null;
    }

    return null;
  }

  update() {
    this.target = this.getTarget();
    return this.target;
  }

  handleKeyDown(event) {
    if (event.code !== 'KeyF' || event.repeat) return;

    // Don't interact while typing (duhhhhh)
    const active = document.activeElement;
    if (
      active?.tagName === 'INPUT' ||
      active?.tagName === 'TEXTAREA' ||
      active?.isContentEditable
    ) return;

    const target = this.getTarget();
    if (!target) return;

    this.onInteract?.(target.userData, target);
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}
