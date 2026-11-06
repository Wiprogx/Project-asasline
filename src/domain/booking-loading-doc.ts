/**
 * Where, when and how each box of a booking is loaded, as the copies say it (legacy preview:
 * boxLoadAddr / boxWhen / boxMode2 per box, the client preview's "Loading / drop-off date").
 * A box under a drop mode is "Delivered on" and "Picked back on"; direct loading is a
 * "Loading date". Nothing is inherited between boxes (domain/loading boxLoading).
 */
import { addressLabel, type CopyBooking, type CopyBox, dash, type Row } from "./booking-doc";
import { boxLoading, isDropMode, type LoadingMode, type Stop, truckerCopyGaps } from "./loading";

const moment = (date: string | null | undefined, time: string | null | undefined) =>
  [date, time].filter(Boolean).join(" ");

/** A stop in one phrase: its place, when the truck is expected, how the box is handled, its pick-back. */
const stopWords = (st: Stop) =>
  [
    st.address,
    moment(st.date, st.time),
    st.loadingMode,
    st.pickBackDate && `picked back ${moment(st.pickBackDate, st.pickBackTime)}`,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * The trucker copy's loading card of one box: the empty's depot and day, the box's own details
 * (the booking's only when there is one box), the terminal the full box goes to, each stop and
 * the pick-back of a dropped box.
 */
export function loadingRows(
  b: CopyBooking,
  box: CopyBox,
  boxCount: number,
  modes: readonly LoadingMode[] = [],
): Row[] {
  const l = boxLoading({ ...b, boxCount }, box);
  const drop = isDropMode(modes, l.mode);
  return [
    ["Empty collected at", dash(b.pickupDepot)],
    ["Empty collected on", dash(b.pickupDate)],
    [addressLabel(b.kind), dash(l.address)],
    [drop ? "Delivered on" : "Loading date", moment(l.date, l.time) || "—"],
    ["Loading mode", dash(l.mode)],
    ["Trucker", dash(box.transporter)],
    ["Terminal", dash(b.terminal)],
    ...box.stops.map((st, k): Row => [`Stop ${k + 1}`, stopWords(st)]),
    ...(box.pickBackDate
      ? [["Picked back on", moment(box.pickBackDate, box.pickBackTime)] as Row]
      : []),
  ];
}

/** What keeps this box's copy from going out (domain/loading truckerCopyGaps). */
export const copyGaps = (b: CopyBooking, box: CopyBox, boxCount: number) =>
  truckerCopyGaps({ ...b, boxCount }, box);

/** The box as the driver needs it: its type and what is inside, by name — no weights, no seal. */
export function truckerBoxRows(b: CopyBooking, box: CopyBox): Row[] {
  return [
    ["Type", box.type],
    ["Commodity", dash(b.commodity)],
    ...box.hsLines.map((l): Row => [`HS ${l.code}`, dash(l.description)]),
  ];
}

/**
 * The customer copy's loading, every box on one card (legacy client preview): the places the
 * boxes load at, each box's moment — "Delivered on" when every box is dropped, "Loading date"
 * when none is — its mode with its pick-back, and its stops; a box is named by its number.
 */
export function customerLoadingRows(
  b: CopyBooking,
  boxes: readonly CopyBox[],
  modes: readonly LoadingMode[],
): Row[] {
  const n = boxes.length;
  const tag = (box: CopyBox, i: number) =>
    n > 1 ? `${box.number ?? `Container ${i + 1}`} — ` : "";
  const each = boxes.map((box, i) => {
    const l = boxLoading({ ...b, boxCount: n }, box);
    return { box, l, tag: tag(box, i), drop: isDropMode(modes, l.mode) };
  });
  const addresses = [...new Set(each.map((e) => e.l.address).filter(Boolean))];
  const drops = each.filter((e) => e.drop).length;
  const dateLabel =
    drops === 0 ? "Loading date" : drops === n ? "Delivered on" : "Loading / delivery date";
  const dates = each.map((e) => e.tag + (moment(e.l.date, e.l.time) || "—"));
  const modeWords = each.map(
    (e) =>
      e.tag +
      dash(e.l.mode) +
      (e.box.pickBackDate
        ? ` · picked back on ${moment(e.box.pickBackDate, e.box.pickBackTime)}`
        : ""),
  );
  const stops = each.flatMap((e) =>
    e.box.stops.map((st, k): Row => [`${e.tag}Stop ${k + 1}`, stopWords(st)]),
  );
  return [
    [addressLabel(b.kind), addresses.join("\n\n") || "—"],
    [dateLabel, dates.join("\n") || "—"],
    ["Loading mode", modeWords.join("\n") || "—"],
    ...stops,
  ];
}
