// Dev-only: serve netlify/functions/*.mjs at /.netlify/functions/<name> from the
// normal Vite dev server, so staff management and photo upload work with plain
// `npm run dev` (no `netlify dev` needed). Production uses real Netlify Functions.

import { loadEnv } from 'vite';

// Variables that came from the real shell environment (not .env). Those win;
// everything else is refreshed from .env on every dev-server restart, so editing
// .env takes effect without killing the process.
// Stored on globalThis because Vite re-evaluates this file on every restart.
globalThis.__junio8ShellEnvKeys ??= new Set(Object.keys(process.env));
const SHELL_ENV_KEYS = globalThis.__junio8ShellEnvKeys;

export function netlifyFunctionsDev() {
  return {
    name: 'junio8-netlify-functions-dev',
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
      server.middlewares.use('/.netlify/functions', async (req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\/+/, '').split('/')[0];
        if (!/^[a-z0-9-]+$/i.test(name)) return next();

        let mod;
        try {
          mod = await server.ssrLoadModule(`/netlify/functions/${name}.mjs`);
        } catch {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: `Function "${name}" not found` }));
          return;
        }

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;

          const request = new Request(`http://localhost${req.originalUrl || req.url}`, {
            method: req.method,
            headers: req.headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          });

          const response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          console.error(`[functions] ${name} crashed:`, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Function crashed. See the dev server terminal.' }));
        }
      });
    },
  };
}
