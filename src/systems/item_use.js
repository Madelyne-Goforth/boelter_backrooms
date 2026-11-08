
// :( :(  (T.T) (T.T)
// I love you like a love song baby
// And I love you like a love song baby
// And I keep beeping
// beep beep beep beep

// I love you like a rendered scene
// And I love you like some bug-free code
// And it keeps bugging
// Bug bug bug bug


export class ItemUse {
  constructor(inventory) {
    this.inventory = inventory;

    // Set up that keyboard listener we needed :(((
    document.addEventListener("keydown", (event) => {
        if (event.code === "KeyE" && !event.repeat) {
            this.useSelectedItem();
        }
    });
  }

  useSelectedItem() {
    // Get selected item
    const item = this.inventory.getSelectedItem();

    // Handle empty slots
    if (item == null) { return; }

    // Determine item type
    if (item.id == "phone") {
        console.log("Opening phone");
    } else if (item.id == "bruincard") {
        console.log("BruinCard Equiped");
    } else {
        console.log("Cannot use this item yet");
    }

    // TODO: Perform corresponding action
  }
}