/**
 * LT-119: where the booking band goes. It used to be spliced directly above
 * the schedule on every site — a CTA that says "pick a service and time"
 * immediately above the widget that does exactly that is redundant, and its
 * fixed position was one more thing every vibe site had in common.
 *
 * Returns the insertion index into `keys` for the band, chosen by the
 * seeded unit draw from every slot EXCEPT: before the first section (the
 * hero opens the page), directly above the schedule, and directly below it.
 * `null` when no such slot exists (a two-section page).
 */
export const pickBandSlot = (keys: string[], draw: number): number | null => {
  const sIdx = keys.indexOf('schedule');
  const slots: number[] = [];
  for (let i = 1; i <= keys.length; i++) {
    if (sIdx !== -1 && (i === sIdx || i === sIdx + 1)) continue;
    slots.push(i);
  }
  if (!slots.length) return null;
  const u = Number.isFinite(draw) ? Math.min(Math.max(draw, 0), 0.999999) : 0;
  return slots[Math.floor(u * slots.length)];
};
