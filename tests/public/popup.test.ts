import { describe, it, expect } from 'vitest';
import { popupIsCurrent } from '@/components/public/Interactions';
const popup = { title: 'Feriado', text: 'Aviso', active: true, startsAt: '2026-10-01T03:00:00Z', endsAt: '2026-10-02T03:00:00Z', version: 1, updatedAt: '' };
describe('notice UTC visibility window', () => {
  it('opens at start and stops exactly at the ending instant', () => {
    expect(popupIsCurrent(popup, Date.parse('2026-10-01T02:59:59Z'))).toBe(false);
    expect(popupIsCurrent(popup, Date.parse(popup.startsAt))).toBe(true);
    expect(popupIsCurrent(popup, Date.parse(popup.endsAt))).toBe(false);
    expect(popupIsCurrent({ ...popup, active: false }, Date.parse(popup.startsAt))).toBe(false);
    expect(popupIsCurrent({ ...popup, startsAt: 'invalid' }, Date.parse(popup.startsAt))).toBe(false);
  });
});
