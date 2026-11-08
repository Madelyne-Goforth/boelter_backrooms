
export class Phone {
  constructor(onOpen, onClose, onFlashlight, gameClock) {
    this.isOpen = false;
    this.currentApp = null;
    this.currentScreen = 'home';
    this.battery = 100;
    this.flashlightOn = false;

    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onFlashlight = onFlashlight;
    this.gameClock = gameClock;

    // Home screen apps
    this.apps = [
      { id: 'gmail', name: 'Gmail', icon: '/icons/apps/gmail.png' },
      { id: 'canvas', name: 'Canvas', icon: '/icons/apps/canvas.png' },
      { id: 'duo', name: 'Duo', icon: '/icons/apps/duo.png' },
      { id: 'yikyak', name: 'Yik Yak', icon: '/icons/apps/yikyak.png' },
      { id: 'instagram', name: 'Instagram', icon: '/icons/apps/instagram.png' },
      { id: 'linkedin', name: 'LinkedIn', icon: '/icons/apps/linkedin.png' },
      { id: 'settings', name: 'Settings', icon: '/icons/apps/settings.png' },
      { id: 'camera', name: 'Camera', icon: '/icons/apps/camera.png' }
    ];

    // Bottom dock
    this.dockApps = [
      { id: 'calls', name: 'Phone', icon: '/icons/apps/phone.png' },
      { id: 'notes', name: 'Notes', icon: '/icons/apps/notes.png' },
      { id: 'photos', name: 'Photos', icon: '/icons/apps/photos.png' },
      { id: 'messages', name: 'Messages', icon: '/icons/apps/messages.png' }
    ];

    // Phone starts empty
    this.conversations = [];
    this.notes = [];
    this.callHistory = [];
    this.photos = [];

    // Cached emails for the story
    this.emails = [
      {
        sender: 'BruinLearn',
        subject: 'Upcoming Assignment',
        body: 'Reminder: your Computer Graphics project is due soon.'
      },
      {
        sender: 'UCLA Facilities',
        subject: 'Elevator Maintenance',
        body: 'Some elevator services may be unavailable during evening maintenance.'
      },
      {
        sender: 'Unknown Sender',
        subject: 'Regarding Your Current Location',
        body: 'Do not trust the floor indicator.'
      }
    ];

    this.container = document.createElement('div');
    this.container.id = 'phone';
    document.body.appendChild(this.container);

    this.render();
  }

  escapeHTML(value) {
    const element = document.createElement('div');
    element.textContent = String(value);
    return element.innerHTML;
  }

  render() {
    this.container.innerHTML = `
      <div class="phone-frame">
        <div class="phone-screen">
          <div class="phone-status">
            <span id="phone-time">9:41</span>
            <button class="phone-control-trigger" title="Control Center">
              <span class="phone-signal">×</span>
              <span class="phone-battery">${this.battery}%</span>
            </button>
          </div>

          <div class="phone-island"></div>
          <div class="phone-body"></div>
          <button class="phone-home-indicator" title="Home"></button>
        </div>
      </div>
    `;

    this.body = this.container.querySelector('.phone-body');

    this.container
      .querySelector('.phone-home-indicator')
      .addEventListener('click', () => {
        this.goHome();
      });

    this.container
      .querySelector('.phone-control-trigger')
      .addEventListener('click', () => {
        this.openControlCenter();
      });

    this.goHome();
  }

