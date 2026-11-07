
import * as THREE from 'three';

// Textures

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

// Blue, grey, black wall texture
function createSpeckledTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#292d34';
  ctx.fillRect(0, 0, 512, 512);

  const colors = [
    '#11151b',
    '#1b222c',
    '#344557',
    '#43556a',
    '#535960',
    '#666c73',
    '#24282d'
  ];

  for (let i = 0; i < 42000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 0.3 + Math.random() * 1.3;

    ctx.globalAlpha = 0.3 + Math.random() * 0.5;
    ctx.fillStyle = colors[
      Math.floor(Math.random() * colors.length)
    ];

    ctx.fillRect(x, y, size, size);
  }

  ctx.globalAlpha = 1;

  const texture = canvasTexture(canvas);
  texture.repeat.set(2, 2);
  return texture;
}

// Brushed metal texture
function createBrushedMetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#a9afb4';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y++) {
    const brightness = 125 + Math.random() * 100;

    ctx.fillStyle =
      `rgba(${brightness},${brightness},${brightness},0.16)`;

    ctx.fillRect(0, y, 512, 1);
  }

  const gradient = ctx.createLinearGradient(0, 0, 512, 0);
  gradient.addColorStop(0, 'rgba(0,0,0,0.13)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.08)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.02)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.1)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = canvasTexture(canvas);
  texture.repeat.set(2, 2);
  return texture;
}

// School floor tiles
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#777b7c';
  ctx.fillRect(0, 0, 512, 512);

  const flecks = [
    '#525759',
    '#626769',
    '#8c9090',
    '#9c9f9e',
    '#afb0ab'
  ];

  for (let i = 0; i < 28000; i++) {
    ctx.globalAlpha = 0.15 + Math.random() * 0.35;
    ctx.fillStyle = flecks[
      Math.floor(Math.random() * flecks.length)
    ];

    ctx.fillRect(
      Math.random() * 512,
      Math.random() * 512,
      0.5 + Math.random() * 3,
      0.5 + Math.random() * 2
    );
  }

  ctx.globalAlpha = 1;

  // Dirt and scuffs
  for (let i = 0; i < 6500; i++) {
    let x = Math.random() * 512;
    let y = Math.random() * 512;

    // More dirt near the edges
    if (Math.random() < 0.65) {
      const edge = Math.floor(Math.random() * 4);

      if (edge === 0) x = Math.random() * 55;
      if (edge === 1) x = 512 - Math.random() * 55;
      if (edge === 2) y = Math.random() * 55;
      if (edge === 3) y = 512 - Math.random() * 55;
    }

    // Extra dirt in the corners
    if (Math.random() < 0.25) {
      x = Math.random() < 0.5
        ? Math.random() * 65
        : 512 - Math.random() * 65;

      y = Math.random() < 0.5
        ? Math.random() * 65
        : 512 - Math.random() * 65;
    }

    ctx.fillStyle = Math.random() < 0.8
      ? 'rgba(32,31,29,0.09)'
      : 'rgba(205,202,193,0.09)';

    ctx.beginPath();
    ctx.ellipse(
      x, y,
      0.5 + Math.random() * 4,
      0.5 + Math.random() * 2,
      Math.random() * Math.PI,
      0, Math.PI * 2
    );
    ctx.fill();
  }

  // Square tile pattern
  ctx.strokeStyle = 'rgba(36,39,41,0.35)';
  ctx.lineWidth = 2;

  for (let i = 1; i < 5; i++) {
    const p = i * 512 / 5;

    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  const texture = canvasTexture(canvas);
  texture.repeat.set(1, 1);
  return texture;
}

// Lines in the ceiling lights

function createDiffuserTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dce2e5';
  ctx.fillRect(0, 0, 256, 512);

  // Lines across the lights
  for (let y = 0; y < 512; y += 11) {
    ctx.fillStyle = 'rgba(65,75,85,0.25)';
    ctx.fillRect(0, y, 256, 2);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, y + 3, 256, 2);
  }

  // Dark section of the light
  const shade = ctx.createLinearGradient(0, 0, 0, 512);
  shade.addColorStop(0, 'rgba(15,19,23,0.95)');
  shade.addColorStop(0.38, 'rgba(20,24,29,0.92)');
  shade.addColorStop(0.48, 'rgba(30,35,40,0.65)');
  shade.addColorStop(0.58, 'rgba(30,35,40,0.05)');
  shade.addColorStop(1, 'rgba(30,35,40,0)');

  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 256, 512);

  return canvasTexture(canvas);
}

// Fake reflections for metal
export function createElevatorReflectionEnvironment() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  const background = ctx.createLinearGradient(0, 0, 0, 512);

  background.addColorStop(0, '#b5bec7');
  background.addColorStop(0.35, '#626c77');
  background.addColorStop(0.65, '#303943');
  background.addColorStop(1, '#171e26');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1024, 512);

  const strips = [
    [90, 85],
    [365, 120],
    [745, 90]
  ];

  for (const [x, width] of strips) {
    const gradient = ctx.createLinearGradient(
      x, 0, x + width, 0
    );

    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, 20, width, 400);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

