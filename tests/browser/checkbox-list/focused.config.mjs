import base from '../playwright.config.mjs';
export default {...base,globalSetup:'../../evidence-host/setup.mjs',testDir:'.',testMatch:'checkbox-list.spec.mjs',reporter:[['list']],use:{...base.use,baseURL:'http://127.0.0.1:4766'},webServer:{...base.webServer,url:'http://127.0.0.1:4766',env:{CORE_HOST_PORT:'4766'}}};
