import { describe, expect, it } from "vitest";
import { mapLegacyBooking, type PartyLookup } from "./legacy-bookings";

const CONTACTS: Record<string, string> = {
  "id:7": "c-ana",
  "name:mpet terminal (antwerp)": "c-mpet",
  "name:vrd transport": "c-vrd",
};
const party: PartyLookup = (id, name) =>
  CONTACTS[`id:${String(id)}`] ?? CONTACTS[`name:${String(name ?? "").toLowerCase()}`] ?? null;

const legacy = {
  ref: "SB2609014",
  status: "in_transit",
  kind: "Both",
  client: "ANA BVBA",
  clientId: 7,
  payeur: "ANA BVBA",
  payeurId: 7,
  shippingCo: "MPET Terminal (Antwerp)",
  consignee: "Somebody unknown",
  bookingNo: "MSC123",
  etd: "2026-09-30 18:00",
  siDocClosing: "2026-09-25",
  containerType: "40F HC",
  docs: [{ n: "a.pdf" }],
  containers: [
    {
      no: "msku 123456-7",
      seals: [{ no: "S1", by: "Trucker" }],
      hs: [{ code: "630900", weight: 21000, pkgQty: 400, pkgType: "Bales" }],
      tare: 3900,
      weight: 21000,
      loadAddr: "Rumst",
      loadDate: "2026-09-26",
      loadTime: "08:00",
      transporter: "VRD Transport",
      pickBackAt: "2026-09-26 15:30",
      stops: [{ addr: "Mechelen", date: "2026-09-26", time: "10:00" }],
      blDesc: "USED CLOTHING",
    },
  ],
  alerts: [{ sev: "red", text: "Hold at customs", resolved: false }],
};

describe("mapLegacyBooking", () => {
  it("keeps the SB number and reads the header, parties and dates", () => {
    const r = mapLegacyBooking(legacy, party);
    expect(r?.booking).toMatchObject({
      ref: "SB2609014",
      status: "in_transit",
      kind: "both",
      clientId: "c-ana",
      payerId: "c-ana",
      shippingCoId: "c-mpet",
      consigneeId: null,
      carrierBookingNo: "MSC123",
      etd: "2026-09-30",
      siClosing: "2026-09-25",
    });
    expect(r?.warnings).toEqual([
      'consignee "Somebody unknown" is not a contact — left empty',
      "1 file(s) on the booking are not carried by this step",
    ]);
  });

  it("carries each box: number, type, seals, goods, loading, trucker, pick-back, stops", () => {
    expect(mapLegacyBooking(legacy, party)?.containers[0]).toMatchObject({
      number: "MSKU1234567",
      type: "40HC",
      seals: ["S1"],
      hsLines: [{ code: "630900", weightKg: 21000, packages: 400, packageType: "Bales" }],
      tareKg: 3900,
      cargoKg: 21000,
      loadAddress: "Rumst",
      transporterId: "c-vrd",
      pickBackDate: "2026-09-26",
      pickBackTime: "15:30",
      stops: [{ address: "Mechelen", date: "2026-09-26", time: "10:00" }],
      blDescription: "USED CLOTHING",
    });
  });

  it("reads its alerts and a cancelled booking's reason", () => {
    expect(mapLegacyBooking(legacy, party)?.alerts).toEqual([
      { level: "urgent", text: "Hold at customs", resolved: false },
    ]);
    const c = mapLegacyBooking(
      {
        ref: "SB1",
        status: "cancelled",
        statusBefore: "confirmed",
        cancel: { reason: "Goods not ready" },
      },
      party,
    );
    expect(c?.booking).toMatchObject({
      cancelReasonLabel: "Goods not ready",
      statusBeforeCancel: "confirmed",
    });
  });

  it("gives an old booking without boxes one box from its container number; needs a reference", () => {
    expect(mapLegacyBooking({ ref: "SB2", containerNo: "TGHU1" }, party)?.containers).toHaveLength(
      1,
    );
    expect(mapLegacyBooking({}, party)).toBeNull();
  });
});
