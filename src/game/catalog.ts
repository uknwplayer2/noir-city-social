import type { BoxPiece, FurniDef, Look, Pattern, Piece, Rot, SpriteFrame, Swatch } from "@/game/types";
import rooftopBar from "@/game/assets/rooftop/bar.webp";
import rooftopPlanter from "@/game/assets/rooftop/planter.webp";
import rooftopPool from "@/game/assets/rooftop/pool.webp";
import rooftopTable from "@/game/assets/rooftop/table.webp";
import noirRadioSprite from "@/game/assets/rooftop/radio-sprite-v2.png";
import noirSofaSprites from "@/game/assets/rooftop/sofa-sprites.png";

type Trio = { top: string; left: string; right: string };

const wood: Trio = { top: "#9a6237", left: "#70452c", right: "#422a20" };
const woodDark: Trio = { top: "#5c3827", left: "#40271e", right: "#281a17" };
const cloth: Trio = { top: "#8f2631", left: "#641c28", right: "#3e1821" };
const clothDeep: Trio = { top: "#5c1e29", left: "#401720", right: "#2b141b" };
const clothLight: Trio = { top: "#c58b60", left: "#936447", right: "#694333" };
const linen: Trio = { top: "#f3e6d2", left: "#e2d0b6", right: "#cbb89a" };
const leaf: Trio = { top: "#7fbf68", left: "#4f8f48", right: "#3a6e36" };
const leafDeep: Trio = { top: "#3e7a40", left: "#2f6134", right: "#244c28" };
const clay: Trio = { top: "#e7d3b8", left: "#c9ad8e", right: "#a88b6c" };
const metal: Trio = { top: "#f4f0e6", left: "#d4cfc3", right: "#b3ab9e" };
const shade: Trio = { top: "#ffe08a", left: "#f0c45a", right: "#d4a43c" };
const dark: Trio = { top: "#3c3834", left: "#2a2724", right: "#1a1816" };
const ink: Trio = { top: "#2a2622", left: "#1c1916", right: "#100e0c" };
const rug: Trio = { top: "#f0e2cc", left: "#d8c6ac", right: "#c2ad90" };
const stripe: Trio = { top: "#e07a45", left: "#c46234", right: "#a34e28" };
const mat: Trio = { top: "#8d5a3c", left: "#744830", right: "#5c3824" };
const cream: Trio = { top: "#f6efe2", left: "#e6dccb", right: "#d4c6b0" };
const stone: Trio = { top: "#aaa69e", left: "#817d77", right: "#625e59" };
const sofaFrames: [SpriteFrame, SpriteFrame, SpriteFrame, SpriteFrame] = [
  { x: 0, y: 0, width: 640, height: 640 },
  { x: 640, y: 0, width: 640, height: 640 },
  { x: 0, y: 640, width: 640, height: 640 },
  { x: 640, y: 640, width: 640, height: 640 },
];

function box(x: number, y: number, w: number, d: number, z: number, h: number, c: Trio): BoxPiece {
  return { kind: "box", x, y, w, d, z, h, top: c.top, left: c.left, right: c.right };
}

function sofaPieces(w: number): Piece[] {
  const pieces: Piece[] = [
    box(0.06, 0.2, w - 0.12, 0.72, 0, 11, cloth),
    box(0.06, 0.02, w - 0.12, 0.28, 0, 26, clothDeep),
    box(0, 0.16, 0.18, 0.76, 0, 18, clothDeep),
    box(w - 0.18, 0.16, 0.18, 0.76, 0, 18, clothDeep),
  ];
  const inner = w - 0.44;
  const gap = 0.08;
  const cushionW = (inner - gap * (w - 1)) / w;
  for (let i = 0; i < w; i++) {
    pieces.push(box(0.22 + i * (cushionW + gap), 0.34, cushionW, 0.46, 11, 5, clothLight));
  }
  return pieces;
}

function tablePieces(w: number, d: number, topH: number): Piece[] {
  const leg = 0.1;
  const inset = 0.14;
  return [
    box(inset, inset, leg, leg, 0, topH, woodDark),
    box(w - inset - leg, inset, leg, leg, 0, topH, woodDark),
    box(inset, d - inset - leg, leg, leg, 0, topH, woodDark),
    box(w - inset - leg, d - inset - leg, leg, leg, 0, topH, woodDark),
    box(0.04, 0.06, w - 0.08, d - 0.1, topH, 3.5, wood),
  ];
}

