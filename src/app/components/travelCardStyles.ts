export const TRAVEL_CARD_RADIUS = '12px';

export const travelCardRadiusStyle = {
  borderRadius: TRAVEL_CARD_RADIUS,
};

export function getCompactLocationLabel(location?: string) {
  if (!location) return '';

  const parts = location.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join(' ');
}
