import base from '../playwright.config.mjs';
export default {...base,globalSetup:'../../evidence-host/setup.mjs',testDir:'.',testMatch:'gov-date.spec.mjs',reporter:[['list']],outputDir:'test-results/gov-date-focused',use:{...base.use,baseURL:'http://127.0.0.1:4765'},webServer:{...base.webServer,url:'http://127.0.0.1:4765',env:{CORE_HOST_PORT:'4765'}}};
