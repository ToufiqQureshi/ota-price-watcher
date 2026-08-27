import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { GOMMT_SELECTORS } from '../../../config/gommt-selectors';
import { AdapterResult, ScrapedRoomPrice, SiteAdapter } from '../site-adapter.interface';

/**
 * GoMMT (MakeMyTrip/Goibibo) Extranet — a hotelier's own dashboard, login-gated behind
 * username/password + OTP. All selectors live in config/gommt-selectors.ts; they are
 * placeholders until filled in against the real extranet UI.
 */
@Injectable()
export class GommtAdapter implements SiteAdapter {
  readonly siteType = 'gommt';
  readonly requiresLogin = true;
  private readonly logger = new Logger(GommtAdapter.name);

  async login(page: Page, _siteConfig: Record<string, unknown>, username: string, password: string): Promise<AdapterResult> {
    try {
      await page.goto(GOMMT_SELECTORS.loginUrl, { waitUntil: 'domcontentloaded' });

      const alreadyIn = await page
        .locator(GOMMT_SELECTORS.postLoginSelector)
        .isVisible()
        .catch(() => false);
      if (alreadyIn) return { status: 'active' };

      await page.fill(GOMMT_SELECTORS.usernameInput, username);
      await page.fill(GOMMT_SELECTORS.passwordInput, password);
      await page.click(GOMMT_SELECTORS.loginSubmitButton);

      await page.waitForSelector(GOMMT_SELECTORS.otpInput, { timeout: 15000 });
      return { status: 'otp_required' };
    } catch (err) {
      this.logger.error(`Login failed: ${(err as Error).message}`);
      return { status: 'login_failed', error: (err as Error).message };
    }
  }

  async submitOtp(page: Page, otp: string): Promise<AdapterResult> {
    try {
      await page.fill(GOMMT_SELECTORS.otpInput, otp);
      await page.click(GOMMT_SELECTORS.otpSubmitButton);
      await page.waitForSelector(GOMMT_SELECTORS.postLoginSelector, { timeout: 15000 });
      return { status: 'active' };
    } catch (err) {
      this.logger.error(`OTP submit failed: ${(err as Error).message}`);
      return { status: 'login_failed', error: (err as Error).message };
    }
  }

  async scrapePrices(page: Page): Promise<ScrapedRoomPrice[]> {
    await page.goto(GOMMT_SELECTORS.ratesInventoryUrl, { waitUntil: 'domcontentloaded' });
    const rows = page.locator(GOMMT_SELECTORS.roomRow);
    const count = await rows.count();
    const results: ScrapedRoomPrice[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const roomType = (await row.locator(GOMMT_SELECTORS.roomTypeLabel).textContent()) ?? '';
      const priceText = (await row.locator(GOMMT_SELECTORS.roomPriceValue).textContent()) ?? '0';
      const soldOut = await row.locator(GOMMT_SELECTORS.roomSoldOutBadge).isVisible().catch(() => false);
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
