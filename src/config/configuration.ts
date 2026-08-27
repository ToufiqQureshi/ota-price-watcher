export default () => ({
  port: Number(process.env.PORT) || 3000,
  databasePath: process.env.DATABASE_PATH || './data/gommt-price-watcher.sqlite',
  credentialsEncryptionKey: process.env.CREDENTIALS_ENCRYPTION_KEY || '',
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 60000,
  playwrightHeadless: (process.env.PLAYWRIGHT_HEADLESS ?? 'true') !== 'false',
  webhookSigningHeader: process.env.WEBHOOK_SIGNING_HEADER || 'X-Signature',
});
