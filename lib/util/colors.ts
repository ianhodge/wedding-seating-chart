/** A campy-but-readable palette, assigned to groups by order. */
export const GROUP_PALETTE: string[] = [
  "#e6549b", // rose
  "#f4a23b", // tangerine
  "#6c5ce7", // grape
  "#00b894", // clover
  "#0984e3", // cornflower
  "#d63031", // cherry
  "#e84393", // magenta
  "#e1b12c", // marigold
  "#00cec9", // teal
  "#a29bfe", // lavender
  "#fd79a8", // bubblegum
  "#27ae60", // emerald
  "#ff7675", // coral
  "#74b9ff", // sky
  "#b388eb", // orchid
  "#e17055", // terracotta
  "#0abde3", // lagoon
  "#feca57", // butter
];

export function colorForIndex(i: number): string {
  return GROUP_PALETTE[i % GROUP_PALETTE.length];
}