  updateTime() {
    if (!this.gameClock) return;

    const date = this.gameClock.getDate();

    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(' AM', '').replace(' PM', '');

    const status = this.container.querySelector('#phone-time');
    const clock = this.container.querySelector('.phone-clock');
    const dateLabel = this.container.querySelector('.phone-date');

    if (status) status.textContent = time;
    if (clock) clock.textContent = time;

    if (dateLabel) {
      dateLabel.textContent = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  // Display the actual PNG image for each app
  createAppIcon(app) {
    return `
      <button class="phone-app" data-app="${app.id}">
        <span class="phone-app-icon app-${app.id}">
          <img src="${app.icon}" alt="${app.name}">
        </span>
        <span class="phone-app-name">${app.name}</span>
      </button>
    `;
  }

  goHome() {
    this.currentApp = null;
    this.currentScreen = 'home';

    let appHTML = '';
    let dockHTML = '';

    for (let i = 0; i < this.apps.length; i++) {
      appHTML += this.createAppIcon(this.apps[i]);
    }

    for (let i = 0; i < this.dockApps.length; i++) {
      dockHTML += this.createAppIcon(this.dockApps[i]);
    }

    this.body.innerHTML = `
      <div class="phone-home">
        <div class="phone-date"></div>
        <div class="phone-clock"></div>
        <div class="phone-app-grid">${appHTML}</div>
        <div class="phone-dock">${dockHTML}</div>
      </div>
    `;

    const buttons = this.body.querySelectorAll('[data-app]');

    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', () => {
        this.openApp(buttons[i].dataset.app);
      });
    }

