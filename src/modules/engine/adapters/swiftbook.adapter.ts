import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { SWIFTBOOK_SELECTORS } from '../../../config/swiftbook-selectors';
import { AdapterResult, ScrapedRoomPrice, SiteAdapter } from '../site-adapter.interface';

export interface SwiftbookSiteConfig {
  baseUrl: string; // e.g. "https://www.swiftbook.io/inst/#/home"
  propertyId: string;
  gsId?: string;
  roomIds: string[];
  /** Fixed dates to watch. Omit both to watch a rolling "tonight -> tomorrow" window. */
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
  adults?: number;
  rooms?: number;
}

function rollingDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function buildUrl(cfg: SwiftbookSiteConfig): string {
  const checkIn = cfg.checkIn ?? rollingDate(0);
  const checkOut = cfg.checkOut ?? rollingDate(1);
  const params = new URLSearchParams({
    propertyId: cfg.propertyId,
    checkIn,
    checkOut,
    RoomID: cfg.roomIds.join(','),
    noofrooms: String(cfg.rooms ?? 1),
    adult0: String(cfg.adults ?? 2),
    child0: '0',
    ...(cfg.gsId ? { gsId: cfg.gsId } : {}),
  });
  // Swiftbook's widget uses hash routing (`#/home?...`) — the query string has to be
  // appended after the hash fragment, not before it.
  return `${cfg.baseUrl}?${params.toString()}`;
}

/**
 * Swiftbook — a public booking widget, no hotelier login required. We just load the
 * property's page with the right query params and read whatever prices it renders.
 * Lower account-risk than GoMMT by construction: there's no account to restrict.
 */
@Injectable()
export class SwiftbookAdapter implements SiteAdapter {
  readonly siteType = 'swiftbook';
  readonly requiresLogin = false;
  private readonly logger = new Logger(SwiftbookAdapter.name);

  async open(page: Page, siteConfig: Record<string, unknown>): Promise<AdapterResult> {
    try {
      const url = buildUrl(siteConfig as unknown as SwiftbookSiteConfig);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(SWIFTBOOK_SELECTORS.loadedIndicator, { timeout: 20000 });
      return { status: 'active' };
    } catch (err) {
      this.logger.error(`Failed to open Swiftbook widget: ${(err as Error).message}`);
      return { status: 'login_failed', error: (err as Error).message };
    }
  }

  async scrapePrices(page: Page, siteConfig: Record<string, unknown>): Promise<ScrapedRoomPrice[]> {
    const cfg = siteConfig as unknown as SwiftbookSiteConfig;
    const url = buildUrl(cfg);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(SWIFTBOOK_SELECTORS.loadedIndicator, { timeout: 20000 });

    const stayDate = cfg.checkIn ?? rollingDate(0);
    const cards = page.locator(SWIFTBOOK_SELECTORS.roomCard);
    const count = await cards.count();
    const results: ScrapedRoomPrice[] = [];

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const roomType = (await card.locator(SWIFTBOOK_SELECTORS.roomTypeLabel).textContent()) ?? '';
      const priceText = (await card.locator(SWIFTBOOK_SELECTORS.roomPriceValue).textContent()) ?? '0';
      const soldOut = await card.locator(SWIFTBOOK_SELECTORS.roomSoldOutBadge).isVisible().catch(() => false);

      results.push({
        roomType: roomType.trim(),
        stayDate,
        price: Number(priceText.replace(/[^\d.]/g, '')) || 0,
        soldOut,
      });
    }

    return results;
  }
}
