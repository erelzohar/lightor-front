// The two ways a visitor gets to the business: Google Maps, and Waze, which
// most drivers in Israel use (LT-320 — a tester: "Waze is better").
export const googleMapsHref = (address: string): string =>
  `https://maps.google.com/?q=${encodeURIComponent(address)}`;

export const wazeHref = (address: string): string =>
  `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
