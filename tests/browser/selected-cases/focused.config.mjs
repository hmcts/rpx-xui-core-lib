import base from '../playwright.config.mjs';
export default { ...base, globalSetup: '../../evidence-host/setup.mjs', testDir: '.', testMatch: '*.spec.mjs', reporter: [['list']], use: { ...base.use, baseURL: 'http://127.0.0.1:4767' }, webServer: { ...base.webServer, url: 'http://127.0.0.1:4767', env: { CORE_HOST_PORT: '4767' } } };
