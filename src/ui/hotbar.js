
// Wow din't need to import three, kinda learned that

export class Hotbar {
  constructor(inventory) {
    this.inventory = inventory;

    this.container = document.createElement("div");
    this.container.id = "hotbar";

    document.body.appendChild(this.container);

    window.addEventListener("keydown", (event) => {
        if (event.repeat) return;

        const index = Number(event.key) - 1;

        if (index !== this.inventory.slotSelected &&
            this.inventory.selectSlot(index)) {
            this.render();
        }
    });
  }

  render() {
    this.container.replaceChildren();

    this.inventory.inventory.forEach((item, index) => {
      const slot = document.createElement("div");
      slot.classList.add("hotbar-slot");

      if (index === this.inventory.slotSelected) {
        slot.classList.add("selected");
      }

      // We'll build the layers here.
        const background = document.createElement("div");
        background.classList.add("hotbar-background");
        slot.appendChild(background);

        const number = document.createElement("span");
        number.classList.add("hotbar-number");
        number.textContent = index + 1;
        slot.appendChild(number);

        if (item?.icon) {
            const icon = document.createElement("img");

            icon.classList.add("hotbar-icon");
            icon.src = item.icon;
            slot.appendChild(icon);
        }

      this.container.appendChild(slot);
    });
  }
}