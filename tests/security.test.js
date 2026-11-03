import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

let db;
const ids = {
  super: '00000000-0000-4000-8000-000000000001',
  a: '00000000-0000-4000-8000-000000000002',
  b: '00000000-0000-4000-8000-000000000003',
};
let hotelA, hotelB, recA;
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
  .replace('create extension if not exists "pgcrypto";', '');
const migration = readFileSync(new URL('../supabase/migrations/20261031_auth_and_permissions.sql', import.meta.url), 'utf8');

async function as(role, uid, sql, params = []) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid || '']);
  try { return await db.query(sql, params); }
  finally { await db.exec('reset role'); }
}
async function book(requestId = crypto.randomUUID(), extra = {}) {
  const form = { name: 'Test Guest', date: new Date(Date.now()+86400000*3).toISOString().slice(0,10), quantity: 2, ...extra };
  return (await as('anon', null, `select public.create_guest_booking($1,$2,$3,$4,'204','test@example.com',$5,$6,'10:00',null,null,'Hotel') as receipt`,
    [requestId, recA, hotelA, form.name, form.quantity, form.date])).rows[0].receipt;
}

before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
  await db.exec(schema);
  hotelA = (await db.query('select id from public.hotels limit 1')).rows[0].id;
  hotelB = (await db.query("insert into public.hotels(name,slug,location) values('B','hotel-b','Portugal') returning id")).rows[0].id;
  await db.query("insert into auth.users values($1,'admin@demo.com',now()),($2,'hotel@demo.com',now()),($3,'b@example.com',now())", Object.values(ids));
  await db.query("insert into public.admin_users(name,email,password,role,hotel_id) values('B','b@example.com','legacy','hotel_admin',$1)", [hotelB]);
  recA = (await db.query(`insert into public.recommendations(hotel_id,title,category,price,provider_cost,receptionist_commission,system_commission,commission,bookable)
    values($1,'Boat','excursion',60,40,10,10,20,true) returning id`, [hotelA])).rows[0].id;
  await db.exec(migration);
});
after(async () => { await db?.close(); });

