// Core data model. Engine, store, and UI all import from here.
// Keep this file stable — it is the shared contract between workstreams.

export type GroupId = string;
export type PartyId = string;
export type GuestId = string;
export type SubgroupId = string;
export type TableId = string;
export type ScenarioId = string;

export type TableShape = "round" | "long" | "sweetheart";

/** A single attending person. */
export interface Guest {
  id: GuestId;
  firstName: string;
  lastName: string;
  groupId: GroupId;
  partyId: PartyId;
  subgroupId?: SubgroupId | null;
  attending: boolean;
}

/**
 * The atomic "keep together" unit (a couple/family that RSVP'd together).
 * Auto-fill never splits a party across tables.
 */
export interface Party {
  id: PartyId;
  label: string; // e.g. "Alex Jarrah & Annika Barth"
  groupId: GroupId;
  subgroupId?: SubgroupId | null;
  guestIds: GuestId[];
  size: number; // number of attending guests in this party
}

/** One of the top-level guest categories. */
export interface Group {
  id: GroupId;
  name: string;
  color: string; // hex, for color-coding
  isPlaceholder: boolean; // managed by the mother-in-law
  isCouple: boolean; // Matt + Ian (the sweetheart table)
  order: number;
}

/** A named subset of a group, so big groups can be split intentionally. */
export interface Subgroup {
  id: SubgroupId;
  groupId: GroupId;
  name: string;
  order: number;
}

/** Non-table venue elements (band, dance floor, etc.) for floor-plan realism. */
export interface VenueFeature {
  id: string;
  label: string;
  kind: "band" | "danceFloor" | "bar" | "restrooms" | "other";
  x: number; // normalized 0..100 (top-left)
  y: number;
  w: number;
  h: number;
}

/** A table on the floor plan. x/y are normalized 0..100 of the floor area (center). */
export interface Table {
  id: TableId;
  label: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  reservedForGroupId?: GroupId | null;
  isSweetheart?: boolean;
}

export interface Assignment {
  tableId: TableId;
  locked?: boolean; // locked assignments are preserved by auto-fill
}

/** A named arrangement. Only assignments differ between scenarios. */
export interface Scenario {
  id: ScenarioId;
  name: string;
  assignments: Record<PartyId, Assignment>;
  createdAt: number;
  updatedAt: number;
}

export const SCHEMA_VERSION = 1;

/** The entire shared document, persisted as one JSON blob keyed by planId. */
export interface PlanDoc {
  planId: string;
  schemaVersion: number;
  version: number; // optimistic-concurrency counter, bumped on each write
  coupleName: string;
  guests: Guest[];
  parties: Party[];
  groups: Group[];
  subgroups: Subgroup[];
  tables: Table[];
  features: VenueFeature[];
  scenarios: Scenario[];
  activeScenarioId: ScenarioId;
  updatedAt: number;
}
