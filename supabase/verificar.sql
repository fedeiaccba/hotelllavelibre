-- Ejecutar en SQL Editor despues de la instalacion. Solo lectura.
-- En una instalacion nueva: hoteles 1, usuarios 2, servicios 3, eventos 1, ventas 0.
select 'hotels' as tabla, count(*) as filas from public.hotels
union all select 'admin_users', count(*) from public.admin_users
union all select 'recommendations', count(*) from public.recommendations
union all select 'events', count(*) from public.events
union all select 'sales', count(*) from public.sales;

-- Debe devolver las 12 columnas del flujo de reserva.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'sales'
  and column_name in ('booking_code', 'booking_status', 'payment_method',
    'guest_contact', 'service_date', 'service_time', 'end_date', 'end_time',
    'pickup_location', 'expires_at', 'paid_at', 'collected_by')
order by column_name;

-- Debe devolver 0 filas: servicios con reparto incorrecto.
select id, title from public.recommendations
where bookable and (
  price <= 0 or provider_cost < 0 or receptionist_commission < 0 or system_commission < 0
  or round(price, 2) <> round(provider_cost + receptionist_commission + system_commission, 2)
);

-- No se muestran passwords ni datos de huespedes.
select name, slug, public_url from public.hotels;
