"use client";

import type { Table } from "@/lib/types";

export interface SeatPerson {
  id: string;
  name: string;
  color: string;
}

/**
 * Shows how a table is actually seated: round tables render guests in a ring,
 * long tables render two facing rows (so you can see who's across from whom).
 * Empty seats are shown faintly up to the table's capacity.
 */
export default function SeatMap({
  table,
  people,
}: {
  table: Table;
  people: SeatPerson[];
}) {
  const count = Math.max(table.capacity, people.length, 1);
  const seats: (SeatPerson | null)[] = Array.from(
    { length: count },
    (_, i) => people[i] ?? null,
  );
  const label = table.isSweetheart ? "💕" : table.label.replace("Table ", "T");

  return table.shape === "long" ? (
    <LongSeatMap label={label} seats={seats} />
  ) : (
    <RoundSeatMap label={label} seats={seats} />
  );
}

function Dot({ color }: { color?: string }) {
  return (
    <span
      className="h-3.5 w-3.5 shrink-0 rounded-full border"
      style={{ backgroundColor: color ?? "transparent", borderColor: color ?? "#e3c3d4" }}
    />
  );
}

function RoundSeatMap({
  label,
  seats,
}: {
  label: string;
  seats: (SeatPerson | null)[];
}) {
  const n = Math.max(seats.length, 1);
  const big = n > 8;
  const box = big ? 440 : 340;
  const center = box / 2;
  const rDot = center - (big ? 96 : 84);
  const tableD = big ? 124 : 104;

  return (
    <div className="mx-auto" style={{ width: box, height: box, position: "relative" }}>
      <div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-rose/40 bg-blush/40"
        style={{ width: tableD, height: tableD }}
      >
        <span className="font-serif text-base font-semibold text-rose">{label}</span>
      </div>
      {seats.map((s, i) => {
        const a = (-90 + (i * 360) / n) * (Math.PI / 180);
        const x = center + rDot * Math.cos(a);
        const y = center + rDot * Math.sin(a);
        const right = Math.cos(a) >= -0.01;
        return (
          <div
            key={i}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1"
            style={{ left: x, top: y, flexDirection: right ? "row" : "row-reverse" }}
          >
            <Dot color={s?.color} />
            <span
              className={`whitespace-nowrap text-[11px] ${
                s ? "font-medium" : "italic opacity-40"
              }`}
            >
              {s ? s.name : "open"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LongSeatMap({
  label,
  seats,
}: {
  label: string;
  seats: (SeatPerson | null)[];
}) {
  const cols = Math.max(Math.ceil(seats.length / 2), 1);
  const pairs = Array.from({ length: cols }, (_, j) => ({
    top: seats[2 * j] ?? null,
    bottom: seats[2 * j + 1] ?? null,
  }));

  return (
    <div className="mx-auto w-full overflow-x-auto">
      <div className="mx-auto min-w-fit">
        <SeatRow seats={pairs.map((p) => p.top)} dotsBelow />
        <div className="my-1 flex items-center justify-center rounded-lg border-2 border-rose/40 bg-blush/40 py-2 font-serif text-sm font-semibold text-rose">
          {label}
        </div>
        <SeatRow seats={pairs.map((p) => p.bottom)} />
      </div>
    </div>
  );
}

function SeatRow({
  seats,
  dotsBelow,
}: {
  seats: (SeatPerson | null)[];
  dotsBelow?: boolean;
}) {
  return (
    <div className="flex justify-center gap-1">
      {seats.map((s, i) => (
        <div
          key={i}
          className={`flex w-16 items-center gap-0.5 ${
            dotsBelow ? "flex-col-reverse" : "flex-col"
          }`}
        >
          <Dot color={s?.color} />
          <span
            className={`text-center text-[10px] leading-tight ${
              s ? "font-medium" : "italic opacity-40"
            }`}
          >
            {s ? s.name : "open"}
          </span>
        </div>
      ))}
    </div>
  );
}
