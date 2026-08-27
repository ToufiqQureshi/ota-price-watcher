/**
 * All DOM selectors / URLs for GoMMT Extranet live here, not scattered in engine.service.ts.
 * GoMMT changes their frontend without notice — when scraping breaks, this is the one file
 * to fix. Every value below is a placeholder: open the real extranet in a browser, inspect
 * the actual elements, and replace these before running against a live account.
 */
export const GOMMT_SELECTORS = {
  loginUrl: 'https://extranet.goibibo.com/login', // TODO: confirm real login URL
  usernameInput: 'input[name="username"]', // TODO
  passwordInput: 'input[name="password"]', // TODO
  loginSubmitButton: 'button[type="submit"]', // TODO
  otpInput: 'input[name="otp"]', // TODO
  otpSubmitButton: 'button[data-testid="otp-submit"]', // TODO
  postLoginSelector: '[data-testid="dashboard-home"]', // element that proves login succeeded

  ratesInventoryUrl: 'https://extranet.goibibo.com/rates-inventory', // TODO
  roomRow: '[data-testid="room-rate-row"]', // one row per room type/date
  roomTypeLabel: '.room-type-name',
  roomPriceValue: '.room-price',
  roomSoldOutBadge: '.sold-out-badge',
} as const;
