import type { Room } from "@/game/types";

/** Room-grid anchors; swapping x and y mirrors the isometric centerline. */
export function createRooftopNightRoom(): Room {
  return {
    name: "Rooftop Night", cols: 16, rows: 16, floorId: "ardosia", wallId: "noite", pattern: "lajota", occupants: [],
    items: [
      { uid: "rt-pool", defId: "rooftop-pool", x: 1, y: 5, rot: 0 },
      { uid: "rt-bar", defId: "rooftop-bar", x: 5, y: 1, rot: 0 },
      { uid: "rt-sofa-a", defId: "rooftop-sofa", x: 2, y: 10, rot: 0 },
      { uid: "rt-sofa-b", defId: "rooftop-sofa", x: 10, y: 2, rot: 1, mirror: true },
      { uid: "rt-table-a", defId: "rooftop-table", x: 6, y: 11, rot: 0 },
      { uid: "rt-table-b", defId: "rooftop-table", x: 11, y: 6, rot: 0, mirror: true },
      { uid: "rt-stool-a", defId: "banqueta", x: 9, y: 2, rot: 0 },
      { uid: "rt-stool-b", defId: "banqueta", x: 2, y: 9, rot: 0 },
      { uid: "rt-planter-a", defId: "rooftop-planter", x: 0, y: 4, rot: 0 },
      { uid: "rt-planter-b", defId: "rooftop-planter", x: 4, y: 0, rot: 0, mirror: true },
      { uid: "rt-planter-c", defId: "rooftop-planter", x: 1, y: 12, rot: 0 },
      { uid: "rt-planter-d", defId: "rooftop-planter", x: 12, y: 1, rot: 0, mirror: true },
      { uid: "rt-planter-e", defId: "rooftop-planter", x: 4, y: 14, rot: 0 },
      { uid: "rt-planter-f", defId: "rooftop-planter", x: 14, y: 4, rot: 0, mirror: true },
      { uid: "rt-lamp-a", defId: "luminaria", x: 7, y: 10, rot: 0 },
      { uid: "rt-lamp-b", defId: "luminaria", x: 10, y: 7, rot: 0, mirror: true },
    ],
  };
}
