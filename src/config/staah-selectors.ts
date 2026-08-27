/**
 * STAAH (v2.staah.net) — a channel manager. Hotelier logs into a superadmin dashboard
 * that lists their properties (`/superadmin/properties`), then drills into one to see
 * its rates/inventory. Every value below is a placeholder — this environment's network
 * policy blocks v2.staah.net, so none of this has been checked against the live DOM.
 * Open the real dashboard in a browser, log in, inspect the login form, OTP field (if
 * any — some STAAH accounts may not require one), and the rates page for one property,
 * then replace these.
 */
export const STAAH_SELECTORS = {
  loginUrl: 'https://v2.staah.net/login', // TODO: confirm real login URL
  usernameInput: 'input[name="username"]', // TODO
  passwordInput: 'input[name="password"]', // TODO
  loginSubmitButton: 'button[type="submit"]', // TODO
  otpInput: 'input[name="otp"]', // TODO — omitted from the race if this account never sees OTP
  otpSubmitButton: 'button[data-testid="otp-submit"]', // TODO
  // Proves login succeeded — the properties list itself is a reasonable anchor.
  postLoginSelector: '[data-testid="properties-list"]', // TODO

  // {propertyId} is substituted from siteConfig at scrape time.
  propertyRatesUrlTemplate: 'https://v2.staah.net/superadmin/properties/{propertyId}/rates', // TODO
  roomRow: '[data-testid="room-rate-row"]', // TODO
  roomTypeLabel: '.room-type-name',
  roomPriceValue: '.room-price',
  roomSoldOutBadge: '.sold-out-badge',
} as const;
