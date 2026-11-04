"use client";

import { createContext, useContext } from "react";

/**
 * The prefix of the catalogue form's field ids. Two forms can sit on one page — the item and
 * its copy in the Duplicate dialog — and two fields with one id would make a label point at
 * the wrong field; each form gives its own.
 */
export const FieldPrefix = createContext("ri");

/** `fid("name")` → the id of that field in this form. */
export function useFieldId() {
  const prefix = useContext(FieldPrefix);
  return (name: string) => `${prefix}-${name}`;
}
