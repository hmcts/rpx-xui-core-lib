export async function holdWelshTranslation(page) {
  /** @type {() => void} */
  let release;
  const response = new Promise((resolve) => { release = () => resolve(undefined); });
  const requests = [];
  await page.route('**/translations/cy', async (route) => {
    requests.push(route.request().postDataJSON());
    await response;
    await route.fulfill({ json: { translations: { 'Hello world': 'Helo byd' } } });
  });
  return { requests, release };
}
