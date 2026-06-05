import { Party, HandSide } from '../entities/party';
import { Direction, DIR_LABEL } from '../dungeon/types';

/** DOM HUD: party portraits with HP bars, weapon-hand buttons, a message log. */
export class Hud {
  private readonly partyEl = document.getElementById('party')!;
  private readonly messagesEl = document.getElementById('messages')!;
  private readonly compassEl = document.getElementById('compass')!;
  private readonly handEls = new Map<HandSide, HTMLElement>();

  constructor(private readonly party: Party) {
    document.querySelectorAll<HTMLElement>('.hand').forEach((el) => {
      this.handEls.set(el.dataset.hand as HandSide, el);
    });
    this.renderParty();
    this.renderHands();
  }

  /** Wire a hand button to an attack callback. */
  onAttack(handler: (side: HandSide) => void): void {
    this.handEls.forEach((el, side) => {
      el.addEventListener('click', () => handler(side));
    });
  }

  renderParty(): void {
    this.partyEl.innerHTML = '';
    for (const c of this.party.members) {
      const pct = Math.round((c.hp / c.maxHp) * 100);
      const dead = c.hp <= 0;
      const portrait = document.createElement('div');
      portrait.className = 'portrait' + (dead ? ' dead' : '');
      portrait.innerHTML = `
        <div class="pname">${c.name}</div>
        <div class="hpbar"><div class="hpfill" style="width:${pct}%"></div></div>
        <div class="hptext">${c.hp}/${c.maxHp}</div>`;
      this.partyEl.appendChild(portrait);
    }
  }

  renderHands(): void {
    this.handEls.forEach((el, side) => {
      const w = this.party.hands[side];
      const label = el.querySelector('.hand-item')!;
      label.textContent = `${w.name} (${w.attack})`;
    });
  }

  setCompass(dir: Direction): void {
    this.compassEl.textContent = DIR_LABEL[dir];
  }

  log(msg: string): void {
    const line = document.createElement('div');
    line.className = 'msg';
    line.textContent = msg;
    this.messagesEl.appendChild(line);
    while (this.messagesEl.childElementCount > 6) {
      this.messagesEl.removeChild(this.messagesEl.firstChild!);
    }
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}
