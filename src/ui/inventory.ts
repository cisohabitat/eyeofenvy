import { Party, HandSide } from '../entities/party';

/**
 * Backpack panel. Click a weapon to equip it; choose which hand via the small
 * L/R buttons. Toggled with the Backpack button or the 'I' key.
 */
export class Inventory {
  private readonly panel = document.getElementById('inventory')!;
  private readonly toggleBtn = document.getElementById('inv-toggle')!;

  constructor(
    private readonly party: Party,
    private readonly onChanged: () => void,
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
    this.party.backpack.forEach((w, i) => {
      const row = document.createElement('div');
      row.className = 'inv-row';
      row.innerHTML = `<span>${w.name} <em>atk ${w.attack}</em></span>`;
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
      this.panel.appendChild(row);
    });
  }
}
