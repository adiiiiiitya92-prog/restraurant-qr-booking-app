// Dev-only: serve the Vercel functions in api/*.js at /api/<name> from the normal
// Vite dev server, so staff management and photo upload work with plain
// `npm run dev`. On Vercel the real Vercel Functions serve these same files.
//
// Each api/<name>.js exports Web-standard method handlers, e.g.
//   export async function POST(request) { return new Response(...) }

import { loadEnv } from 'vite';

// Variables that came from the real shell environment (not .env). Those win;
// everything else is refreshed from .env on every dev-server restart, so editing
// .env takes effect without killing the process.
// Stored on globalThis because Vite re-evaluates this file on every restart.
globalThis.__junio8ShellEnvKeys ??= new Set(Object.keys(process.env));
const SHELL_ENV_KEYS = globalThis.__junio8ShellEnvKeys;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function apiFunctionsDev() {
  return {
    name: 'junio8-api-functions-dev',
    apply: 'serve',
    configResolved(config) {
      // Give the functions their server-only env vars (CLOUDINARY_*, FIREBASE_*) from .env.
      // These are NOT exposed to the browser; only VITE_* ever reaches the client bundle.
      const env = loadEnv(config.mode, config.root, '');
      for (const [key, value] of Object.entries(env)) {
        if (!SHELL_ENV_KEYS.has(key)) process.env[key] = value;
      }
    },
    configureServer(server) {
      // Dev cleanup for PWA service workers & stale production assets on localhost:
      // When a user previously ran a production build or preview on localhost:5173, the browser
      // or Workbox may have cached an old index.html requesting /assets/index-*.js or polling /sw.js.
      // Vite's default dev fallback serves index.html (text/html) for missing files, which causes:
      // "Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'text/html'".
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];

        // Self-destruct any stale production Service Worker active on localhost
        if (url === '/sw.js' || url === '/workbox-window.prod.es5.js' || /^(\/workbox-[a-f0-9]+\.js)$/i.test(url)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/javascript');
          res.end(`// Dev mode self-destruct service worker
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    self.registration.unregister().then(() => self.clients.matchAll()).then((clients) => {
      clients.forEach((c) => c.navigate(c.url));
    })
  );
});
`);
          return;
        }

        // Stale production bundle requests in dev mode
        if (url.startsWith('/assets/')) {
          if (url.endsWith('.js')) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/javascript');
            res.end(`// Dev mode: detected stale production bundle request. Unregistering SW, clearing cache, and refreshing.
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) r.unregister();
    });
  }
  if ('caches' in window) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => {
      window.location.reload();
    });
  } else {
    window.location.reload();
  }
}
`);
            return;
          }
          if (url.endsWith('.css')) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/css');
            res.end('/* Dev mode fallback */');
            return;
          }
        }

        next();
      });

      server.middlewares.use('/api', async (req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\/+/, '').split('/')[0];
        if (!/^[a-z0-9-]+$/i.test(name)) return next();

        let mod;
        try {
          mod = await server.ssrLoadModule(`/api/${name}.js`);
        } catch {
          return send(res, 404, { error: `API "${name}" not found` });
        }

        const handler = mod[req.method] || (typeof mod.default === 'function' ? mod.default : null);
        if (!handler) return send(res, 405, { error: 'Method not allowed' });

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;

          const request = new Request(`http://localhost${req.originalUrl || req.url}`, {
            method: req.method,
            headers: req.headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          });

          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          console.error(`[api] ${name} crashed:`, err);
          send(res, 500, { error: 'Function crashed. See the dev server terminal.' });
        }
      });
    },
  };
}
