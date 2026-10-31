-- Solo ejemplos para verificar el flujo. Ejecutar despues de schema.sql.
-- No cambia precios ni datos de servicios existentes con el mismo titulo/hotel.

insert into public.recommendations (
  hotel_id, title, subtitle, category, short_description, full_description,
  image, duration, location, status, featured, bookable,
  price, provider_cost, receptionist_commission, system_commission, commission,
  provider, payment_url, map_url, tips
)
select h.id, demo.title, demo.subtitle, demo.category, demo.description, demo.description,
  demo.image, demo.duration, 'Albufeira, Algarve, Portugal', 'Publicado', true, true,
  demo.price, demo.provider_cost, demo.receptionist_commission, demo.system_commission,
  demo.receptionist_commission + demo.system_commission, demo.provider, '',
  'https://maps.google.com/?q=Albufeira',
  array['Ejemplo de prueba. Disponibilidad sujeta a confirmacion de la empresa.']
from public.hotels h
cross join (values
  ('Gruta de Benagil en barco (demo)', 'Excursion', 'excursion',
   'Salida en barco por la costa. Elegi fecha y horario para solicitar disponibilidad.',
   'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1000&q=80',
   '3 a 4 horas', 60::numeric, 40::numeric, 10::numeric, 10::numeric, 'Benagil Tours (demo)'),
  ('Alquiler de auto por dia (demo)', 'Alquiler de autos', 'alquiler-auto',
   'Auto de alquiler con entrega a coordinar. La empresa confirma unidad, seguro y deposito.',
   'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&q=80',
   'Por dia', 60::numeric, 40::numeric, 10::numeric, 10::numeric, 'Algarve Rent a Car (demo)'),
  ('Alquiler de scooter 125 cc (demo)', 'Alquiler de motos', 'alquiler-moto',
   'Scooter de alquiler por dia. Documentacion, seguro y deposito sujetos al proveedor.',
   'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1000&q=80',
   'Por dia', 40::numeric, 30::numeric, 5::numeric, 5::numeric, 'Algarve Mobility (demo)')
) as demo(title, subtitle, category, description, image, duration, price, provider_cost,
  receptionist_commission, system_commission, provider)
where h.slug = 'hotel-atlantico-albufeira'
  and not exists (
    select 1 from public.recommendations r
    where r.hotel_id = h.id and r.title = demo.title
  );
