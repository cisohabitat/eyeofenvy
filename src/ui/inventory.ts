import { Party, HandSide } from '../entities/party';

/**
 * Backpack panel. Equip weapons to a hand (L/R buttons) or drink potions (Use).
 * Toggled with the Backpack button or the 'I' key.
 */
export class Inventory {
  private readonly panel = document.getElementById('inventory')!;
  private readonly toggleBtn = document.getElementById('inv-toggle')!;

  constructor(
    private readonly party: Party,
    private readonly onChanged: () => void,
    private readonly onLog: (msg: string) => void,
  ) {
    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.render();
  }

  toggle(): void {
    this.panel.classList.toggle('hidden');
    if (!this.panel.classList.contains('hidden')) this.render();
  }

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  render(): void {
    this.panel.innerHTML = '<h3>Backpack</h3>';
    if (this.party.backpack.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Empty. Find some loot in the dungeon.';
      this.panel.appendChild(empty);
      return;
    }
    this.party.backpack.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'inv-row';
      const detail =
        item.kind === 'potion' ? `heal ${item.heal}` : `atk ${item.attack}`;
      row.innerHTML = `<span>${item.name} <em>${detail}</em></span>`;

      if (item.kind === 'potion') {
        const use = document.createElement('button');
        use.textContent = 'Use';
        use.title = 'Drink the potion';
        use.addEventListener('click', () => {
          const restored = this.party.usePotion(i);
          this.onLog(`The party drinks ${item.name}, restoring ${restored} HP.`);
          this.render();
          this.onChanged();
        });
        row.appendChild(use);
      } else {
        for (const side of ['left', 'right'] as HandSide[]) {
          const btn = document.createElement('button');
          btn.textContent = side === 'left' ? 'L' : 'R';
          btn.title = `Equip to ${side} hand`;
          btn.addEventListener('click', () => {
            this.party.equip(i, side);
            this.render();
            this.onChanged();
          });
          row.appendChild(btn);
        }
      }
      this.panel.appendChild(row);
    });
  }
}
