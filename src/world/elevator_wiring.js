export class ElevatorWiring {
  constructor(onComplete = () => {}, onProgress = () => {}) {
    this.onComplete = onComplete;
    this.onProgress = onProgress;
    this.colors = ['#e45454', '#4a9df0', '#e4c451', '#4dbe86'];
    this.leftOrder = [0, 1, 2, 3];
    this.rightOrder = [2, 0, 3, 1];
    this.connected = new Set();
    this.dragging = -1;
    this.pointer = { x: 0, y: 0 };
    this.isOpen = false;
    this.completed = false;
    this.makeUI();
  }

  makeUI() {
    const style = document.createElement('style');
    style.textContent = `
      #wiring-overlay { position: fixed; inset: 0; display: none;
        align-items: center; justify-content: center; background: rgba(0,0,0,.82);
        z-index: 10000; font-family: monospace; }
      #wiring-box { width: min(640px, 92vw); padding: 22px;
        background: #20252b; border: 2px solid #58616a; border-radius: 10px;
        color: #e6e6e6; box-shadow: 0 15px 55px #000; }
      #wiring-header { display: flex; justify-content: space-between;
        align-items: center; margin-bottom: 12px; }
      #wiring-title { font-size: 18px; letter-spacing: 2px; }
      #wiring-close { background: #343b43; color: white;
        border: 1px solid #68727c; padding: 6px 12px; cursor: pointer; }
      #wiring-canvas { display: block; width: 100%; height: auto;
        background: #13171b; border: 2px solid #454c54;
        border-radius: 5px; cursor: crosshair; touch-action: none; }
      #wiring-status { margin-top: 12px; color: #aab6c1; font-size: 13px; }
    `;
    document.head.appendChild(style);

    this.overlay = document.createElement('div');
    this.overlay.id = 'wiring-overlay';
    this.overlay.innerHTML = `
      <div id="wiring-box">
        <div id="wiring-header">
          <span id="wiring-title">FIREFIGHTER SERVICE PANEL</span>
          <button id="wiring-close">X</button>
        </div>
        <canvas id="wiring-canvas" width="600" height="400"></canvas>
        <div id="wiring-status">Connect the matching wires. 0/4 connected.</div>
      </div>
    `;
    document.body.appendChild(this.overlay);
    this.canvas = this.overlay.querySelector('#wiring-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.status = this.overlay.querySelector('#wiring-status');
    this.overlay.querySelector('#wiring-close').addEventListener('click', () => this.close());

    this.canvas.addEventListener('pointerdown', e => {
      if (this.completed) return;
      const p = this.getPointer(e);
      for (let i = 0; i < 4; i++) {
        if (Math.hypot(p.x - 75, p.y - this.wireY(i)) < 35 &&
            !this.connected.has(this.leftOrder[i])) {
          this.dragging = i;
          this.pointer = p;
          this.canvas.setPointerCapture(e.pointerId);
          this.draw();
          return;
        }
      }
    });

    this.canvas.addEventListener('pointermove', e => {
      if (this.dragging < 0) return;
      this.pointer = this.getPointer(e);
      this.draw();
    });

    this.canvas.addEventListener('pointerup', e => {
      if (this.dragging < 0) return;
      const p = this.getPointer(e);
      const color = this.leftOrder[this.dragging];
      for (let i = 0; i < 4; i++) {
        if (Math.hypot(p.x - 525, p.y - this.wireY(i)) < 40 &&
            this.rightOrder[i] === color) {
          this.connected.add(color);
          break;
        }
      }
      this.dragging = -1;
      this.onProgress([...this.connected]);
      this.status.textContent = `${this.connected.size}/4 WIRES CONNECTED`;
      this.draw();
      if (this.connected.size === 4) {
        this.completed = true;
        this.status.textContent = 'CONNECTION RESTORED';
        this.close();
        this.onComplete();
      }
    });

    this.canvas.addEventListener('pointercancel', () => {
      this.dragging = -1;
      this.draw();
    });
    this.draw();
  }

  wireY(i) { return 78 + i * 80; }

  getPointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * this.canvas.width / rect.width,
      y: (e.clientY - rect.top) * this.canvas.height / rect.height
    };
  }

  line(x1, y1, x2, y2, color, width = 11) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + 160, y1 + 15, x2 - 160, y2 - 15, x2, y2);
    ctx.strokeStyle = '#07090b';
    ctx.lineWidth = width + 5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  terminal(x, y, color, connected) {
    const ctx = this.ctx;
    ctx.fillStyle = '#343c43';
    ctx.fillRect(x - 31, y - 20, 62, 40);
    ctx.fillStyle = connected ? '#b9d2c1' : '#9ca6ae';
    ctx.fillRect(x - 26, y - 15, 52, 30);
    ctx.fillStyle = color;
    ctx.fillRect(x - 18, y - 9, 36, 18);
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 600, 400);
    ctx.fillStyle = '#151a1e';
    ctx.fillRect(0, 0, 600, 400);
    ctx.fillStyle = '#262e34';
    ctx.fillRect(25, 35, 95, 330);
    ctx.fillRect(480, 35, 95, 330);

    // Disconnected wires end before the opposite terminal
    for (let i = 0; i < 4; i++) {
      const color = this.leftOrder[i];
      if (this.connected.has(color)) {
        this.line(75, this.wireY(i), 525,
          this.wireY(this.rightOrder.indexOf(color)), this.colors[color]);
      } else {
        this.line(75, this.wireY(i), 195, this.wireY(i), this.colors[color]);
        const j = this.rightOrder.indexOf(color);
        this.line(410, this.wireY(j), 525, this.wireY(j), this.colors[color]);
      }
    }

    if (this.dragging >= 0) {
      this.line(75, this.wireY(this.dragging),
        this.pointer.x, this.pointer.y,
        this.colors[this.leftOrder[this.dragging]]);
    }
    for (let i = 0; i < 4; i++) {
      this.terminal(75, this.wireY(i),
        this.colors[this.leftOrder[i]], this.connected.has(this.leftOrder[i]));
      this.terminal(525, this.wireY(i),
        this.colors[this.rightOrder[i]], this.connected.has(this.rightOrder[i]));
    }
    ctx.fillStyle = '#89949e';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('INPUT', 75, 25);
    ctx.fillText('OUTPUT', 525, 25);
  }

  open() {
    if (this.completed) return false;
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    if (document.pointerLockElement) document.exitPointerLock();
    this.draw();
    return true;
  }

  close() {
    this.isOpen = false;
    this.overlay.style.display = 'none';
  }
}
