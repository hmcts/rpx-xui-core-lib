export async function delayWelshTranslation(page, response) {
  let release = () => {};
  const gate = new Promise(resolve => { release = () => resolve(undefined); });
  await page.route('**/translations/cy', async route => {
    await gate;
    await response(route);
  });
  return release;
}

export function translatedPersonName(name) {
  return route => {
    const phrases = route.request().postDataJSON().phrases;
    return route.fulfill({ json: { translations: Object.fromEntries(phrases.map(p => [p, p === 'select a person' ? name : p])) } });
  };
}