function heightOf(pieces: Piece[]): number {
  let h = 12;
  for (const p of pieces) h = Math.max(h, p.kind === "blob" ? p.z : p.z + p.h);
  return h;
}

function def(partial: Omit<FurniDef, "height" | "blocks"> & { blocks?: boolean }): FurniDef {
  return {
    ...partial,
    blocks: partial.blocks ?? partial.layer === "object",
    height: heightOf(partial.pieces),
    stackHeight: partial.stackHeight ?? heightOf(partial.pieces),
    canStack: partial.canStack ?? false,
    canSit: partial.canSit ?? false,
    canLay: partial.canLay ?? false,
    isWalkable: partial.isWalkable ?? false,
  };
}

export const LOOKS: Look[] = [
  { id: "barro", name: "Clássico", shirt: "#d8c7aa", pants: "#302a29", hair: "#271b17", skin: "#f0c7a4" },
  { id: "rio", name: "Executivo", shirt: "#332d2c", pants: "#171719", hair: "#1a1a1a", skin: "#e8b898" },
  { id: "noite", name: "Bordô", shirt: "#76232d", pants: "#211c20", hair: "#4a3428", skin: "#c98b6a" },
  { id: "flor", name: "Linhar", shirt: "#e6d5ba", pants: "#71604f", hair: "#6b3a2a", skin: "#f3d0b5" },
];

export const FLOORS: Swatch[] = [
  { id: "areia", name: "Areia", color: "#655444", alt: "#504235" },
  { id: "marfim", name: "Marfim", color: "#8a7862", alt: "#75634f" },
  { id: "terracota", name: "Terracota", color: "#713b35", alt: "#5c302e" },
  { id: "musgo", name: "Musgo", color: "#41473a", alt: "#343a31" },
  { id: "ardosia", name: "Ardósia", color: "#393b43", alt: "#2d3038" },
];

export const WALLS: Swatch[] = [
  { id: "creme", name: "Creme", color: "#4a3c34", alt: "#342b28" },
  { id: "ambar", name: "Âmbar", color: "#594338", alt: "#40322d" },
  { id: "salvia", name: "Sálvia", color: "#384038", alt: "#2b342f" },
  { id: "tijolo", name: "Tijolo", color: "#592e30", alt: "#3d2229" },
  { id: "noite", name: "Noite", color: "#292b34", alt: "#1c1e28" },
];

export const PATTERNS: { id: Pattern; name: string }[] = [
  { id: "liso", name: "Liso" },
  { id: "xadrez", name: "Xadrez" },
  { id: "tabua", name: "Tábua" },
  { id: "lajota", name: "Lajota" },
];

export const LAYOUTS = [
  { cols: 6, rows: 6, label: "6×6" },
  { cols: 8, rows: 8, label: "8×8" },
  { cols: 10, rows: 10, label: "10×10" },
  { cols: 12, rows: 8, label: "12×8" },
  { cols: 12, rows: 12, label: "12×12" },
  { cols: 14, rows: 12, label: "14×12" },
  { cols: 16, rows: 12, label: "16×12" },
] as const;

const shelfBooks: Piece[] = [
  box(0.22, 0.28, 0.14, 0.42, 8, 11, { top: "#c4523a", left: "#a33e2c", right: "#7e3022" }),
  box(0.38, 0.28, 0.12, 0.42, 8, 13, { top: "#3d6e58", left: "#2f5644", right: "#244436" }),
  box(0.52, 0.3, 0.16, 0.4, 8, 10, { top: "#e6d3a4", left: "#cbb888", right: "#b09a6c" }),
  box(0.24, 0.28, 0.18, 0.42, 24, 12, { top: "#3a4e68", left: "#2c3c52", right: "#223044" }),
  box(0.44, 0.3, 0.14, 0.4, 24, 10, { top: "#d48a3a", left: "#b8722c", right: "#945c22" }),
  box(0.28, 0.3, 0.22, 0.38, 40, 8, { top: "#f2efe6", left: "#d8d2c4", right: "#bdb6a6" }),
];

