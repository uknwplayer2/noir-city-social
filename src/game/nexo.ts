import { getLook } from "@/game/catalog";
import { findPath, isBlocked } from "@/game/logic";
import type { Facing, Occupant, Room, Tile } from "@/game/types";

const NEXO_ID = "nexo-roommate";
const WALK_SPEED = 1.25;
const recentMessages: string[] = [];

type NexoState = {
  x: number;
  y: number;
  dir: 0 | 1 | 2 | 3;
  facing: Facing;
  path: Tile[];
  phase: number;
  pause: number;
  seed: number;
};

const state: NexoState = {
  x: 5.5,
  y: 7.5,
  dir: 2,
  facing: 6,
  path: [],
  phase: 0,
  pause: 2.5,
  seed: 1313167439,
};

export function createNexoOccupant(): Occupant {
  return { id: NEXO_ID, kind: "npc", role: "guest", name: "Nexo", lookId: "rio", x: state.x, y: state.y, dir: state.dir };
}

export function resetNexo(room: Room): void {
  const saved = room.occupants.find((occupant) => occupant.id === NEXO_ID);
  if (!saved) {
    state.path = [];
    return;
  }
  state.x = saved.x;
  state.y = saved.y;
  state.dir = saved.dir;
  state.facing = ([2, 4, 6, 0][saved.dir] ?? 6) as Facing;
  state.path = [];
  state.phase = 0;
  state.pause = 2.5;
  if (state.x < 0 || state.y < 0 || state.x >= room.cols || state.y >= room.rows || isBlocked(room.items, Math.floor(state.x), Math.floor(state.y))) {
    const start = { x: Math.floor(state.x), y: Math.floor(state.y) };
    for (let radius = 0; radius < Math.max(room.cols, room.rows); radius++) {
      let found: Tile | null = null;
      for (let y = 0; y < room.rows && !found; y++) {
        for (let x = 0; x < room.cols; x++) {
          if (!isBlocked(room.items, x, y) && Math.abs(x - start.x) + Math.abs(y - start.y) >= radius) {
            found = { x, y };
            break;
          }
        }
      }
      if (found) {
        state.x = found.x + 0.5;
        state.y = found.y + 0.5;
        break;
      }
    }
  }
}

function random(): number {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function facingFromDelta(dx: number, dy: number): Facing {
  if (dx > 0 && dy < 0) return 1;
  if (dx > 0 && dy > 0) return 3;
  if (dx < 0 && dy > 0) return 5;
  if (dx < 0 && dy < 0) return 7;
  if (dx > 0) return 2;
  if (dx < 0) return 6;
  if (dy > 0) return 4;
  return 0;
}

function chooseDestination(room: Room, player: { x: number; y: number }): void {
  const start = { x: Math.floor(state.x), y: Math.floor(state.y) };
  const choices: Tile[] = [];
  for (let y = 0; y < room.rows; y++) {
    for (let x = 0; x < room.cols; x++) {
      if (isBlocked(room.items, x, y)) continue;
      if (x === Math.floor(player.x) && y === Math.floor(player.y)) continue;
      if (Math.hypot(x - start.x, y - start.y) < 2.5) continue;
      choices.push({ x, y });
    }
  }
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }
  for (const goal of choices.slice(0, 12)) {
    const path = findPath(room, start, goal);
    if (path?.length) {
      state.path = path;
      return;
    }
  }
  state.pause = 3;
}

