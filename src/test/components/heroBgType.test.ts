import { describe, it, expect } from 'vitest';
import { resolveVantaType } from '../../components/Layout/Hero';

/** LT-227 — a bgType with no Vanta importer crashed the hero ("j8[S] is not a function"). */
describe('resolveVantaType', () => {
  it('keeps every effect we can load', () => {
    for (const t of ['clouds', 'fog', 'clouds2', 'topology', 'trunk', 'birds', 'net']) {
      expect(resolveVantaType(t)).toBe(t);
    }
  });

  it('renders fog for gradient, missing, empty, unsupported and prototype names', () => {
    for (const t of ['gradient', undefined, null, '', 'rings', 'waves', 'toString', '__proto__']) {
      expect(resolveVantaType(t)).toBe('fog');
    }
  });
});
