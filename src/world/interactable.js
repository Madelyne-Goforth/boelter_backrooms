export function makeInteractable(object3d, data = {}) {
  object3d.traverse((child) => {
    if (child.isMesh) {
      child.userData = { ...child.userData, interactable: true, ...data };
    }
  });
  return object3d;
}