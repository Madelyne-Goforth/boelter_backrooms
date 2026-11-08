
export class Inventory {
  constructor() {
    // Array indices 0–4 correspond to hotbar slots 1–5.
    this.slotSelected = 0;

    this.inventory = [
      {
        id: "phone",
        name: "Phone",
        type: "device",
        battery: 100,
        icon: "/icons/phone.svg",
        consumable: false
      },
      {
        id: "bruincard",
        name: "BruinCard",
        type: "keycard",
        accessLevel: 1,
        icon: "/icons/bruincard.svg",
        consumable: false
      },
      null,
      null,
      null
    ];

    // Optional callback for refreshing the hotbar.
    this.onChange = null;
  }

  notifyChange() {
    if (typeof this.onChange === "function") {
      this.onChange(this.inventory);
    }
  }

  selectSlot(index) {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.inventory.length
    ) {
      return false;
    }

    this.slotSelected = index;
    this.notifyChange();
    return true;
  }

  getSelectedItem() {
    return this.inventory[this.slotSelected];
  }

  findItemIndex(id) {
    return this.inventory.findIndex(
      item => item !== null && item.id === id
    );
  }

  hasItem(id) {
    return this.findItemIndex(id) !== -1;
  }

  getItem(id) {
    const index = this.findItemIndex(id);

    return index === -1
      ? null
      : this.inventory[index];
  }

  addItem(item) {
    if (
      item === null ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.type !== "string" ||
      !item.id ||
      !item.name ||
      !item.type
    ) {
      return false;
    }

    // Don't accidentally duplicate unique quest items.
    if (this.hasItem(item.id)) {
      return false;
    }

    const emptyIndex = this.inventory.indexOf(null);

    if (emptyIndex === -1) {
      return false;
    }

    this.inventory[emptyIndex] = {
      consumable: false,
      ...item
    };

    this.notifyChange();
    return true;
  }

  removeItem(index) {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.inventory.length
    ) {
      return null;
    }

    const removedItem = this.inventory[index];

    this.inventory[index] = null;

    this.notifyChange();
    return removedItem;
  }

  removeItemById(id) {
    const index = this.findItemIndex(id);

    if (index === -1) {
      return null;
    }

    return this.removeItem(index);
  }

  useItem(id) {
    const item = this.getItem(id);

    if (!item) {
      return false;
    }

    if (item.consumable) {
      this.removeItemById(id);
    }

    return true;
  }

  getItems() {
    return [...this.inventory];
  }
}