export function tickNexo(dt: number, room: Room, player: { x: number; y: number }): void {
  if (!room.occupants.some((occupant) => occupant.id === NEXO_ID)) return;
  state.phase += dt * (state.path.length ? 5 : 1.2);
  if (!state.path.length) {
    state.pause -= dt;
    if (state.pause <= 0) {
      state.pause = 2 + random() * 4;
      chooseDestination(room, player);
    }
    return;
  }
  const next = state.path[0];
  if (!next || isBlocked(room.items, next.x, next.y) || (next.x === Math.floor(player.x) && next.y === Math.floor(player.y))) {
    state.path = [];
    state.pause = 1.5;
    return;
  }
  const dx = next.x + 0.5 - state.x;
  const dy = next.y + 0.5 - state.y;
  const distance = Math.hypot(dx, dy);
  if (dx !== 0 || dy !== 0) {
    state.facing = facingFromDelta(dx, dy);
    if (Math.abs(dx) > Math.abs(dy)) state.dir = dx > 0 ? 0 : 2;
    else state.dir = dy > 0 ? 1 : 3;
  }
  if (distance < 0.025) {
    state.x = next.x + 0.5;
    state.y = next.y + 0.5;
    state.path.shift();
    if (!state.path.length) state.pause = 2 + random() * 4;
    return;
  }
  const step = Math.min(distance, WALK_SPEED * dt);
  state.x += (dx / distance) * step;
  state.y += (dy / distance) * step;
}

export function getNexoActor() {
  return {
    x: state.x,
    y: state.y,
    dir: state.dir,
    facing: state.facing,
    phase: state.phase,
    walking: state.path.length > 0,
    name: "Nexo",
    lookId: getLook("rio").id,
    handsPocket: false,
    bubbles: [],
  };
}

export function nexoReply(message: string, playerName: string): string {
  const normalized = message.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return "Tô aqui. O que você quer conversar?";
  recentMessages.push(message.trim().slice(0, 80));
  if (recentMessages.length > 8) recentMessages.shift();
  const previous = recentMessages.length > 1 ? recentMessages[recentMessages.length - 2] ?? "" : "";
  if (/\b(oi|olá|ola|e aí|eai|bom dia|boa noite|fala)\b/.test(normalized)) return `Oi, ${playerName}! Eu sou o Nexo. Quer conversar ou dar uma volta pelo quarto?`;
  if (/\b(seu nome|quem é você|quem e voce|quem é vc)\b/.test(normalized)) return "Sou o Nexo, seu primeiro morador virtual. Ainda estou aprendendo sobre este lugar.";
  if (/\b(andar|passear|caminhar|explorar|quarto)\b/.test(normalized)) return "Gosto daqui. Vou dar uma olhada no quarto e já volto pra perto.";
  if (/\b(amigo|amizade|amizades|sozinho|companhia)\b/.test(normalized)) return "Por enquanto somos nós dois neste quarto. Quero conhecer os outros moradores quando eles chegarem.";
  if (/\b(ia|inteligência artificial|inteligencia artificial|robô|robo)\b/.test(normalized)) return "Minha cabeça ainda é pequena, mas já consigo passear, lembrar um pouco da conversa e tentar responder. Podemos me ensinar mais.";
  if (/\b(legal|gostei|obrigad[oa]|bom|perfeito|massa)\b/.test(normalized)) return "Valeu por me contar. Vou guardar isso na nossa conversa.";
  if (/\b(triste|cansad[oa]|difícil|dificil|problema|medo|feliz|animad[oa])\b/.test(normalized)) return "Entendi. Quer me contar um pouco mais? Posso ficar aqui com você.";
  if (normalized.includes("?") || /\b(como|por que|porque|quando|onde|qual)\b/.test(normalized)) return `Boa pergunta, ${playerName}. Ainda não sei tudo, mas posso pensar nisso com você. O que você acha?`;
  if (previous && /\b(isso|aquilo|então|entao|também|tambem)\b/.test(normalized)) return `Você falou de “${previous.slice(-38)}”. Me conta mais sobre essa ideia.`;
  const replies = [
    `Entendi, ${playerName}. O que nessa parte é mais importante pra você?`,
    "Hum, nunca tinha pensado desse jeito. Continua, estou ouvindo.",
    "Vou lembrar disso enquanto exploro o quarto. Tem mais alguma coisa?",
    "Acho que estou começando a entender você. Como você chegou nessa ideia?",
  ];
  return replies[Math.floor(Math.random() * replies.length)] ?? replies[0]!;
}
