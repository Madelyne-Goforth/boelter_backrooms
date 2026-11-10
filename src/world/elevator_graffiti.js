import * as THREE from 'three';

export function createElevatorGraffiti(elevator) {
  const group = new THREE.Group();
  group.name = 'elevatorGraffiti';
  group.visible = false;

  const depth = elevator.depth ?? 4;
  const wallZ = -depth / 2;

  // Find the visible back-wall surface in elevator coordinates
  let surfaceZ = wallZ + 0.12;
  let closest = Infinity;
  elevator.interior?.updateMatrixWorld(true);
  elevator.interior?.traverse(obj => {
    if (!obj.isMesh || !obj.geometry) return;
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    if (size.x < 1.2 || size.y < 0.5 || size.z > 0.25 || center.z > 0) return;
    const distance = Math.abs(center.z - wallZ);
    if (distance < closest) {
      closest = distance;
      const point = elevator.group.worldToLocal(new THREE.Vector3(0, 0, box.max.z));
      surfaceZ = point.z + 0.018;
    }
  });

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return [c, c.getContext('2d')];
  }

  function decal(c, w, h, x, y, z, floor = false) {
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: texture, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -4,
        roughness: 0.98, side: THREE.DoubleSide
      })
    );
    mesh.position.set(x, y, z);
    if (floor) mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 15;
    mesh.raycast = () => {};
    group.add(mesh);
    return mesh;
  }

  // Scratched writing
  const [writing, ctx] = canvas(1024, 768);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  function scratch(text, y, size, spacing = 0) {
    ctx.font = `500 ${size}px monospace`;
    const chars = [...text];
    const widths = chars.map(c => ctx.measureText(c).width + spacing);
    let x = (1024 - widths.reduce((a, b) => a + b, 0)) / 2;
    chars.forEach((char, i) => {
      const cx = x + widths[i] / 2;
      const dy = Math.sin(i * 5.3 + y) * 1.5;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(15, 18, 20, 0.8)';
      ctx.strokeText(char, cx + 2, y + dy + 2);
      ctx.fillStyle = 'rgba(205, 207, 201, 0.96)';
      ctx.fillText(char, cx, y + dy);
      x += widths[i];
    });
  }
  scratch("SHOULD'VE TAKEN THE STAIRS", 100, 42);
  ctx.strokeStyle = 'rgba(205, 207, 201, 0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(105, 93); ctx.lineTo(920, 118); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(125, 125); ctx.lineTo(900, 85); ctx.stroke();
  scratch('OPEN = TRUE', 260, 67);
  scratch('CLOSE = FALSE', 365, 67);
  scratch('01 10 11 01', 500, 81, 5);
  scratch('HELP...', 640, 60, 4);
  const writingMesh = decal(writing, 1.48, 0.78, 0, 1.72, surfaceZ + 0.035);

  // Dried blood on the wall
  const [smearCanvas, smear] = canvas(512, 512);
  function blob(c, x, y, rx, ry, alpha) {
    c.save(); c.translate(x, y); c.scale(rx, ry);
    c.fillStyle = `rgba(75, 15, 14, ${alpha})`;
    c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill(); c.restore();
  }
  for (let i = 0; i < 28; i++) {
    const t = i / 27;
    blob(smear, 230 + t * 48 + Math.sin(i * 1.7) * 12,
      90 + t * 290, 10 + i % 4 * 4, 20 + i % 3 * 8,
      0.12 + i % 3 * 0.035);
  }
  decal(smearCanvas, 0.32, 0.42, 0.55, 1.43, surfaceZ + 0.041);

  // Floor stain, raised above the tiles
  const [stainCanvas, stain] = canvas(512, 512);
  stain.save(); stain.translate(256, 256);
  const gradient = stain.createRadialGradient(0, 0, 15, 0, 0, 170);
  gradient.addColorStop(0, 'rgba(49, 12, 12, 0.7)');
  gradient.addColorStop(0.4, 'rgba(62, 17, 16, 0.48)');
  gradient.addColorStop(0.8, 'rgba(60, 15, 14, 0.12)');
  gradient.addColorStop(1, 'rgba(60, 15, 14, 0)');
  stain.fillStyle = gradient;
  stain.beginPath();
  for (let i = 0; i <= 64; i++) {
    const a = i / 64 * Math.PI * 2;
    const r = 135 + Math.sin(a * 5) * 15 + Math.cos(a * 9) * 10;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.65;
    if (!i) stain.moveTo(x, y); else stain.lineTo(x, y);
  }
  stain.closePath(); stain.fill(); stain.restore();
  const floorStain = decal(stainCanvas, 0.55, 0.42,
    0.4, 0.07, wallZ + 0.6, true);

  elevator.group.add(group);
  group.show = () => { group.visible = true; };
  group.hide = () => { group.visible = false; };
  group.writing = writingMesh;
  group.floorStain = floorStain;
  return group;
}
