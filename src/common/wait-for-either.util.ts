import { Page } from 'playwright';

/**
 * Waits for whichever of several selectors appears first — e.g. a login flow that
 * *might* show an OTP step, or might drop straight into the dashboard depending on the
 * account. Returns the index of the selector that appeared. Throws if none appear
 * within `timeout`.
 */
export async function waitForEitherSelector(page: Page, selectors: string[], timeout: number): Promise<number> {
  return Promise.race(
    selectors.map((selector, index) => page.waitForSelector(selector, { timeout }).then(() => index)),
  );
}
