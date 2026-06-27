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
  // Top row
  { id: "t20", label: "Table 20", shape: "round", capacity: 8, x: 47, y: 11 },
  { id: "t19", label: "Table 19", shape: "round", capacity: 8, x: 58, y: 9 },

  // Long 12-tops up top (in-law reserved)
  { id: "t17", label: "Table 17", shape: "long", capacity: 12, x: 39, y: 18, reservedForGroupId: "higgins-family-friends" },
  { id: "t18", label: "Table 18", shape: "long", capacity: 12, x: 58, y: 17, reservedForGroupId: "higgins-side" },

  // Third row
  { id: "t16", label: "Table 16", shape: "round", capacity: 8, x: 40, y: 27 },
  { id: "t15", label: "Table 15", shape: "round", capacity: 8, x: 53, y: 26 },
  { id: "t14", label: "Table 14", shape: "round", capacity: 12, x: 68, y: 25 },

  // Long 12-tops just right of the dance floor (13 above 12)
  { id: "t13", label: "Table 13", shape: "long", capacity: 12, x: 66, y: 36 },
  { id: "t12", label: "Table 12", shape: "long", capacity: 12, x: 66, y: 46 },

  // Mid round tables
  { id: "t9", label: "Table 9", shape: "round", capacity: 8, x: 43, y: 57 },
  { id: "t10", label: "Table 10", shape: "round", capacity: 8, x: 57, y: 57 },
  { id: "t11", label: "Table 11", shape: "round", capacity: 12, x: 76, y: 56 },

  // Honeymoon (sweetheart) table — all the way to the right
  { id: "sweetheart", label: "Sweetheart", shape: "sweetheart", capacity: 2, x: 89, y: 42, isSweetheart: true },

  // Long 16-tops (middle row)
  { id: "t8", label: "Table 8", shape: "long", capacity: 16, x: 43, y: 66 },
  { id: "t7", label: "Table 7", shape: "long", capacity: 16, x: 64, y: 66 },

  // Lower round tables
  { id: "t4", label: "Table 4", shape: "round", capacity: 8, x: 55, y: 73 },
  { id: "t5", label: "Table 5", shape: "round", capacity: 8, x: 67, y: 73 },
  { id: "t6", label: "Table 6", shape: "round", capacity: 8, x: 80, y: 72, reservedForGroupId: "pete-les-friends" },

  // Long 16-top (bottom, in-law reserved)
  { id: "t3", label: "Table 3", shape: "long", capacity: 16, x: 72, y: 81, reservedForGroupId: "pete-les-friends" },

  // Bottom row
  { id: "t1", label: "Table 1", shape: "round", capacity: 8, x: 69, y: 90 },
  { id: "t2", label: "Table 2", shape: "round", capacity: 8, x: 82, y: 89 },
];

export const DEFAULT_FEATURES: VenueFeature[] = [
  { id: "bar", label: "Bar", kind: "bar", x: 3, y: 4, w: 12, h: 5 },
  { id: "band", label: "Band", kind: "band", x: 16, y: 33, w: 15, h: 20 },
  { id: "dance", label: "Dance Floor", kind: "danceFloor", x: 35, y: 31, w: 23, h: 22 },
  { id: "restrooms", label: "Restrooms", kind: "restrooms", x: 4, y: 60, w: 16, h: 8 },
];
