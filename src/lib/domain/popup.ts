import type { PopupSettings } from './types';

export function popupIsCurrent(popup: PopupSettings, now: number): boolean {
  const start = popup.startsAt ? Date.parse(popup.startsAt) : null;
  const end = popup.endsAt ? Date.parse(popup.endsAt) : null;
  return popup.active && (start === null || Number.isFinite(start) && now >= start) && (end === null || Number.isFinite(end) && now < end);
}
