import type { AvatarFigure } from "@/game/avatar/layers";
import type { BubbleSizeId, BubbleStyleId } from "@/game/bubbles";

export type Rot = 0 | 1 | 2 | 3;
/** Eight compass directions match the avatar walk sheets. */
export type Facing = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Layer = "floor" | "object";

export type Category = "assento" | "mesa" | "luz" | "planta" | "decor";

export type Pattern = "liso" | "xadrez" | "tabua" | "lajota";

export type BoxPiece = {
  kind: "box";
  x: number;
  y: number;
  w: number;
  d: number;
  z: number;
  h: number;
  top: string;
  left: string;
  right: string;
};

export type PotPiece = {
  kind: "pot";
  cx: number;
  cy: number;
  r: number;
  z: number;
  h: number;
  top: string;
  side: string;
  lip?: string;
};

export type BlobPiece = {
  kind: "blob";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  z: number;
  color: string;
};

export type Piece = BoxPiece | PotPiece | BlobPiece;

export type FurniDef = {
  id: string;
  name: string;
  blurb: string;
  category: Category;
  price: number;
  w: number;
  d: number;
  layer: Layer;
  blocks: boolean;
  height: number;
  stackHeight?: number;
  canStack?: boolean;
  canSit?: boolean;
  canLay?: boolean;
  isWalkable?: boolean;
  pieces: Piece[];
  sprite?: string;
  spriteFrames?: [SpriteFrame, SpriteFrame, SpriteFrame, SpriteFrame];
  spriteScale?: number;
  adminOnly?: boolean;
};

export type SpriteFrame = { x: number; y: number; width: number; height: number };

export type Placed = {
  uid: string;
  defId: string;
  x: number;
  y: number;
  rot: Rot;
  mirror?: boolean;
};

export type InvItem = {
  uid: string;
  defId: string;
};

/** Later: remote guests and staff such as waiters. Not spawned in this build. */
export type Occupant = {
  id: string;
  kind: "player" | "npc";
  role: "guest" | "staff";
  name: string;
  lookId: string;
  x: number;
  y: number;
  dir: Rot;
};

export type Room = {
  name: string;
  cols: number;
  rows: number;
  floorId: string;
  wallId: string;
  pattern: Pattern;
  items: Placed[];
  occupants: Occupant[];
};

export type Avatar = {
  x: number;
  y: number;
  dir: Rot;
};

export type Look = {
  id: string;
  name: string;
  shirt: string;
  pants: string;
  hair: string;
  skin: string;
};

export type Swatch = {
  id: string;
  name: string;
  color: string;
  alt: string;
};

export type Tile = { x: number; y: number };

export type Tool = "walk" | "edit";

export type Quest = { id: string; progress: number; claimed: boolean };

/** Prototype roles are stored locally. Online permissions must move server-side. */
export type UserRole = "player" | "moderator" | "admin";

export type InternalMail = { id: string; sender: string; recipient: string; subject: string; body: string; sentAt: number; read: boolean };

export const SAVE_VERSION = 5;

export type SaveData = {
  version: number;
  entered: boolean;
  guestName: string;
  authenticated: boolean;
  rememberDevice: boolean;
  role: UserRole;
  lookId: string;
  /** Avatar appearance by independently selectable layers; optional for older saves. */
  figure?: AvatarFigure;
  bubbleStyle?: BubbleStyleId;
  bubbleSize?: BubbleSizeId;
  coins: number;
  inventory: InvItem[];
  room: Room;
  avatar: Avatar;
  homeState?: { room: Room; avatar: Avatar };
  questDay?: string;
  quests?: Quest[];
  chatDuration?: 15000 | 20000 | 0;
  internalMail: InternalMail[];
};
