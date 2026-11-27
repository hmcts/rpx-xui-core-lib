import { verifyPackedBrowser } from '../package/packed-browser.mjs';
await verifyPackedBrowser({ name: 'common-shell', features: ['common-shell', 'primary-navigation', 'gov-table', 'let', 'host-rendering'], testMatch: ['**/common-shell/*.spec.mjs'] });
