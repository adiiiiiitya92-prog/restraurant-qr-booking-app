import { loadEnv } from 'vite';
import crypto from 'crypto';
import fs from 'fs';

const env = loadEnv('development', process.cwd(), '');

function normalizePrivateKey(raw) {
  let key = String(raw || '').trim().replace(/,\s*$/, '').trim();
  while (key.length > 1 && /^["']/.test(key) && /["']$/.test(key)) key = key.slice(1, -1).trim();
  key = key.replace(/\\n/g, '\n').replace(/\r/g, '');
  const body = (key.split('-----BEGIN PRIVATE KEY-----')[1] || '').split('-----END PRIVATE KEY-----')[0].replace(/[^A-Za-z0-9+/=]/g, '');
  return body ? `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n` : key;
}

const clientEmail = String(env.FIREBASE_CLIENT_EMAIL || '').trim().replace(/^["']|["'],?$/g, '');
const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);
const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;

function createJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase',
  })).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey, 'base64url');
  return `${header}.${payload}.${signature}`;
}

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: createJwt(),
  }),
});

const tokenData = await tokenRes.json();
if (!tokenData.access_token) {
  console.error('Failed to get access token:', tokenData);
  process.exit(1);
}

const accessToken = tokenData.access_token;
const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

console.log('Creating ruleset on Firebase with local firestore.rules...');
const createRulesetRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    source: {
      files: [
        {
          name: 'firestore.rules',
          content: rulesContent,
        },
      ],
    },
  }),
});

const rulesetData = await createRulesetRes.json();
if (!rulesetData.name) {
  console.error('Failed to create ruleset:', JSON.stringify(rulesetData, null, 2));
  process.exit(1);
}
console.log('Created ruleset:', rulesetData.name);

console.log('Releasing ruleset to cloud.firestore...');
const updateReleaseRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    release: {
      name: `projects/${projectId}/releases/cloud.firestore`,
      rulesetName: rulesetData.name,
    },
  }),
});

const updateReleaseData = await updateReleaseRes.json();
console.log('Release result:', JSON.stringify(updateReleaseData, null, 2));
console.log('Successfully deployed firestore.rules to Firebase!');
