import { Table, VenueFeature } from "@/lib/types";

// Positions are normalized 0..100 (center of each table) over the floor area,
// approximating the venue diagram. Tweak freely — geometry is pure config.
//
// Capacities (from the venue chart):
//   8-seat round:  1, 2, 4, 5, 6, 9, 10, 15, 16, 19, 20
//   12-seat:       11, 12, 13, 14, 17, 18
//   16-seat (long): 3, 7, 8
// Total = 208 seats (+ the 2-seat sweetheart table).
//
// Placeholder reservations (movable in-app):
//   Higgins Family Friends -> Table 17 ; Higgins Side -> Table 18
//   Pete + Les Friends     -> Table 3 (+ Table 6)

export const DEFAULT_TABLES: Table[] = [
  { id: "t20", label: "Table 20", shape: "round", capacity: 8, x: 40, y: 10 },
  { id: "t19", label: "Table 19", shape: "round", capacity: 8, x: 52, y: 10 },

  { id: "t17", label: "Table 17", shape: "long", capacity: 12, x: 28, y: 20, reservedForGroupId: "higgins-family-friends" },
  { id: "t18", label: "Table 18", shape: "round", capacity: 12, x: 45, y: 21, reservedForGroupId: "higgins-side" },
  { id: "t14", label: "Table 14", shape: "round", capacity: 12, x: 64, y: 18 },

  { id: "t16", label: "Table 16", shape: "round", capacity: 8, x: 28, y: 33 },
  { id: "t15", label: "Table 15", shape: "round", capacity: 8, x: 45, y: 33 },
  { id: "t13", label: "Table 13", shape: "long", capacity: 12, x: 66, y: 31 },

  { id: "sweetheart", label: "Sweetheart", shape: "sweetheart", capacity: 2, x: 54, y: 45, isSweetheart: true },
  { id: "t12", label: "Table 12", shape: "long", capacity: 12, x: 76, y: 42 },

  { id: "t11", label: "Table 11", shape: "round", capacity: 12, x: 76, y: 56 },
  { id: "t9", label: "Table 9", shape: "round", capacity: 8, x: 44, y: 64 },
  { id: "t10", label: "Table 10", shape: "round", capacity: 8, x: 56, y: 64 },
  { id: "t8", label: "Table 8", shape: "long", capacity: 16, x: 24, y: 58 },

  { id: "t7", label: "Table 7", shape: "long", capacity: 16, x: 24, y: 71 },
  { id: "t3", label: "Table 3", shape: "long", capacity: 16, x: 78, y: 70, reservedForGroupId: "pete-les-friends" },

  { id: "t4", label: "Table 4", shape: "round", capacity: 8, x: 40, y: 80 },
  { id: "t5", label: "Table 5", shape: "round", capacity: 8, x: 53, y: 80 },
  { id: "t6", label: "Table 6", shape: "round", capacity: 8, x: 66, y: 82, reservedForGroupId: "pete-les-friends" },

  { id: "t1", label: "Table 1", shape: "round", capacity: 8, x: 45, y: 92 },
  { id: "t2", label: "Table 2", shape: "round", capacity: 8, x: 58, y: 92 },
];

export const DEFAULT_FEATURES: VenueFeature[] = [
  { id: "bar", label: "Bar", kind: "bar", x: 4, y: 6, w: 14, h: 6 },
  { id: "band", label: "Band", kind: "band", x: 6, y: 40, w: 12, h: 14 },
  { id: "dance", label: "Dance Floor", kind: "danceFloor", x: 30, y: 44, w: 16, h: 16 },
  { id: "restrooms", label: "Restrooms", kind: "restrooms", x: 4, y: 72, w: 14, h: 7 },
];
