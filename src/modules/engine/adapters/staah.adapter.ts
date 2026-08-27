import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { STAAH_SELECTORS } from '../../../config/staah-selectors';
import { waitForEitherSelector } from '../../../common/wait-for-either.util';
import { AdapterResult, ScrapedRoomPrice, SiteAdapter } from '../site-adapter.interface';

export interface StaahSiteConfig {
  propertyId: string;
}

/**
 * STAAH channel manager — hotelier login (superadmin dashboard) gates access to a list
 * of properties; each property has its own rates/inventory page, selected here via
 * siteConfig.propertyId.
 */
@Injectable()
export class StaahAdapter implements SiteAdapter {
  readonly siteType = 'staah';
  readonly requiresLogin = true;
  private readonly logger = new Logger(StaahAdapter.name);

  async login(page: Page, _siteConfig: Record<string, unknown>, username: string, password: string): Promise<AdapterResult> {
    try {
      await page.goto(STAAH_SELECTORS.loginUrl, { waitUntil: 'domcontentloaded' });

      const alreadyIn = await page
        .locator(STAAH_SELECTORS.postLoginSelector)
        .isVisible()
        .catch(() => false);
      if (alreadyIn) return { status: 'active' };

      await page.fill(STAAH_SELECTORS.usernameInput, username);
      await page.fill(STAAH_SELECTORS.passwordInput, password);
      await page.click(STAAH_SELECTORS.loginSubmitButton);

      // Not every STAAH account is OTP-gated — race the OTP field against the
      // post-login anchor instead of assuming OTP always shows up.
      const matched = await waitForEitherSelector(
        page,
        [STAAH_SELECTORS.otpInput, STAAH_SELECTORS.postLoginSelector],
        15000,
      );
      return { status: matched === 0 ? 'otp_required' : 'active' };
    } catch (err) {
      this.logger.error(`Login failed: ${(err as Error).message}`);
      return { status: 'login_failed', error: (err as Error).message };
    }
  }

  async submitOtp(page: Page, otp: string): Promise<AdapterResult> {
    try {
      await page.fill(STAAH_SELECTORS.otpInput, otp);
      await page.click(STAAH_SELECTORS.otpSubmitButton);
      await page.waitForSelector(STAAH_SELECTORS.postLoginSelector, { timeout: 15000 });
      return { status: 'active' };
    } catch (err) {
      this.logger.error(`OTP submit failed: ${(err as Error).message}`);
      return { status: 'login_failed', error: (err as Error).message };
    }
  }

  async scrapePrices(page: Page, siteConfig: Record<string, unknown>): Promise<ScrapedRoomPrice[]> {
    const cfg = siteConfig as unknown as StaahSiteConfig;
    if (!cfg.propertyId) throw new Error('staah siteConfig requires propertyId');

    const url = STAAH_SELECTORS.propertyRatesUrlTemplate.replace('{propertyId}', cfg.propertyId);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const rows = page.locator(STAAH_SELECTORS.roomRow);
    const count = await rows.count();
    const results: ScrapedRoomPrice[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const roomType = (await row.locator(STAAH_SELECTORS.roomTypeLabel).textContent()) ?? '';
      const priceText = (await row.locator(STAAH_SELECTORS.roomPriceValue).textContent()) ?? '0';
      const soldOut = await row.locator(STAAH_SELECTORS.roomSoldOutBadge).isVisible().catch(() => false);
      const stayDate = (await row.getAttribute('data-stay-date')) ?? '';

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
