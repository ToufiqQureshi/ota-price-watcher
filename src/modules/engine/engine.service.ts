import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Browser, BrowserContext, chromium } from 'playwright';
import { GOMMT_SELECTORS } from '../../config/gommt-selectors';

export interface ScrapedRoomPrice {
  roomType: string;
  stayDate: string;
  price: number;
  soldOut: boolean;
}

export interface LoginResult {
  status: 'otp_required' | 'active' | 'login_failed';
  error?: string;
}

/**
 * Owns the one browser context per hotel session — mirrors OpenWA's engine layer,
 * which drives whatsapp-web.js/baileys instead of GoMMT Extranet. One context is kept
 * alive per active session and reused for polling, so we pay the login cost once and
 * every subsequent scrape is a lightweight navigation, not a fresh login.
 */
@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);
  private browser: Browser | null = null;
  private readonly contexts = new Map<string, BrowserContext>();

  constructor(private readonly config: ConfigService) {}

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.config.get<boolean>('playwrightHeadless'),
      });
    }
    return this.browser;
  }

  async startLogin(
    sessionId: string,
    username: string,
    password: string,
    storageState?: string,
  ): Promise<LoginResult> {
    const browser = await this.getBrowser();
    const context = await browser.newContext(
      storageState ? { storageState: JSON.parse(storageState) } : {},
    );
    this.contexts.set(sessionId, context);
    const page = await context.newPage();

    try {
      await page.goto(GOMMT_SELECTORS.loginUrl, { waitUntil: 'domcontentloaded' });

      // Already-valid storage state may skip the login form entirely.
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
      this.logger.error(`Login failed for session ${sessionId}: ${(err as Error).message}`);
      return { status: 'login_failed', error: (err as Error).message };
    }
  }

  async submitOtp(sessionId: string, otp: string): Promise<LoginResult> {
    const context = this.contexts.get(sessionId);
    if (!context) return { status: 'login_failed', error: 'No active login context for session' };
    const page = context.pages()[0] ?? (await context.newPage());

    try {
      await page.fill(GOMMT_SELECTORS.otpInput, otp);
      await page.click(GOMMT_SELECTORS.otpSubmitButton);
      await page.waitForSelector(GOMMT_SELECTORS.postLoginSelector, { timeout: 15000 });
      return { status: 'active' };
    } catch (err) {
      this.logger.error(`OTP submit failed for session ${sessionId}: ${(err as Error).message}`);
      return { status: 'login_failed', error: (err as Error).message };
    }
  }

  async saveStorageState(sessionId: string): Promise<string | null> {
    const context = this.contexts.get(sessionId);
    if (!context) return null;
    const state = await context.storageState();
    return JSON.stringify(state);
  }

  async scrapePrices(sessionId: string): Promise<ScrapedRoomPrice[]> {
    const context = this.contexts.get(sessionId);
    if (!context) throw new Error(`No active browser context for session ${sessionId}`);
    const page = context.pages()[0] ?? (await context.newPage());

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

  async closeSession(sessionId: string): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (context) {
      await context.close();
      this.contexts.delete(sessionId);
    }
  }
}
