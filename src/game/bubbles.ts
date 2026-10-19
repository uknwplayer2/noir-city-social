export const BUBBLE_STYLES = [
  { id: "noir", label: "Noir", fill: "#1a1612", border: "#c4a05a", text: "#f0e2cc" },
  { id: "ivory", label: "Marfim", fill: "#f3e6d2", border: "#a88b6c", text: "#2a221c" },
  { id: "wine", label: "Bordô", fill: "#3e1821", border: "#c45a6a", text: "#f0d0d4" },
  { id: "moss", label: "Musgo", fill: "#1e2a1c", border: "#7fbf68", text: "#d8f0c8" },
  { id: "amber", label: "Âmbar", fill: "#2a2010", border: "#f0a04b", text: "#ffe8c0" },
  { id: "slate", label: "Ardósia", fill: "#1c1e28", border: "#7a8499", text: "#d0d6e4" },
] as const;

export type BubbleStyleId = (typeof BUBBLE_STYLES)[number]["id"];
export type BubbleSizeId = "sm" | "md" | "lg";

export const BUBBLE_SIZES: { id: BubbleSizeId; label: string; preview: string }[] = [
  { id: "lg", label: "Grande", preview: "text-sm px-3 py-1.5" },
  { id: "md", label: "Médio", preview: "text-xs px-2.5 py-1" },
  { id: "sm", label: "Pequeno", preview: "text-[10px] px-2 py-0.5" },
];

export function getBubbleStyle(id: string | undefined) {
  return BUBBLE_STYLES.find((style) => style.id === id) ?? BUBBLE_STYLES[0];
}

export function getBubbleSize(id: unknown): BubbleSizeId {
  return id === "lg" || id === "sm" ? id : "md";
}
