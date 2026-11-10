// This proxy is used only by the loopback development gallery.
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
        for await (const chunk of request) {
          body += chunk;
          if (body.length > 64 * 1024) throw new Error('Request too large');
        }
        const { phrases } = JSON.parse(body);
        if (!Array.isArray(phrases) || !phrases.every((phrase) => typeof phrase === 'string')) throw new Error('Invalid phrases');
        const translations = Object.fromEntries(phrases.map((phrase) => [phrase, phrase === 'Hello world' ? 'Helo byd' : phrase]));
        response.writeHead(200).end(JSON.stringify({ translations }));
      } catch {
        response.writeHead(400).end(JSON.stringify({ error: 'Invalid local translation request' }));
      }
      return '/';
    },
  },
};
