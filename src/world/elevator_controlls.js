
import * as THREE from 'three';

export function createElevatorControls(elevator) {
  const group = new THREE.Group();
  const buttons = {};

  const panelWidth = 0.66;
  const panelHeight = 2.9;
  const panelDepth = 0.025;

  const steel = new THREE.MeshStandardMaterial({
    color: 0xaeb5bb,
    metalness: 0.82,
    roughness: 0.32,
    envMapIntensity: 0.9
  });

  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x525a61,
    metalness: 0.72,
    roughness: 0.4
  });

  const black = new THREE.MeshStandardMaterial({
    color: 0x101317,
    roughness: 0.7
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xd1d7dc,
    metalness: 0.95,
    roughness: 0.2,
    envMapIntensity: 1
  });

  function addBox(w, h, d, material, x, y, z, parent = group) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material
    );

    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  // Text labels
  function createLabel(text, width, height, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);

    ctx.fillStyle = options.color || '#ffffff';
    ctx.font = `bold ${options.fontSize || 240}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 256, 480);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      material
    );

    mesh.rotation.y = Math.PI;
    return mesh;
  }

  function addLabel(
    text, w, h, x, y, z,
    options = {},
    parent = group
  ) {
    const mesh = createLabel(text, w, h, options);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  // Main panel
  addBox(
    panelWidth, panelHeight, panelDepth,
    steel, 0, 1.72, 0
  );

  // Metal edges
  for (const x of [-panelWidth / 2, panelWidth / 2]) {
    addBox(
      0.012, panelHeight, 0.035,
      darkSteel, x, 1.72, -0.008
    );
  }

  // Floor display
  const screenY = 2.83;

  addBox(
    0.53, 0.32, 0.014,
    darkSteel, 0, screenY, -0.023
  );

  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512;
  screenCanvas.height = 256;

  const screenCtx = screenCanvas.getContext('2d');
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = 8;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.49, 0.28),
    new THREE.MeshBasicMaterial({
      map: screenTexture,
      toneMapped: false,
      side: THREE.DoubleSide
    })
  );

  screen.position.set(0, screenY, -0.034);
  screen.rotation.y = Math.PI;
  group.add(screen);

  function setFloor(floor, direction = 'idle') {
    const ctx = screenCtx;
    const w = screenCanvas.width;
    const h = screenCanvas.height;

    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#101725');
    gradient.addColorStop(0.55, '#29364c');
    gradient.addColorStop(1, '#765d72');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Background hills
    ctx.fillStyle = '#35435a';
    ctx.beginPath();
    ctx.moveTo(0, 185);
    ctx.lineTo(95, 130);
    ctx.lineTo(170, 165);
    ctx.lineTo(280, 95);
    ctx.lineTo(390, 165);
    ctx.lineTo(512, 115);
    ctx.lineTo(512, 256);
    ctx.lineTo(0, 256);
    ctx.fill();

    ctx.fillStyle = '#192536';
    ctx.beginPath();
    ctx.moveTo(0, 205);
    ctx.lineTo(140, 185);
    ctx.lineTo(300, 225);
    ctx.lineTo(512, 175);
    ctx.lineTo(512, 256);
    ctx.lineTo(0, 256);
    ctx.fill();

    // Floor number
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(0, 0, 145, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 130px Arial';
    ctx.fillText(String(floor), 72, 174);

    let arrow = '–';
    if (direction === 'up') arrow = '▲';
    if (direction === 'down') arrow = '▼';

    ctx.fillStyle = '#8bd49a';
    ctx.font = 'bold 65px Arial';
    ctx.fillText(arrow, 72, 60);

    screenTexture.needsUpdate = true;
  }

  setFloor(2, 'idle');

  // No smoking sign
  addLabel(
    'NO SMOKING',
    0.40, 0.12,
    0, 3.12, -0.019,
    { color: '#20252a', fontSize: 165 }
  );

  // Inspection certificate
  const paper = new THREE.MeshStandardMaterial({
    color: 0xe5e5df,
    roughness: 0.9
  });

  addBox(
    0.43, 0.18, 0.008,
    paper, 0, 2.48, -0.021
  );

  addLabel(
    'ELEVATOR INSPECTION',
    0.39, 0.065,
    0, 2.515, -0.029,
    { color: '#242424', fontSize: 110 }
  );

  // Firefighter compartment
  const firePanel = {
    locked: true,
    open: false,
    keyRequired: 'serviceKey'
  };

  const fireY = 2.15;

  // Dark compartment behind door
  addBox(
    0.44, 0.31, 0.012,
    black, 0, fireY, -0.021
  );

  // Hidden service button
  const secretButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.043, 0.043, 0.016, 32),
    chrome
  );

  secretButton.rotation.x = Math.PI / 2;
  secretButton.position.set(0, fireY + 0.02, -0.027);

  secretButton.userData = {
    interactable: false,
    kind: 'elevatorButton',
    id: 'secretFloor',
    action: 'secretFloor',
    label: '?'
  };

  group.add(secretButton);
  buttons.secretFloor = secretButton;

  // Hinged firefighter door
  const hinge = new THREE.Group();
  hinge.position.set(-0.22, fireY, -0.045);
  group.add(hinge);

  const fireDoor = addBox(
    0.44, 0.31, 0.012,
    steel, 0.22, 0, 0, hinge
  );

  addLabel(
    'FIREFIGHTERS',
    0.36, 0.055,
    0.22, 0.105, -0.009,
    { color: '#b3262d', fontSize: 145 },
    hinge
  );

  addLabel(
    'OPERATION',
    0.32, 0.055,
    0.22, 0.055, -0.009,
    { color: '#b3262d', fontSize: 145 },
    hinge
  );

  // Keyhole
  const keyRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.007, 24),
    chrome
  );

  keyRing.rotation.x = Math.PI / 2;
  keyRing.position.set(0.39, -0.065, -0.011);
  hinge.add(keyRing);

  const keyCenter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.009, 24),
    black
  );

  keyCenter.rotation.x = Math.PI / 2;
  keyCenter.position.set(0.39, -0.065, -0.018);
  hinge.add(keyCenter);

  addBox(
    0.004, 0.018, 0.002,
    steel, 0.39, -0.065, -0.024, hinge
  );

  // Firefighter panel interaction
  const firePanelData = {
    interactable: true,
    kind: 'firePanel',
    action: 'inspectFirePanel'
  };

  hinge.traverse((object) => {
    if (object.isMesh) {
      object.userData = { ...firePanelData };
    }
  });

  function openFirePanel() {
    if (firePanel.open) return;

    firePanel.open = true;
    hinge.rotation.y = -Math.PI * 0.7;
    secretButton.userData.interactable = true;
  }

  function closeFirePanel() {
    if (!firePanel.open) return;

    firePanel.open = false;
    hinge.rotation.y = 0;
    secretButton.userData.interactable = false;
  }

  // Circular speaker
  function createRoundSpeaker(y) {
    const speaker = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.075, 0.085, 32),
      darkSteel
    );

    ring.rotation.y = Math.PI;
    speaker.add(ring);

    const center = new THREE.Mesh(
      new THREE.CircleGeometry(0.073, 32),
      black
    );

    center.rotation.y = Math.PI;
    center.position.z = -0.001;
    speaker.add(center);

    // Grille slots
    for (let i = -2; i <= 2; i++) {
      const yOffset = i * 0.023;

      const halfWidth = Math.sqrt(
        0.065 * 0.065 - yOffset * yOffset
      );

      const slit = new THREE.Mesh(
        new THREE.PlaneGeometry(halfWidth * 2, 0.007),
        darkSteel
      );

      slit.rotation.y = Math.PI;
      slit.position.set(0, yOffset, -0.003);
      speaker.add(slit);
    }

    speaker.position.set(0, y, -0.025);
    group.add(speaker);
  }

  createRoundSpeaker(1.79);

  // Lower speaker
  addBox(
    0.38, 0.22, 0.008,
    steel, 0, 0.54, -0.02
  );

  for (let i = 0; i < 6; i++) {
    addBox(
      0.25, 0.007, 0.003,
      darkSteel,
      0, 0.48 + i * 0.024, -0.029
    );
  }

  // Rounded button backing
  function createButtonBacking(x, y) {
    const shape = new THREE.Shape();

    const w = 0.215;
    const h = 0.135;
    const r = h / 2;

    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);

    shape.absarc(
      w / 2 - r, 0, r,
      -Math.PI / 2, Math.PI / 2, false
    );

    shape.lineTo(-w / 2 + r, h / 2);

    shape.absarc(
      -w / 2 + r, 0, r,
      Math.PI / 2, Math.PI * 1.5, false
    );

    const backing = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      black
    );

    backing.rotation.y = Math.PI;
    backing.position.set(x, y, -0.032);
    group.add(backing);

    return backing;
  }

  // Buttons
  function createButton(id, label, x, y, metadata) {
    const buttonX = x - 0.052;
    const labelX = x + 0.052;

    const backing = createButtonBacking(x, y);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.059, 0.059, 0.024, 32),
      chrome
    );

    rim.rotation.x = Math.PI / 2;
    rim.position.set(buttonX, y, -0.044);
    group.add(rim);

    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(0.041, 0.041, 0.004, 32),
      darkSteel
    );

    face.rotation.x = Math.PI / 2;
    face.position.set(buttonX, y, -0.059);
    group.add(face);

    // Center indicator light
    const light = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 24),
      new THREE.MeshBasicMaterial({
        color: 0x555555,
        toneMapped: false,
        side: THREE.DoubleSide
      })
    );

    light.rotation.y = Math.PI;
    light.position.set(buttonX, y, -0.063);
    group.add(light);

    // Button label
    const text = createLabel(
      label,
      0.095, 0.095,
      {
        color: '#ffffff',
        fontSize: label.length > 3 ? 115 : 245
      }
    );

    text.position.set(labelX, y, -0.038);
    group.add(text);

    const data = {
      interactable: true,
      kind: 'elevatorButton',
      id,
      label,
      ...metadata
    };

    backing.userData = { ...data };
    rim.userData = { ...data };
    face.userData = { ...data };
    text.userData = { ...data };
    light.userData = { ...data };

    face.userData.setLit = (lit) => {
      light.material.color.set(
        lit ? 0xffffff : 0x555555
      );
    };

    buttons[id] = face;
    return face;
  }

  const leftX = 0.145;
  const rightX = -0.145;
  const startY = 1.61;
  const rowSpacing = 0.16;

  // Floor and control buttons
  const rows = [
    ['floor8', '8', 'floor9', '9'],
    ['floor6', '6', 'floor7', '7'],
    ['floor4', '4', 'floor5', '5'],
    ['floor2', '2', 'floor3', '3'],
    ['doorOpen', '◀▶', 'doorClose', '▶◀'],
    ['alarm', '▲', 'help', 'HELP']
  ];

  function getMetadata(id) {
    if (id.startsWith('floor')) {
      return {
        action: 'floor',
        floor: Number(id.replace('floor', ''))
      };
    }

    if (id === 'doorOpen') return { action: 'doorOpen' };
    if (id === 'doorClose') return { action: 'doorClose' };
    if (id === 'alarm') return { action: 'alarm' };

    return { action: 'help' };
  }

  rows.forEach((row, index) => {
    const y = startY - index * rowSpacing;
    const [leftId, leftLabel, rightId, rightLabel] = row;

    createButton(
      leftId, leftLabel,
      leftX, y, getMetadata(leftId)
    );

    createButton(
      rightId, rightLabel,
      rightX, y, getMetadata(rightId)
    );
  });

  // Position beside the doors
  const sideWidth = (
    elevator.width - elevator.doorWidth
  ) / 2;

  const panelX = elevator.doorWidth / 2 + sideWidth / 2;
  const panelZ = elevator.depth / 2 - elevator.thickness - 0.055;

  group.position.set(panelX, 0, panelZ);

  // Ignore decorative meshes during raycasting
  group.traverse((object) => {
    if (object.isMesh && !object.userData.interactable && object !== secretButton) {
      object.raycast = () => {};
    }
  });

  elevator.group.add(group);

  return {
    group,
    buttons,
    screen,
    setFloor,
    firePanel,
    fireDoor,
    openFirePanel,
    closeFirePanel
  };
}