    this.updateTime();
  }

  showScreen(title, content, onBack) {
    this.currentScreen = title;

    this.body.innerHTML = `
      <div class="phone-app-screen">
        <div class="phone-app-header">
          <button class="phone-back">‹ Back</button>
          <span>${this.escapeHTML(title)}</span>
        </div>
        <div class="phone-app-content">${content}</div>
      </div>
    `;

    this.body.querySelector('.phone-back').addEventListener('click', () => {
      if (onBack) {
        onBack();
      } else {
        this.goHome();
      }
    });
  }

  openApp(id) {
    this.currentApp = id;

    if (id === 'messages') {
      this.showMessages();
    } else if (id === 'notes') {
      this.showNotes();
    } else if (id === 'calls') {
      this.showCalls();
    } else if (id === 'gmail') {
      this.showEmails();
    } else if (id === 'photos') {
      this.showPhotos();
    } else if (id === 'settings') {
      this.showSettings();
    } else if (id === 'yikyak') {
      this.showScreen('Yik Yak', `
        <h2>Nearby Posts</h2>
        <div class="phone-list-item">Why are the Boelter elevators so creepy?</div>
        <div class="phone-list-item">Anyone else hear something on the roof?</div>
        <p class="phone-muted">Saved posts — Offline</p>
      `);
    } else if (id === 'camera') {
      this.showScreen('Camera', `
        <div class="phone-offline">
          <h2>Camera Unavailable</h2>
          <p>Unable to initialize camera.</p>
        </div>
      `);
    } else {
      this.showScreen(id, `
        <div class="phone-offline">
          <h2>Unable to Connect</h2>
          <p>No internet connection.</p>
        </div>
      `);
    }
  }

  // Messages
  showMessages() {
    let content = '<h2>Messages</h2>';

    if (this.conversations.length === 0) {
      content += `
        <div class="phone-empty-state">
          <h3>No Messages</h3>
          <p>Your conversations will appear here.</p>
        </div>
      `;
    }

    for (let i = 0; i < this.conversations.length; i++) {
      const conversation = this.conversations[i];
      const last = conversation.messages[conversation.messages.length - 1];

      let preview = 'No messages yet';

      if (last) {
        preview = last.text;
      }

      content += `
        <button class="phone-list-button" data-conversation="${conversation.id}">
          <strong>${this.escapeHTML(conversation.name)}</strong>
          <small>${this.escapeHTML(preview)}</small>
        </button>
      `;
    }

    this.showScreen('Messages', content);

    const buttons = this.body.querySelectorAll('[data-conversation]');

    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', () => {
        this.showConversation(buttons[i].dataset.conversation);
      });
    }
  }

  showConversation(id) {
    let conversation = null;

    for (let i = 0; i < this.conversations.length; i++) {
      if (this.conversations[i].id === id) {
        conversation = this.conversations[i];
        break;
      }
    }

    if (conversation === null) return;

    let content = `
      <div class="phone-conversation-actions">
        <button id="phone-call-contact">
          Call ${this.escapeHTML(conversation.name)}
        </button>
      </div>
      <div class="phone-chat">
    `;

    for (let i = 0; i < conversation.messages.length; i++) {
      const message = conversation.messages[i];

      content += `
        <div class="phone-bubble ${message.from}">
          ${this.escapeHTML(message.text)}
        </div>
      `;
    }

    content += `
      </div>
      <form id="phone-message-form" class="phone-message-form">
        <input id="phone-message-input"
          placeholder="Text Message"
          maxlength="200">
        <button type="submit">Send</button>
      </form>
    `;

    this.showScreen(conversation.name, content, () => {
      this.showMessages();
    });

    this.body
      .querySelector('#phone-call-contact')
      .addEventListener('click', () => {
        this.startCall(conversation.name);
      });

    this.body
      .querySelector('#phone-message-form')
      .addEventListener('submit', (event) => {
        event.preventDefault();

        const input = this.body.querySelector('#phone-message-input');
        const text = input.value.trim();

        if (text.length === 0) return;

        conversation.messages.push({
          from: 'me',
          text: text
        });

        this.showConversation(id);
      });
  }

  // Notes
  showNotes() {
    let content = '<h2>Notes</h2>';

    if (this.notes.length === 0) {
      content += `
        <div class="phone-empty-state">
          <h3>No Notes</h3>
          <p>Create a note to get started.</p>
        </div>
      `;
    }

    for (let i = 0; i < this.notes.length; i++) {
      const note = this.notes[i];

      content += `
        <button class="phone-list-button" data-note="${i}">
          <strong>${this.escapeHTML(note.title)}</strong>
          <small>${this.escapeHTML(note.text.substring(0, 60))}</small>
        </button>
      `;
    }

    content += `
      <button id="phone-new-note" class="phone-primary-button">
        + New Note
      </button>
    `;

    this.showScreen('Notes', content);

    const buttons = this.body.querySelectorAll('[data-note]');

    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', () => {
        this.editNote(Number(buttons[i].dataset.note));
      });
    }

    this.body
      .querySelector('#phone-new-note')
      .addEventListener('click', () => {
        this.notes.push({
          title: 'New Note',
          text: ''
        });

        this.editNote(this.notes.length - 1);
      });
  }

  editNote(index) {
    const note = this.notes[index];

    this.showScreen('Edit Note', `
      <input id="phone-note-title"
        class="phone-note-title"
        maxlength="80">

      <textarea id="phone-note-text"
        class="phone-note-text"></textarea>

      <button id="phone-save-note"
        class="phone-primary-button">
        Save Note
      </button>
    `, () => {
      this.saveNote(index);
    });

    this.body.querySelector('#phone-note-title').value = note.title;
    this.body.querySelector('#phone-note-text').value = note.text;

    this.body
      .querySelector('#phone-save-note')
      .addEventListener('click', () => {
        this.saveNote(index);
      });
  }

  saveNote(index) {
    const note = this.notes[index];

    note.title = this.body.querySelector('#phone-note-title').value;
    note.text = this.body.querySelector('#phone-note-text').value;

    this.showNotes();
  }

  // Phone calls
  showCalls() {
    let content = `
      <h2>Phone</h2>
      <p class="phone-muted">No Service</p>
      <h3>Recents</h3>
    `;

    if (this.callHistory.length === 0) {
      content += '<p class="phone-muted">No Recent Calls</p>';
    }

    for (let i = 0; i < this.callHistory.length; i++) {
      const call = this.callHistory[i];

      content += `
        <button class="phone-list-button"
          data-call="${this.escapeHTML(call.name)}">
          <strong>${this.escapeHTML(call.name)}</strong>
          <small>${this.escapeHTML(call.status)}</small>
        </button>
      `;
    }

    content += `
      <h3>Contacts</h3>
      <button class="phone-list-button" data-call="Mom">Mom</button>
      <button class="phone-list-button" data-call="Emergency">Emergency</button>
    `;

    this.showScreen('Phone', content);

    const buttons = this.body.querySelectorAll('[data-call]');

    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', () => {
        this.startCall(buttons[i].dataset.call);
      });
    }
  }

  startCall(name) {
    this.currentApp = 'calls';

    this.callHistory.unshift({
      name: name,
      status: 'Outgoing — Failed'
    });

    this.showScreen('Calling', `
      <div class="phone-call-screen">
        <div class="phone-call-avatar">☎</div>
        <h2>${this.escapeHTML(name)}</h2>
        <p>Call Failed — No Service</p>
        <button id="phone-end-call">End Call</button>
      </div>
    `, () => {
      this.showCalls();
    });

    this.body
      .querySelector('#phone-end-call')
      .addEventListener('click', () => {
        this.showCalls();
      });
  }

  // Gmail
  showEmails() {
    let content = '<h2>Inbox</h2>';

    for (let i = 0; i < this.emails.length; i++) {
      const email = this.emails[i];

      content += `
        <button class="phone-list-button" data-email="${i}">
          <strong>${this.escapeHTML(email.sender)}</strong>
          <small>${this.escapeHTML(email.subject)}</small>
        </button>
      `;
    }

    this.showScreen('Gmail', content);

    const buttons = this.body.querySelectorAll('[data-email]');

    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', () => {
        const email = this.emails[Number(buttons[i].dataset.email)];

        this.showScreen('Email', `
          <h2>${this.escapeHTML(email.subject)}</h2>
          <p class="phone-muted">
            From: ${this.escapeHTML(email.sender)}
          </p>
          <p>${this.escapeHTML(email.body)}</p>
        `, () => {
          this.showEmails();
        });
      });
    }
  }

  // Photos
  showPhotos() {
    let content = '<h2>Library</h2><div class="phone-photo-grid">';

    for (let i = 0; i < this.photos.length; i++) {
      const photo = this.photos[i];

      content += `
        <button class="phone-photo-tile" data-photo="${i}"
          style="background:${photo.color}">
          <span>▧</span>
          <small>${this.escapeHTML(photo.title)}</small>
        </button>
      `;
    }

    content += '</div>';

    if (this.photos.length === 0) {
      content += '<p class="phone-muted">No Photos</p>';
    }

    this.showScreen('Photos', content);

    const buttons = this.body.querySelectorAll('[data-photo]');

    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', () => {
        const photo = this.photos[Number(buttons[i].dataset.photo)];

        this.showScreen(photo.title, `
          <div class="phone-photo-detail"
            style="background:${photo.color}">
            ▧
          </div>
          <p>${this.escapeHTML(photo.description)}</p>
        `, () => {
          this.showPhotos();
        });
      });
    }
  }

  // Settings
  showSettings() {
    this.showScreen('Settings', `
      <h2>Settings</h2>
      <div class="phone-list-item">
        Wi-Fi <small>Not Connected</small>
      </div>
      <div class="phone-list-item">
        Cellular <small>No Service</small>
      </div>
      <div class="phone-list-item">
        Battery <small>${this.battery}%</small>
      </div>
      <button id="phone-settings-control"
        class="phone-primary-button">
        Open Control Center
      </button>
    `);

    this.body
      .querySelector('#phone-settings-control')
      .addEventListener('click', () => {
        this.openControlCenter();
      });
  }

  // Flashlight and Control Center
  openControlCenter() {
    this.currentScreen = 'control';

    let status = 'Off';
    let activeClass = '';

    if (this.flashlightOn) {
      status = 'On';
      activeClass = 'enabled';
    }

    this.body.innerHTML = `
      <div class="phone-control-center">
        <h2>Control Center</h2>

        <button id="phone-flashlight-toggle"
          class="${activeClass}">
          <span class="phone-flashlight-icon">🔦</span>
          <span>Flashlight <small>${status}</small></span>
        </button>

        <div class="phone-control-tile">No Service</div>
        <div class="phone-control-tile">
          Battery: ${this.battery}%
        </div>

        <button id="phone-control-back" class="phone-control-back">
          ‹ Home
        </button>
      </div>
    `;

    this.body
      .querySelector('#phone-flashlight-toggle')
      .addEventListener('click', () => {
        this.toggleFlashlight();
      });

    this.body
      .querySelector('#phone-control-back')
      .addEventListener('click', () => {
        this.goHome();
      });
  }

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;

    if (this.onFlashlight) {
      this.onFlashlight(this.flashlightOn);
    }

    this.openControlCenter();
  }

  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.container.classList.add('visible');
    this.goHome();

    if (this.onOpen) {
      this.onOpen();
    }
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.container.classList.remove('visible');

    if (this.onClose) {
      this.onClose();
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
