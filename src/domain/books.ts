/**
 * Closed periods (legacy lockGuard): once the books are closed through a day, nothing dated on
 * or before it can be issued, recorded, paid or reversed — a filed VAT return or a finished
 * year never changes underneath the accountant. The close only moves forward.
 */
export function lockProblem(day: string, closedThrough: string | null): string | null {
  return closedThrough && day <= closedThrough
    ? `The books are closed through ${closedThrough}; date it after that day.`
    : null;
}

export function closeProblem(
  through: string,
  closedThrough: string | null,
  today: string,
): string | null {
  if (through >= today) return "Only a day in the past can be closed.";
  if (closedThrough && through <= closedThrough)
    return `The books are already closed through ${closedThrough}; a close never moves back.`;
  return null;
}
