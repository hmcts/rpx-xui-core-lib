// This proxy is used only by the loopback development gallery.
const welsh = new Map([
  ['Synthetic name', 'Enw synthetig'],
  ['Synthetic hint', 'Awgrym synthetig'],
  ['Synthetic error', 'Gwall synthetig'],
  ['<strong>Synthetic terms</strong><a href="javascript:alert(1)">Link</a><script>ignored</script>', '<strong>Telerau synthetig</strong><script>ignored</script>'],
  ['<strong>Synthetic text</strong>', 'Testun synthetig'],
  ['Accessibility statement for MyHMCTS', 'Datganiad hygyrchedd MyHMCTS'],
  ['We are about to sign you out', 'Rydym ar fin eich allgofnodi'],
  ['Saved', 'Wedi cadw'],
  ['Case name', 'Enw achos'],
  ['Date opened', 'Dyddiad agor'],
  ['View case', 'Gweld achos'],
  ['Open case', 'Agor achos'],
  ['Synthetic cases', 'Achosion synthetig'],
  ['Synthetic flat cases', 'Achosion synthetig gwastad'],
  ['Synthetic caseworker', 'Gweithiwr achos synthetig'],
  ['Select case', 'Dewis achos'],
  ['Hello world', 'Helo byd'],
  ['Searching', 'Chwilio'],
  ['Phone:', 'Ffôn:'],
  ['TODAY', 'HEDDIW'],
  ['This task is due to be completed today', 'Mae’r dasg hon i fod i gael ei chwblhau heddiw'],
  ['Back', 'Yn ôl'],
  ['Primary navigation', 'Prif lywio'],
  ['This allows the user to submit and manage cases on behalf of your organisation', 'Mae hyn yn galluogi’r defnyddiwr i gyflwyno a rheoli achosion ar ran eich sefydliad'],
  ['This allows the user to manage access to cases within your organisation', 'Mae hyn yn galluogi’r defnyddiwr i reoli mynediad at achosion yn eich sefydliad'],
  ['Open applications', 'Ceisiadau agored'],
  ['Closed applications', 'Ceisiadau caeedig'],
  ['Case list', 'Rhestr achosion'],
  ['Case management', 'Rheoli achosion'],
  ['Overview', 'Trosolwg'],
  ['History', 'Hanes'],
  ['Using this service', 'Defnyddio’r gwasanaeth hwn'],
  ['Terms and conditions', 'Telerau ac amodau'],
  ['terms and conditions', 'telerau ac amodau'],
  ["We've recently updated the", 'Rydym wedi diweddaru’r'],
  ['You must review and accept them.', 'Rhaid i chi eu hadolygu a’u derbyn.'],
  ['Confirm', 'Cadarnhau'],
  ['Cookies on', 'Cwcis ar'],
  ['Case service', 'Gwasanaeth achosion'],
  ['Accept analytics cookies', 'Derbyn cwcis dadansoddeg'],
  ['Reject analytics cookies', 'Gwrthod cwcis dadansoddeg'],
  ['View cookies', 'Gweld cwcis'],
  ['We use some essential cookies to make this service work.', 'Rydym yn defnyddio cwcis hanfodol i wneud i’r gwasanaeth hwn weithio.'],
  ["We'd also like to use analytics cookies so we can understand how you use the service and make improvements.", 'Hoffem hefyd ddefnyddio cwcis dadansoddeg i ddeall sut rydych yn defnyddio’r gwasanaeth a gwneud gwelliannau.'],
]);

export default {
  '/translations': {
    target: 'http://127.0.0.1:9',
    /** @param {import('node:http').IncomingMessage} request @param {import('node:http').ServerResponse} response */
    async bypass(request, response) {
      const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
      response.setHeader('Content-Type', 'application/json');
      if (request.method !== 'POST' || !['/translations/cy', '/translations/failure/cy'].includes(path)) {
        response.writeHead(404).end(JSON.stringify({ error: 'Unknown local translation request' }));
        return '/';
      }
      if (path === '/translations/failure/cy') {
        response.writeHead(503).end(JSON.stringify({ error: 'Simulated service failure' }));
        return '/';
      }
      try {
        let body = '';
        request.setEncoding('utf8');
        for await (const chunk of request) {
          body += chunk;
          if (body.length > 64 * 1024) throw new Error('Request too large');
        }
        const { phrases } = JSON.parse(body);
        if (!Array.isArray(phrases) || !phrases.every((phrase) => typeof phrase === 'string')) throw new Error('Invalid phrases');
        const translations = Object.fromEntries(phrases.map((phrase) => [phrase, welsh.get(phrase) ?? phrase]));
        response.writeHead(200).end(JSON.stringify({ translations }));
      } catch {
        response.writeHead(400).end(JSON.stringify({ error: 'Invalid local translation request' }));
      }
      return '/';
    },
  },
};
