"use client";

import { createContext, type ReactNode, useContext } from "react";

export type PlaceMade = { value: string; label: string };

/**
 * How a form lends its "+ New location" dialog what it needs: the customer chosen (to link
 * the new place to) and what to do with the place made. A page renders the dialog as an
 * element — a function would not cross from a server page to a client form — and the form
 * places it inside this context wherever a place is picked.
 */
export const PlaceSlot = createContext<{
  clientId: string | null;
  onMade: (place: PlaceMade) => void;
}>({ clientId: null, onMade: () => {} });

export const usePlaceSlot = () => useContext(PlaceSlot);

export function PlaceSlotProvider({
  clientId,
  onMade,
  children,
}: {
  clientId: string | null;
  onMade: (place: PlaceMade) => void;
  children: ReactNode;
}) {
  return <PlaceSlot.Provider value={{ clientId, onMade }}>{children}</PlaceSlot.Provider>;
}
