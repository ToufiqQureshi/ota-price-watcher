/**
 * Swiftbook is a public booking widget (no login) — the property, dates, and room IDs are
 * just query params on the URL, e.g.:
 * https://www.swiftbook.io/inst/#/home?propertyId=...&checkIn=2026-08-27&checkOut=2026-08-28&RoomID=155898,...
 *
 * Every selector below is a placeholder — this environment's network policy blocks
 * fetching swiftbook.io directly, so these were never checked against the live DOM.
 * Open the real widget in a browser, inspect the room-rate cards, and replace these
 * before running against it. It's likely a JS-rendered SPA (hash routing, `#/home`), so
 * scrapePrices() may need a `page.waitForSelector` on the first real room card before
 * reading — the placeholder below already does that.
 */
export const SWIFTBOOK_SELECTORS = {
  roomCard: '[data-testid="room-card"]', // TODO: confirm real selector
  roomTypeLabel: '.room-name', // TODO
  roomPriceValue: '.room-price-amount', // TODO
  roomSoldOutBadge: '.sold-out', // TODO
  loadedIndicator: '[data-testid="room-card"]', // element that proves the widget finished loading
} as const;