export const CATALOG: FurniDef[] = [
  def({
    id: "capacho",
    name: "Capacho",
    blurb: "Na entrada",
    category: "decor",
    price: 8,
    w: 1,
    d: 1,
    layer: "floor",
    blocks: false,
    isWalkable: true,
    pieces: [
      box(0.08, 0.14, 0.84, 0.72, 0, 2, mat),
      box(0.12, 0.32, 0.76, 0.1, 2, 1, cream),
      box(0.12, 0.52, 0.76, 0.1, 2, 1, cream),
    ],
  }),
  def({
    id: "tapete",
    name: "Tapete listrado",
    blurb: "Centro do quarto",
    category: "decor",
    price: 24,
    w: 2,
    d: 2,
    layer: "floor",
    blocks: false,
    isWalkable: true,
    pieces: [
      box(0.08, 0.08, 1.84, 1.84, 0, 2, rug),
      box(0.14, 0.38, 1.72, 0.16, 2, 1, stripe),
      box(0.14, 0.9, 1.72, 0.16, 2, 1, stripe),
      box(0.14, 1.42, 1.72, 0.16, 2, 1, stripe),
    ],
  }),
  def({
    id: "almofada",
    name: "Almofada",
    blurb: "No chão",
    category: "decor",
    price: 12,
    w: 1,
    d: 1,
    layer: "floor",
    blocks: false,
    isWalkable: true,
    pieces: [
      box(0.16, 0.2, 0.68, 0.6, 0, 7, cloth),
      box(0.26, 0.3, 0.48, 0.4, 7, 3, clothLight),
    ],
  }),
  def({
    id: "sofa",
    name: "Sofá",
    blurb: "Dois lugares",
    category: "assento",
    price: 64,
    w: 2,
    d: 1,
    layer: "object",
    canSit: true,
    sprite: noirSofaSprites,
    spriteFrames: sofaFrames,
    spriteScale: 0.92,
    pieces: sofaPieces(2),
  }),
  def({
    id: "sofa3",
    name: "Sofá comprido",
    blurb: "Três lugares",
    category: "assento",
    price: 88,
    w: 3,
    d: 1,
    layer: "object",
    canSit: true,
    pieces: sofaPieces(3),
  }),
  def({
    id: "poltrona",
    name: "Poltrona",
    blurb: "Um lugar",
    category: "assento",
    price: 42,
    w: 1,
    d: 1,
    layer: "object",
    canSit: true,
    pieces: sofaPieces(1),
  }),
  def({
    id: "banqueta",
    name: "Banqueta",
    blurb: "Assento redondo",
    category: "assento",
    price: 18,
    w: 1,
    d: 1,
    layer: "object",
    canSit: true,
    pieces: [
      { kind: "pot", cx: 0.5, cy: 0.5, r: 0.1, z: 0, h: 14, top: woodDark.top, side: woodDark.right },
      { kind: "pot", cx: 0.5, cy: 0.5, r: 0.34, z: 14, h: 5, top: cloth.top, side: cloth.right, lip: clothLight.top },
    ],
  }),
  def({
    id: "mesa",
    name: "Mesa baixa",
    blurb: "Para o centro",
    category: "mesa",
    price: 36,
    w: 2,
    d: 1,
    layer: "object",
    canStack: true,
    pieces: tablePieces(2, 1, 14),
  }),
  def({
    id: "canto",
    name: "Mesa de canto",
    blurb: "Quatro pés",
    category: "mesa",
    price: 22,
    w: 1,
    d: 1,
    layer: "object",
    canStack: true,
    pieces: tablePieces(1, 1, 16),
  }),
  def({
    id: "aparador",
    name: "Aparador",
    blurb: "Encostado na parede",
    category: "mesa",
    price: 34,
    w: 2,
    d: 1,
    layer: "object",
    canStack: true,
    pieces: [
      box(0.1, 0.22, 0.12, 0.52, 0, 16, woodDark),
      box(1.78, 0.22, 0.12, 0.52, 0, 16, woodDark),
      box(0.12, 0.28, 1.76, 0.46, 7, 3, wood),
      box(0.04, 0.12, 1.92, 0.7, 16, 4, wood),
    ],
  }),
  def({
    id: "cama",
    name: "Cama Art Déco Noir",
    blurb: "Madeira escura, latão e peseira bordô",
    category: "assento",
    price: 90,
    w: 2,
    d: 2,
    layer: "object",
    procedural: "noir-bed",
    canSit: true,
    canLay: true,
    pieces: [
      // Metadata de colisão/altura; a geometria visível é desenhada por drawNoirBed.
      box(0.08, 0.06, 1.84, 1.88, 0, 10, woodDark),
      box(0.06, 0.02, 1.88, 0.16, 10, 34, woodDark),
      box(0.12, 0.18, 1.76, 1.66, 10, 9, linen),
    ],
  }),
  def({
    id: "estante",
    name: "Estante",
    blurb: "Com livros",
    category: "decor",
    price: 48,
    w: 1,
    d: 1,
    layer: "object",
    canStack: true,
    pieces: [
      box(0.08, 0.16, 0.12, 0.68, 0, 50, wood),
      box(0.8, 0.16, 0.12, 0.68, 0, 50, wood),
      box(0.08, 0.1, 0.84, 0.18, 0, 50, woodDark),
      box(0.16, 0.22, 0.66, 0.58, 4, 3, wood),
      box(0.16, 0.22, 0.66, 0.58, 20, 3, wood),
      box(0.16, 0.22, 0.66, 0.58, 36, 3, wood),
      ...shelfBooks,
    ],
  }),
  def({
    id: "luminaria",
    name: "Luminária",
    blurb: "Luz de canto",
    category: "luz",
    price: 30,
    w: 1,
    d: 1,
    layer: "object",
    pieces: [
      box(0.38, 0.38, 0.24, 0.24, 0, 6, dark),
      box(0.44, 0.44, 0.12, 0.12, 6, 30, metal),
      box(0.22, 0.22, 0.56, 0.56, 32, 12, shade),
      { kind: "blob", cx: 0.5, cy: 0.5, rx: 0.46, ry: 0.46, z: 1, color: "rgba(240, 193, 74, 0.28)" },
    ],
  }),
  def({
    id: "abajur",
    name: "Abajur",
    blurb: "Luz baixa",
    category: "luz",
    price: 16,
    w: 1,
    d: 1,
    layer: "object",
    pieces: [
      { kind: "pot", cx: 0.5, cy: 0.5, r: 0.16, z: 0, h: 6, top: clay.top, side: clay.right },
      box(0.46, 0.46, 0.08, 0.08, 6, 16, metal),
      box(0.3, 0.3, 0.4, 0.4, 20, 8, shade),
    ],
  }),
  def({
    id: "palmeira",
    name: "Palmeira",
    blurb: "Folha alta",
    category: "planta",
    price: 34,
    w: 1,
    d: 1,
    layer: "object",
    pieces: [
      { kind: "pot", cx: 0.5, cy: 0.5, r: 0.28, z: 0, h: 12, top: clay.top, side: clay.right, lip: "#f3e6d4" },
      box(0.46, 0.46, 0.08, 0.08, 10, 16, { top: "#6b4a30", left: "#5a3c26", right: "#3e2818" }),
      { kind: "blob", cx: 0.5, cy: 0.5, rx: 0.4, ry: 0.4, z: 30, color: leafDeep.top },
      { kind: "blob", cx: 0.3, cy: 0.58, rx: 0.28, ry: 0.28, z: 36, color: leaf.top },
      { kind: "blob", cx: 0.7, cy: 0.46, rx: 0.26, ry: 0.26, z: 34, color: leaf.left },
      { kind: "blob", cx: 0.48, cy: 0.32, rx: 0.22, ry: 0.22, z: 42, color: "#8ed47a" },
    ],
  }),
  def({
    id: "vaso",
    name: "Vaso baixo",
    blurb: "Planta pequena",
    category: "planta",
    price: 14,
    w: 1,
    d: 1,
    layer: "object",
    pieces: [
      { kind: "pot", cx: 0.5, cy: 0.5, r: 0.26, z: 0, h: 10, top: "#d98a72", side: "#b86a56", lip: "#f0c2b0" },
      { kind: "blob", cx: 0.42, cy: 0.48, rx: 0.22, ry: 0.2, z: 16, color: leaf.top },
      { kind: "blob", cx: 0.62, cy: 0.55, rx: 0.18, ry: 0.16, z: 18, color: leafDeep.top },
      { kind: "blob", cx: 0.5, cy: 0.36, rx: 0.14, ry: 0.14, z: 22, color: "#9ed888" },
    ],
  }),
  def({
    id: "som",
    name: "Caixa de som",
    blurb: "Preta, de chão",
    category: "decor",
    price: 28,
    w: 1,
    d: 1,
    layer: "object",
    pieces: [
      box(0.18, 0.16, 0.64, 0.68, 0, 26, dark),
      box(0.28, 0.7, 0.44, 0.14, 8, 12, ink),
      { kind: "blob", cx: 0.5, cy: 0.42, rx: 0.16, ry: 0.16, z: 26, color: "#11100e" },
      { kind: "blob", cx: 0.5, cy: 0.42, rx: 0.06, ry: 0.06, z: 27, color: "#f0a04b" },
    ],
  }),
  def({
    id: "radio",
    name: "Rádio Noir",
    blurb: "Sintonia dourada para o salão",
    category: "decor",
    price: 46,
    w: 1,
    d: 1,
    layer: "object",
    sprite: noirRadioSprite,
    spriteScale: 0.293,
    pieces: [box(0.12, 0.12, 0.76, 0.76, 0, 32, dark)],
  }),
  def({ id: "rooftop-pool", name: "Piscina Rooftop", blurb: "Piscina oficial do Rooftop Night", category: "decor", price: 0, w: 4, d: 4, layer: "object", adminOnly: true, sprite: rooftopPool, pieces: [box(0, 0, 4, 4, 0, 42, dark)] }),
  def({ id: "rooftop-bar", name: "Sky Bar", blurb: "Bar oficial do Rooftop Night", category: "mesa", price: 0, w: 4, d: 4, layer: "object", canStack: true, stackHeight: 48, adminOnly: true, sprite: rooftopBar, pieces: [box(0, 0, 4, 4, 0, 48, woodDark)] }),
  def({ id: "rooftop-sofa", name: "Sofá Rooftop", blurb: "Lounge oficial do Rooftop Night", category: "assento", price: 0, w: 4, d: 2, layer: "object", adminOnly: true, sprite: noirSofaSprites, spriteFrames: sofaFrames, spriteScale: 1.12, pieces: [box(0, 0, 4, 2, 0, 34, clothDeep)] }),
  def({ id: "rooftop-table", name: "Mesa Rooftop", blurb: "Mesa oficial do Rooftop Night", category: "mesa", price: 0, w: 2, d: 2, layer: "object", canStack: true, stackHeight: 28, adminOnly: true, sprite: rooftopTable, pieces: [box(0, 0, 2, 2, 0, 28, woodDark)] }),
  def({ id: "bloco-noir", name: "Bloco Noir", blurb: "Empilhe para construir", category: "decor", price: 8, w: 1, d: 1, layer: "object", canStack: true, stackHeight: 20, pieces: [box(0.04, 0.04, 0.92, 0.92, 0, 20, stone)] }),
  def({ id: "rooftop-planter", name: "Jardineira Rooftop", blurb: "Jardineira oficial do Rooftop Night", category: "planta", price: 0, w: 1, d: 1, layer: "object", adminOnly: true, sprite: rooftopPlanter, pieces: [box(0, 0, 1, 1, 0, 60, leafDeep)] }),
];

const BY_ID = new Map(CATALOG.map((d) => [d.id, d]));

export function getDef(id: string): FurniDef | null {
  return BY_ID.get(id) ?? null;
}

export function getLook(id: string): Look {
  return LOOKS.find((l) => l.id === id) ?? LOOKS[0];
}

export function getFloor(id: string): Swatch {
  return FLOORS.find((f) => f.id === id) ?? FLOORS[0];
}

export function getWall(id: string): Swatch {
  return WALLS.find((w) => w.id === id) ?? WALLS[0];
}

export const CATEGORIES = [
  { id: "tudo", label: "Tudo" },
  { id: "assento", label: "Assento" },
  { id: "mesa", label: "Mesa" },
  { id: "luz", label: "Luz" },
  { id: "planta", label: "Planta" },
  { id: "decor", label: "Decor" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function sellPrice(price: number): number {
  return Math.max(1, Math.floor(price / 2));
}

export const ROTS: Rot[] = [0, 1, 2, 3];
