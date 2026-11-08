
export class Dialogue {
  constructor({ onOpen = () => {}, onClose = () => {} } = {}) {
    this.onOpen = onOpen;
    this.onClose = onClose;

    this.active = false;
    this.lines = [];
    this.index = 0;
    this.charIndex = 0;
    this.timer = null;
    this.typing = false;
    this.speed = 25;

    // Dialogue box
    this.container = document.createElement('div');
    this.container.id = 'dialogue';
    this.container.innerHTML = `
      <div class="dialogue-header">
        <span id="dialogue-speaker">YOU</span>
        <span id="dialogue-type">INSPECT</span>
      </div>
      <div id="dialogue-text"></div>
      <div id="dialogue-next">▼</div>
    `;

    document.body.appendChild(this.container);

    this.speaker = this.container.querySelector('#dialogue-speaker');
    this.type = this.container.querySelector('#dialogue-type');
    this.text = this.container.querySelector('#dialogue-text');
    this.next = this.container.querySelector('#dialogue-next');

    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  show(lines, speaker = 'YOU', type = 'INSPECT') {
    this.openedAt = performance.now();
    if (this.active) return;

    this.lines = Array.isArray(lines) ? lines : [lines];
    if (!this.lines.length) return;

    this.index = 0;
    this.active = true;

    this.speaker.textContent = speaker;
    this.type.textContent = type;
    this.container.classList.add('visible');

    this.onOpen();
    this.showLine();
  }

  showLine() {
    clearInterval(this.timer);

    this.text.textContent = '';
    this.next.style.visibility = 'hidden';

    this.charIndex = 0;
    this.typing = true;

    const line = this.lines[this.index];

    // Type one character at a time
    this.timer = setInterval(() => {
      this.charIndex++;
      this.text.textContent = line.slice(0, this.charIndex);

      if (this.charIndex >= line.length) {
        this.finishTyping();
      }
    }, this.speed);
  }

  finishTyping() {
    clearInterval(this.timer);

    this.text.textContent = this.lines[this.index];
    this.typing = false;
    this.next.style.visibility = 'visible';
  }

  advance() {
    if (!this.active) return;

    // First press finishes the current line
    if (this.typing) {
      this.finishTyping();
      return;
    }

    this.index++;

    if (this.index >= this.lines.length) {
      this.close();
    } else {
      this.showLine();
    }
  }

  close() {
    if (!this.active) return;

    clearInterval(this.timer);
    this.active = false;
    this.container.classList.remove('visible');
    this.onClose();
  }

  handleKeyDown(event) {
    if (!this.active) return;
    if (performance.now() - this.openedAt < 150) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
    }

    // Block gameplay keys while dialogue is open
    if (
      event.code === 'Space' ||
      event.code === 'Enter' ||
      event.code === 'KeyF'
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!event.repeat) this.advance();
      return;
    }

    // Stop other game keybindings
    if (
      event.code.startsWith('Key') ||
      event.code.startsWith('Digit') ||
      event.code.startsWith('Arrow') ||
      event.code.startsWith('Shift') ||
      event.code.startsWith('Control')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  dispose() {
    clearInterval(this.timer);
    window.removeEventListener('keydown', this.handleKeyDown, true);
    this.container.remove();
  }
}