// Elevator interior
export function createElevatorInterior(elevator) {
  const group = new THREE.Group();

  const { width, height, depth, thickness } = elevator;

  const innerWidth = width - 2 * thickness;
  const innerDepth = depth - 2 * thickness;

  const lowerHeight = 1.1;
  const panelThickness = 0.025;

  const backSurface = -depth / 2 + thickness;
  const leftSurface = -width / 2 + thickness;
  const rightSurface = width / 2 - thickness;
  const frontSurface = depth / 2 - thickness;

  // Materials
  const speckled = new THREE.MeshStandardMaterial({
    map: createSpeckledTexture(),
    roughness: 0.92,
    metalness: 0.02
  });

  const steel = new THREE.MeshStandardMaterial({
    map: createBrushedMetalTexture(),
    color: 0xd3d6d9,
    metalness: 0.72,
    roughness: 0.3,
    envMapIntensity: 0.85
  });

  const frontSteel = new THREE.MeshStandardMaterial({
    color: 0x858b91,
    metalness: 0.82,
    roughness: 0.29,
    envMapIntensity: 0.75
  });

  const trim = new THREE.MeshStandardMaterial({
    color: 0xa9afb6,
    metalness: 0.78,
    roughness: 0.3,
    envMapIntensity: 0.7
  });

  // Dark metal between wall panels
    const revealMaterial = new THREE.MeshStandardMaterial({
        color: 0x343b43,
        metalness: 0.85,
        roughness: 0.48,
        envMapIntensity: 0.7
    });

  const baseboardMaterial = new THREE.MeshStandardMaterial({
    color: 0x747b82,
    metalness: 0.65,
    roughness: 0.42,
    envMapIntensity: 0.55
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: createFloorTexture(),
    roughness: 0.84,
    metalness: 0.02
  });

  function addBox(w, h, d, material, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material
    );

    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }

  // Floor
  addBox(
    innerWidth, 0.012, innerDepth,
    floorMaterial,
    0, 0.006, 0
  );

  // Back and side walls
  const revealHeight = 0.075;
  const upperBottom = lowerHeight + revealHeight;
  const upperTop = height - 0.08;
  const upperHeight = upperTop - upperBottom;
  const panelGap = 0.055;

  const backZ = backSurface + panelThickness / 2 + 0.006;

  // Dark gaps behind panels
  addBox(
    innerWidth, height - 0.04, 0.008,
    revealMaterial,
    0, height / 2, backSurface + 0.008
  );

  // Lower back wall
  addBox(
    innerWidth - 0.04,
    lowerHeight - 0.1,
    panelThickness,
    steel,
    0,
    (lowerHeight - 0.1) / 2 + 0.09,
    backZ
  );

  // Three upper back panels
  const backPanelWidth = (innerWidth - 4 * panelGap) / 3;

  for (let i = 0; i < 3; i++) {
    const x =
      -innerWidth / 2 +
      panelGap +
      backPanelWidth / 2 +
      i * (backPanelWidth + panelGap);

    addBox(
      backPanelWidth,
      upperHeight,
      panelThickness,
      speckled,
      x,
      upperBottom + upperHeight / 2,
      backZ
    );
  }

  // Side wall panels
  function createSidePanels(isLeft) {
    const sign = isLeft ? 1 : -1;
    const surface = isLeft ? leftSurface : rightSurface;

    const panelX =
      surface + sign * (panelThickness / 2 + 0.006);

    // Dark gaps
    addBox(
      0.008,
      height - 0.04,
      innerDepth,
      revealMaterial,
      surface + sign * 0.008,
      height / 2,
      0
    );

    // Lower metal
    addBox(
      panelThickness,
      lowerHeight - 0.1,
      innerDepth - 0.04,
      steel,
      panelX,
      (lowerHeight - 0.1) / 2 + 0.09,
      0
    );

    // Three upper panels
    const sidePanelDepth = (innerDepth - 4 * panelGap) / 3;

    for (let i = 0; i < 3; i++) {
      const z =
        -innerDepth / 2 +
        panelGap +
        sidePanelDepth / 2 +
        i * (sidePanelDepth + panelGap);

      addBox(
        panelThickness,
        upperHeight,
        sidePanelDepth,
        speckled,
        panelX,
        upperBottom + upperHeight / 2,
        z
      );
    }
  }

  createSidePanels(true);
  createSidePanels(false);

  // Baseboards
  addBox(
    innerWidth, 0.09, 0.05,
    baseboardMaterial,
    0, 0.045, backZ + 0.025
  );

  addBox(
    0.05, 0.09, innerDepth,
    baseboardMaterial,
    leftSurface + 0.04, 0.045, 0
  );

  addBox(
    0.05, 0.09, innerDepth,
    baseboardMaterial,
    rightSurface - 0.04, 0.045, 0
  );

  // Back wall bar
  const barHeight = 0.095;
  const barDepth = 0.085;
  const barY = 1.0;

  const barMaterial = new THREE.MeshStandardMaterial({
    color: 0xbfc5ca,
    metalness: 0.82,
    roughness: 0.27,
    envMapIntensity: 0.85
  });

  // Dark gap behind bar
  addBox(
    innerWidth - 0.22,
    barHeight + 0.04,
    0.025,
    revealMaterial,
    0, barY, backZ + 0.035
  );

  addBox(
    innerWidth - 0.26,
    barHeight,
    barDepth,
    barMaterial,
    0, barY, backZ + 0.09
  );

  // Front wall
  const frontZ = frontSurface - 0.02;
  const sideWidth = (width - elevator.doorWidth) / 2;
  const headerHeight = height - elevator.doorHeight;
  const frontSideWidth = sideWidth - thickness;

  // Metal around doors
  addBox(
    frontSideWidth,
    elevator.doorHeight,
    0.025,
    frontSteel,
    -(elevator.doorWidth + sideWidth) / 2,
    elevator.doorHeight / 2,
    frontZ
  );

  addBox(
    frontSideWidth,
    elevator.doorHeight,
    0.025,
    frontSteel,
    (elevator.doorWidth + sideWidth) / 2,
    elevator.doorHeight / 2,
    frontZ
  );

  addBox(
    innerWidth,
    headerHeight,
    0.025,
    frontSteel,
    0,
    elevator.doorHeight + headerHeight / 2,
    frontZ
  );

  // Door frame
  const frameWidth = 0.065;

  addBox(
    frameWidth,
    elevator.doorHeight,
    0.045,
    trim,
    -elevator.doorWidth / 2 - frameWidth / 2,
    elevator.doorHeight / 2,
    frontZ - 0.035
  );

  addBox(
    frameWidth,
    elevator.doorHeight,
    0.045,
    trim,
    elevator.doorWidth / 2 + frameWidth / 2,
    elevator.doorHeight / 2,
    frontZ - 0.035
  );

  addBox(
    elevator.doorWidth + 2 * frameWidth,
    frameWidth,
    0.045,
    trim,
    0,
    elevator.doorHeight + frameWidth / 2,
    frontZ - 0.035
  );

  // Ceiling lights
  const ceilingFrame = new THREE.MeshStandardMaterial({
    color: 0xc3c8cd,
    metalness: 0.85,
    roughness: 0.22,
    envMapIntensity: 1.0
  });

  
