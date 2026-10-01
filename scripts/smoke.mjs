import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:5173';
const page = await fetch(base);
assert.equal(page.status, 200);
assert.match(await page.text(), /CarePlus/);
const health = await fetch(`${base}/api/health`);
assert.equal((await health.json()).ok, true);
const caps = await (await fetch(`${base}/api/capabilities`)).json();
assert.equal(typeof caps.ready, 'boolean');
assert.equal(caps.passkeys.enabled, false);
const response = await fetch(`${base}/api/session`);
const cookie = response.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie);
assert.ok(/HttpOnly/i.test(response.headers.get('set-cookie')));
assert.ok(/SameSite=Strict/i.test(response.headers.get('set-cookie')));
assert.equal(response.headers.get('cache-control'), 'no-store');
const state = await response.json();
assert.equal(state.authenticated, false);
assert.equal(state.beneficiary, undefined);
const post = (path, body = {}, csrf = state.csrf) => fetch(`${base}/api${path}`, {
  method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json', 'x-demo-csrf': csrf }, body: JSON.stringify(body),
});
assert.equal((await post('/otp/start', { phone: 'invalid', channel: 'sms' })).status, 400);
assert.equal((await post('/otp/start', { phone: 'invalid', channel: 'sms' }, 'invalid')).status, 403);
assert.equal((await post('/reimbursement', { account: 'demo-4096', stepUp: true })).status, 401);
assert.equal((await post('/totp/enroll')).status, 401);
assert.equal((await post('/reset')).status, 200);
console.log('Smoke passed: frontend, health, capabilities, session, validation, CSRF, authorization, reset. No OTP sent.');