test('migration is repeatable and removes passwords from profiles', async () => {
  await db.exec(migration);
  const result = await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='admin_users' and column_name='password'");
  assert.equal(result.rows.length, 0);
});
test('migration without an Auth administrator rolls back without locking out the old setup', async () => {
  const fresh = new PGlite();
  try {
    await fresh.exec('create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);');
    await fresh.exec(schema);
    await assert.rejects(fresh.exec(migration),/Primero crea una cuenta confirmada/);
    await fresh.exec('rollback');
    const columns = (await fresh.query("select column_name from information_schema.columns where table_schema='public' and table_name='admin_users'")).rows.map((r) => r.column_name);
    assert.equal(columns.includes('password'),true);
    assert.equal(columns.includes('auth_user_id'),false);
  } finally { await fresh.close(); }
});
test('anonymous visitors cannot read profiles, sales or internal tariffs', async () => {
  for (const table of ['admin_users','sales','recommendations','hotels']) {
    await assert.rejects(as('anon', null, `select * from public.${table}`), /permission denied/);
  }
  const { rows } = await as('anon', null, 'select public.get_public_catalog(null) as catalog');
  assert.equal(rows[0].catalog.recommendations[0].price, 60);
  const exposed = JSON.stringify(rows[0].catalog);
  for (const privateField of ['provider_cost','commission','guest_contact','admin_name','password']) assert.equal(exposed.includes(privateField), false);
});
test('each hotel sees only its own data and cannot move services to another hotel', async () => {
  const { rows } = await as('authenticated', ids.a, 'select id from public.hotels');
  assert.deepEqual(rows.map((r) => r.id), [hotelA]);
  await assert.rejects(as('authenticated', ids.a, 'update public.recommendations set hotel_id=$1 where id=$2', [hotelB,recA]), /row-level security/);
  assert.equal((await as('authenticated',ids.b,'select id from public.recommendations')).rows.length,0);
});
test('guest RPC calculates 40/10/10 on the server and hides internal amounts', async () => {
  const receipt = await book();
  assert.equal(receipt.amount, 120);
  assert.equal(receipt.status,'Reservado');
  assert.equal('provider_amount' in receipt,false);
  const saved = (await db.query('select * from public.sales where id=$1',[receipt.id])).rows[0];
  assert.equal(saved.provider_amount,'80');
  assert.equal(saved.receptionist_commission,'20');
  assert.equal(saved.system_commission,'20');
});
test('retries return the same booking; changed payload cannot reuse its key', async () => {
  const id = crypto.randomUUID();
  const first = await book(id); const second = await book(id);
  assert.equal(first.id,second.id);
  assert.equal((await db.query('select id from public.sales where id=$1',[id])).rows.length,1);
  await assert.rejects(book(id,{quantity:3}),/otros datos/);
});
test('direct writes and role escalation are blocked even with a valid hotel session', async () => {
  await assert.rejects(as('authenticated',ids.a,"update public.admin_users set role='super_admin' where auth_user_id=$1",[ids.a]),/permission denied/);
  await assert.rejects(as('authenticated',ids.a,"update public.sales set amount=1"),/permission denied/);
  await assert.rejects(as('authenticated',ids.a,"select public.manage_admin_user(null,'Hack','b@example.com','super_admin',null,'Activo')"),/administrador general/);
  await assert.rejects(as('anon',null,'select public.process_booking($1,\'collect\')',[crypto.randomUUID()]),/permission denied/);
});
test('hotel B cannot read or collect hotel A booking; hotel A cannot collect twice', async () => {
  const receipt=await book();
  assert.equal((await as('authenticated',ids.b,'select id from public.sales where id=$1',[receipt.id])).rows.length,0);
  await assert.rejects(as('authenticated',ids.b,"select public.process_booking($1,'collect')",[receipt.id]),/no disponible/);
  await assert.rejects(as('authenticated',ids.a,"select public.process_booking($1,'collect')",[receipt.id]),/Accion no permitida/);
  await as('authenticated',ids.a,"select public.process_booking($1,'confirm')",[receipt.id]);
  await db.query('update public.recommendations set price=70,provider_cost=50 where id=$1',[recA]);
  const result = (await as('authenticated',ids.a,"select public.process_booking($1,'collect') as sale",[receipt.id])).rows[0].sale;
  assert.equal(Number(result.amount),120); assert.equal(Number(result.provider_amount),80);
  assert.ok(result.paid_at); assert.ok(result.collected_by);
  await assert.rejects(as('authenticated',ids.a,"select public.process_booking($1,'collect')",[receipt.id]),/ya fue procesada/);
  assert.equal((await db.query("select * from app_private.booking_audit where sale_id=$1 and action='collect'",[receipt.id])).rows.length,1);
  await db.query('update public.recommendations set price=60,provider_cost=40 where id=$1',[recA]);
});
test('inactive accounts lose access and cannot process bookings', async () => {
  const receipt=await book();
  await db.query("update public.admin_users set status='Borrador' where auth_user_id=$1",[ids.b]);
  assert.equal((await as('authenticated',ids.b,'select id from public.hotels')).rows.length,0);
  await assert.rejects(as('authenticated',ids.b,"select public.process_booking($1,'confirm')",[receipt.id]),/no autorizado/);
  await db.query("update public.admin_users set status='Activo' where auth_user_id=$1",[ids.b]);
});
test('invalid dates, quantities and inconsistent tariff changes are rejected', async () => {
  await assert.rejects(book(crypto.randomUUID(),{quantity:0}),/Revisa/);
  await assert.rejects(book(crypto.randomUUID(),{date:'2020-01-01'}),/fecha futura/);
  await assert.rejects(as('authenticated',ids.a,'update public.recommendations set price=1 where id=$1',[recA]),/check constraint/);
});
test('expired and cancelled coupons cannot be collected', async () => {
  const expired = await book();
  await db.query("update public.sales set expires_at=now()-interval '1 second' where id=$1",[expired.id]);
  await assert.rejects(as('authenticated',ids.a,"select public.process_booking($1,'confirm')",[expired.id]),/vencio/);
  const cancelled = await book();
  await as('authenticated',ids.a,"select public.process_booking($1,'cancel')",[cancelled.id]);
  await assert.rejects(as('authenticated',ids.a,"select public.process_booking($1,'collect')",[cancelled.id]),/ya fue procesada/);
});
test('rental server pricing covers the requested period', async () => {
  const rental = (await db.query(`insert into public.recommendations(hotel_id,title,category,price,provider_cost,receptionist_commission,system_commission,bookable)
    values($1,'Scooter','alquiler-moto',40,30,5,5,true) returning id`,[hotelA])).rows[0].id;
  const start=new Date(Date.now()+86400000*3).toISOString().slice(0,10);
  const end=new Date(Date.now()+86400000*5).toISOString().slice(0,10);
  const result=(await as('anon',null,"select public.create_guest_booking($1,$2,$3,'Renter','','test@example.com',1,$4,'10:00',$5,'10:01','') as receipt",
    [crypto.randomUUID(),rental,hotelA,start,end])).rows[0].receipt;
  assert.equal(result.amount,120);
});
test('old demo installer cannot reopen access after migration', async () => {
  await assert.rejects(db.exec(schema),/seguridad Auth ya esta instalada/);
  await db.exec('rollback');
  await assert.rejects(as('anon',null,'select * from public.sales'),/permission denied/);
});
test('super admin can view both hotels but cannot remove or demote their own access', async () => {
  assert.equal((await as('authenticated',ids.super,'select id from public.hotels')).rows.length,2);
  const profile = (await db.query('select id from public.admin_users where auth_user_id=$1',[ids.super])).rows[0];
  await assert.rejects(as('authenticated',ids.super,'select public.delete_admin_access($1)',[profile.id]),/propio acceso/);
  await assert.rejects(as('authenticated',ids.super,"select public.manage_admin_user($1,'Admin','admin@demo.com','hotel_admin',$2,'Activo')",[profile.id,hotelA]),/propio acceso/);
});
