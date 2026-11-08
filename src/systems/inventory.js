
export class Inventory {
  constructor() {
    // Array indices 0–4 correspond to hotbar slots 1–5
    this.slotSelected = 0;

    // Inventory items are objects with shared properties
    this.inventory = [
      {
        id: "phone",
        name: "Phone",
        type: "device",
        battery: 100,
        icon: "/icons/phone.svg"
      },
      {
        id: "bruincard",
        name: "BruinCard",
        type: "keycard",
        accessLevel: 1,
        icon: "/icons/bruincard.svg"
      },
      null,
      null,
      null
    ];
  }

  selectSlot(index) {
    // Check whether the slot index is valid
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.inventory.length
    ) {
      return false;
    }

    this.slotSelected = index;
    return true;
  }

  getSelectedItem() {
    return this.inventory[this.slotSelected];
  }

  addItem(item) {
    // All items must be objects with an ID, name, and type
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

    // Find the first empty slot
    for (let i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i] === null) {
        this.inventory[i] = item;
        return true;
      }
    }

    // No empty slots available
    return false;
  }

  removeItem(index) {
    // Check whether the index is valid
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.inventory.length
    ) {
      return null;
    }

    // Save the item before removing it
    const removedItem = this.inventory[index];

    // Empty the slot without shifting other items
    this.inventory[index] = null;

    return removedItem;
  }
}
