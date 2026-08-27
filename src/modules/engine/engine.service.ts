import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Browser, BrowserContext, chromium } from 'playwright';
import { AdapterRegistryService } from './adapter-registry.service';
import { AdapterResult, ScrapedRoomPrice } from './site-adapter.interface';

/**
 * Owns the one browser context per watched session — mirrors OpenWA's engine layer,
 * which drives whatsapp-web.js/baileys instead of a hotel booking site. This class is
 * site-agnostic: it manages browser/context/page lifecycle and delegates every
 * site-specific step (URLs, selectors, whether login is even required) to whichever
 * SiteAdapter matches the session's siteType. One context is kept alive per active
 * session and reused for polling, so login (where required) happens once.
 */
@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);
  private browser: Browser | null = null;
  private readonly contexts = new Map<string, BrowserContext>();

  constructor(
    private readonly config: ConfigService,
    private readonly adapters: AdapterRegistryService,
  ) {}

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.config.get<boolean>('playwrightHeadless'),
      });
    }
    return this.browser;
  }

  private async getOrCreateContext(sessionId: string, storageState?: string): Promise<BrowserContext> {
    let context = this.contexts.get(sessionId);
    if (!context) {
      const browser = await this.getBrowser();
      context = await browser.newContext(storageState ? { storageState: JSON.parse(storageState) } : {});
      this.contexts.set(sessionId, context);
    }
    return context;
  }

  /**
   * Starts a session for a given site: for login-required sites this drives the login
   * form (and returns 'otp_required' if a follow-up OTP step is needed); for public
   * sites this just opens the property's page and confirms it loaded.
   */
  async startSession(
    sessionId: string,
    siteType: string,
    siteConfig: Record<string, unknown>,
    credentials?: { username: string; password: string },
    storageState?: string,
  ): Promise<AdapterResult> {
    const adapter = this.adapters.get(siteType);
    const context = await this.getOrCreateContext(sessionId, storageState);
    const page = context.pages()[0] ?? (await context.newPage());

    if (!adapter.requiresLogin) {
      if (!adapter.open) throw new Error(`Adapter ${siteType} has no open() but requiresLogin=false`);
      return adapter.open(page, siteConfig);
    }
    if (!adapter.login || !credentials) {
      return { status: 'login_failed', error: `${siteType} requires credentials` };
    }
    return adapter.login(page, siteConfig, credentials.username, credentials.password);
  }

  async submitOtp(sessionId: string, siteType: string, otp: string): Promise<AdapterResult> {
    const adapter = this.adapters.get(siteType);
    const context = this.contexts.get(sessionId);
    if (!context) return { status: 'login_failed', error: 'No active browser context for session' };
    if (!adapter.submitOtp) return { status: 'login_failed', error: `${siteType} has no OTP step` };

    const page = context.pages()[0] ?? (await context.newPage());
    return adapter.submitOtp(page, otp);
  }

  async saveStorageState(sessionId: string): Promise<string | null> {
    const context = this.contexts.get(sessionId);
    if (!context) return null;
    const state = await context.storageState();
    return JSON.stringify(state);
  }

  async scrapePrices(
    sessionId: string,
    siteType: string,
    siteConfig: Record<string, unknown>,
  ): Promise<ScrapedRoomPrice[]> {
    const adapter = this.adapters.get(siteType);
    const context = this.contexts.get(sessionId);
    if (!context) throw new Error(`No active browser context for session ${sessionId}`);
    const page = context.pages()[0] ?? (await context.newPage());
    return adapter.scrapePrices(page, siteConfig);
  }

  async closeSession(sessionId: string): Promise<void> {
    const context = this.contexts.get(sessionId);
    if (context) {
      await context.close();
      this.contexts.delete(sessionId);
    }
  }
}