const diffuserTexture = createDiffuserTexture();

const diffuser = new THREE.MeshStandardMaterial({
  map: diffuserTexture,
  emissiveMap: diffuserTexture,
  emissive: 0xcbd8e2,
  emissiveIntensity: 0.45,
  roughness: 0.8,
  metalness: 0,
  side: THREE.DoubleSide
});

  const ceilingY = height - 0.035;
  const crossWidth = 0.16;
  const perimeter = 0.09;

  // Metal around the edges
  addBox(
    innerWidth, 0.04, perimeter,
    ceilingFrame,
    0, ceilingY,
    -innerDepth / 2 + perimeter / 2
  );

  addBox(
    innerWidth, 0.04, perimeter,
    ceilingFrame,
    0, ceilingY,
    innerDepth / 2 - perimeter / 2
  );

  addBox(
    perimeter, 0.04, innerDepth,
    ceilingFrame,
    -innerWidth / 2 + perimeter / 2,
    ceilingY, 0
  );

  addBox(
    perimeter, 0.04, innerDepth,
    ceilingFrame,
    innerWidth / 2 - perimeter / 2,
    ceilingY, 0
  );

  // Metal cross
  addBox(
    crossWidth, 0.05, innerDepth,
    ceilingFrame,
    0, ceilingY - 0.01, 0
  );

  addBox(
    innerWidth, 0.05, crossWidth,
    ceilingFrame,
    0, ceilingY - 0.01, 0
  );

  // Four light panels
  const lightPanelWidth =
    (innerWidth - 2 * perimeter - crossWidth) / 2;

  const lightPanelDepth =
    (innerDepth - 2 * perimeter - crossWidth) / 2;

  const panelX = crossWidth / 2 + lightPanelWidth / 2;
  const panelZ = crossWidth / 2 + lightPanelDepth / 2;

  for (const x of [-panelX, panelX]) {
    for (const z of [-panelZ, panelZ]) {
      const lightPanel = addBox(
        lightPanelWidth,
        0.025,
        lightPanelDepth,
        diffuser,
        x, ceilingY, z
      );

      // Dark ends face the front and back walls
      if (z < 0) {
        lightPanel.rotation.y = Math.PI;
      }
    }
  }

  // Lighting

// Lighting
    for (const x of [-panelX, panelX]) {
    for (const z of [-panelZ, panelZ]) {
        const light = new THREE.PointLight(
        0xe1e7ed,
        5.5,
        5,
        2
        );

        // Light comes from the working half
        light.position.set(
        x,
        height - 0.35,
        z < 0 ? z + 0.35 : z - 0.35
        );

        group.add(light);
    }
    }


  return group;
}
