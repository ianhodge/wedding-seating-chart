// Shared drag-and-drop identifiers for the floor plan.

/** Droppable id for the "unassigned" tray in the sidebar. */
export const TRAY_ID = "__tray__";

/** Drag id prefix for dragging a whole subgroup as a single unit. */
export const SUBGROUP_PREFIX = "subgroup:";
export const subgroupDragId = (id: string) => `${SUBGROUP_PREFIX}${id}`;
export const parseSubgroupDragId = (dragId: string): string | null =>
  dragId.startsWith(SUBGROUP_PREFIX) ? dragId.slice(SUBGROUP_PREFIX.length) : null;

/** Light/dark readable text color for a given hex background. */
export function readableText(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#3a2233" : "#ffffff";
}
