import { Page } from 'playwright';

export interface ScrapedRoomPrice {
  roomType: string;
  stayDate: string;
  price: number;
  soldOut: boolean;
}

export type LoginStatus = 'otp_required' | 'active' | 'login_failed';

export interface AdapterResult {
  status: LoginStatus;
  error?: string;
}

/**
 * One adapter per watched site (GoMMT Extranet, Swiftbook, ...). EngineService owns the
 * browser/context/page lifecycle and is site-agnostic; everything site-specific — URLs,
 * DOM selectors, whether login is even required — lives in the adapter. Adding a new site
 * means adding one adapter here, nothing in EngineService or the price/session modules
 * needs to change.
 */
export interface SiteAdapter {
  readonly siteType: string;

  /** Sites like GoMMT Extranet need a logged-in hotelier session before anything can be read. */
  readonly requiresLogin: boolean;

  /** Login-required sites: navigate to the login page and submit credentials. */
  login?(page: Page, siteConfig: Record<string, unknown>, username: string, password: string): Promise<AdapterResult>;

  /** Login-required sites: complete the OTP step that follows login. */
  submitOtp?(page: Page, otp: string): Promise<AdapterResult>;

  /** No-login (public) sites: just navigate to the property's page and confirm it loaded. */
  open?(page: Page, siteConfig: Record<string, unknown>): Promise<AdapterResult>;

  /** Read the currently displayed room prices/availability off the page. */
  scrapePrices(page: Page, siteConfig: Record<string, unknown>): Promise<ScrapedRoomPrice[]>;
}
