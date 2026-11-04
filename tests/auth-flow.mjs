import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const base = process.env.AUTH_TEST_URL || 'http://127.0.0.1:5176';
const uid = '00000000-0000-4000-8000-000000000002';
const hotelId = '00000000-0000-4000-8000-000000000004';
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'hotel@example.com',
  app_metadata: { provider: 'email' }, user_metadata: { role: 'super_admin' }, created_at: new Date().toISOString() };
const profile = { id:'00000000-0000-4000-8000-000000000003', auth_user_id: uid, name:'Recepción Test',
  email:user.email, role:'hotel_admin', hotel_id:hotelId, status:'Activo' };
const requests = []; const errors = [];
let active = true;
page.on('pageerror', (error) => errors.push(error.message));
await page.route('https://*.supabase.co/**', async (route) => {
  const request = route.request(); const url = new URL(request.url());
  requests.push({ path: url.pathname, search: url.search, method: request.method() });
  const respond = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (url.pathname === '/auth/v1/token') {
    if (request.postDataJSON().password !== 'correct-test-password') return respond({ error:'invalid_grant', error_description:'Invalid login credentials' },400);
    const exp = Math.floor(Date.now()/1000)+3600;
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    return respond({ access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid,aud:'authenticated',role:'authenticated',exp})}.test`,
      token_type:'bearer', refresh_token:'mock-refresh-token', expires_in:3600, expires_at:exp, user });
  }
  if (url.pathname === '/auth/v1/user') return respond(user);
  if (url.pathname === '/auth/v1/logout') return route.fulfill({status:204});
  if (url.pathname === '/rest/v1/admin_users') return respond(active ? profile : null);
  if (url.pathname === '/rest/v1/hotels') return respond([{id:hotelId,name:'Hotel Test',slug:'hotel-test',status:'Activo'}]);
  if (['/rest/v1/recommendations','/rest/v1/events','/rest/v1/sales'].includes(url.pathname)) return respond([]);
  return respond({error:'Unmocked request blocked'},500);
});
try {
  await page.goto(`${base}/admin/login`, { waitUntil:'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('gringacho_admin_session',JSON.stringify({id:1,role:'super_admin',name:'Forged Admin'})));
  await page.goto(`${base}/admin`, { waitUntil:'domcontentloaded' });
  await page.getByRole('button',{name:'Ingresar',exact:true}).waitFor();
  assert.equal(await page.locator('.reception-dashboard').count(),0);
  assert.equal(requests.some((r) => r.path === '/rest/v1/sales'),false);
  await page.getByLabel('Email',{exact:true}).fill(user.email);
  await page.getByLabel('Contraseña',{exact:true}).fill('wrong-password');
  await page.getByRole('button',{name:'Ingresar',exact:true}).click();
  await page.getByText('No se pudo ingresar.',{exact:false}).waitFor();
  await page.getByLabel('Contraseña',{exact:true}).fill('correct-test-password');
  await page.getByRole('button',{name:'Ingresar',exact:true}).click();
  await page.locator('.reception-dashboard').waitFor();
  assert.equal(await page.getByRole('button',{name:'Nuevo hotel',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Cobro manual',exact:true}).count(),0);
  assert.equal(await page.evaluate(() => localStorage.getItem('gringacho_admin_session')),null);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.reception-dashboard').waitFor();
  active = false;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByText('Tu cuenta no tiene un acceso activo asignado.',{exact:false}).waitFor();
  assert.equal(await page.locator('.reception-dashboard').count(),0);
  active = true;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.reception-dashboard').waitFor();
  await page.getByRole('button',{name:'Salir',exact:true}).click();
  await page.getByRole('button',{name:'Ingresar',exact:true}).waitFor();
  await page.goto(`${base}/admin`,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Ingresar',exact:true}).waitFor();
  assert.equal(requests.some((r) => r.path === '/rest/v1/admin_users' && r.search.includes('password')),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: forged local session denied, Auth login/reload/logout, profile role beats metadata, inactive account denied. All remote calls mocked.');
} finally { await browser.close(); }
