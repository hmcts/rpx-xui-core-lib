import { verifyPackedBrowser } from '../package/packed-browser.mjs';
await verifyPackedBrowser({ name: 'form-controls', features: ['gov-controls', 'invitation'], testMatch: ['**/gov-controls/*.spec.mjs', '**/invitation/*.spec.mjs'] });
