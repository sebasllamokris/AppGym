// Genera el par de claves VAPID. La pública va en wrangler.toml; la privada se guarda como secreto en Cloudflare.
import { writeFileSync } from 'node:fs';
const { subtle } = globalThis.crypto;
const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = Buffer.from(await subtle.exportKey('raw', kp.publicKey)).toString('base64url');
const priv = JSON.stringify(await subtle.exportKey('jwk', kp.privateKey));
writeFileSync(new URL('./.vapid-private.json', import.meta.url), priv);
console.log(pub);
