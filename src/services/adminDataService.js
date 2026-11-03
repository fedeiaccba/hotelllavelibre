import { ADMIN_EVENTS, ADMIN_USERS, HOTELS, PLATFORM_SETTINGS, SALES } from '../data/adminMock';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { canCollectCash, quoteBooking, validateBooking } from '../lib/booking';
import { getAuthenticatedAdmin, signOutAdmin } from './authService';

// Comportamiento:
// - Si Supabase está configurado (hay credenciales en .env.local), la base de datos
//   es la ÚNICA fuente de verdad: todas las operaciones golpean Supabase y, si algo
//   falla (schema sin aplicar, RLS, etc.), el error se propaga a la UI para que se vea.
// - Si NO está configurado, se usa localStorage con datos mock (modo demo sin backend).

const LOCAL_ADMIN_USERS_KEY = 'gringacho_admin_users';
const LOCAL_EVENTS_KEY = 'gringacho_events';
const LOCAL_HOTELS_KEY = 'gringacho_hotels';
const LOCAL_RECOMMENDATIONS_KEY = 'gringacho_recommendations';
const LOCAL_SALES_KEY = 'gringacho_sales';
const BOOKING_FIELDS = {
  bookingCode: 'booking_code', bookingStatus: 'booking_status', paymentMethod: 'payment_method',
  guestContact: 'guest_contact', serviceDate: 'service_date', serviceTime: 'service_time',
  endDate: 'end_date', endTime: 'end_time', pickupLocation: 'pickup_location',
  expiresAt: 'expires_at', paidAt: 'paid_at', collectedBy: 'collected_by',
};

function adminArgs(user, id = null) {
  return {
    p_id: id, p_name: user.name, p_email: user.email, p_role: user.role,
    p_hotel_id: user.role === 'hotel_admin' ? user.hotelId || null : null,
    p_status: user.status || 'Activo',
  };
}

function fromAdminUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    hotelId: row.hotel_id,
    status: row.status || 'Activo',
  };
}

function toHotelRow(hotel) {
  return {
    name: hotel.name,
    slug: hotel.slug,
    location: hotel.location,
    plan: hotel.plan,
    status: hotel.status,
    admin_name: hotel.adminName,
    public_url: hotel.publicUrl,
    qr_scans: Number(hotel.qrScans || 0),
    auto_charge: Boolean(hotel.autoCharge),
  };
}

function fromHotelRow(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    location: row.location,
    plan: row.plan,
    status: row.status,
    adminName: row.admin_name,
    publicUrl: row.public_url,
    qrScans: row.qr_scans || 0,
    autoCharge: Boolean(row.auto_charge),
    recommendations: row.recommendations || 0,
    lastUpdate: formatDate(row.updated_at),
  };
}

function toMoney(value) {
  return Number(value) || 0;
}

function getRecommendationSplit(recommendation) {
  const price = toMoney(recommendation.price);
  const receptionistCommission = toMoney(
    recommendation.receptionistCommission ?? recommendation.commission,
  );
  const systemCommission = toMoney(recommendation.systemCommission);
  const commission = receptionistCommission + systemCommission;
  const providerCost = recommendation.providerCost == null || recommendation.providerCost === ''
    ? Math.max(0, price - commission) : toMoney(recommendation.providerCost);

  return { commission, providerCost, receptionistCommission, systemCommission };
}

function getSaleSplit(sale) {
  const amount = toMoney(sale.amount);
  const receptionistCommission = toMoney(sale.receptionistCommission ?? sale.commission);
  const systemCommission = toMoney(sale.systemCommission);
  const commission = receptionistCommission + systemCommission;
  const providerAmount = sale.providerAmount == null ? Math.max(0, amount - commission) : toMoney(sale.providerAmount);

  return { commission, providerAmount, receptionistCommission, systemCommission };
}

function toRecommendationRow(recommendation) {
  const split = getRecommendationSplit(recommendation);

  return {
    hotel_id: recommendation.hotelId,
    title: recommendation.title,
    subtitle: recommendation.subtitle,
    category: recommendation.category,
    short_description: recommendation.shortDescription,
    full_description: recommendation.fullDescription,
    image: recommendation.image,
    distance: recommendation.distance,
    duration: recommendation.duration,
    difficulty: recommendation.difficulty || null,
    location: recommendation.location,
    hours: recommendation.hours,
    map_url: recommendation.mapUrl,
    status: recommendation.status,
    featured: Boolean(recommendation.featured),
    bookable: Boolean(recommendation.bookable),
    price: Number(recommendation.price) || 0,
    provider_cost: split.providerCost,
    receptionist_commission: split.receptionistCommission,
    system_commission: split.systemCommission,
    commission: split.commission,
    provider: recommendation.provider || '',
    payment_url: recommendation.paymentUrl || '',
    tips: recommendation.tips || [],
  };
}

function fromRecommendationRow(row) {
  const receptionistCommission = toMoney(row.receptionist_commission ?? row.commission);
  const systemCommission = toMoney(row.system_commission);
  const commission = toMoney(row.commission) || receptionistCommission + systemCommission;
  const price = toMoney(row.price);

  return {
    id: row.id,
    hotelId: row.hotel_id,
    title: row.title,
    subtitle: row.subtitle || '',
    category: row.category,
    shortDescription: row.short_description || '',
    fullDescription: row.full_description || '',
    image: row.image || '',
    distance: row.distance || '',
    duration: row.duration || '',
    difficulty: row.difficulty,
    location: row.location || '',
    hours: row.hours || '',
    mapUrl: row.map_url || '',
    status: row.status || 'Publicado',
    featured: Boolean(row.featured),
    bookable: Boolean(row.bookable),
    price,
    providerCost: row.provider_cost == null ? Math.max(0, price - commission) : toMoney(row.provider_cost),
    receptionistCommission,
    systemCommission,
    commission,
    provider: row.provider || '',
    paymentUrl: row.payment_url || '',
    tips: row.tips || [],
  };
}

function toEventRow(event) {
  return {
    hotel_id: event.hotelId,
    title: event.title,
    date: event.date,
    category: event.category,
    status: event.status,
  };
}

function fromEventRow(row) {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    title: row.title,
    date: row.date,
    category: row.category,
    status: row.status || 'Publicado',
  };
}

function fromSaleRow(row) {
  const receptionistCommission = toMoney(row.receptionist_commission ?? row.commission);
  const systemCommission = toMoney(row.system_commission);
  const commission = toMoney(row.commission) || receptionistCommission + systemCommission;
  const amount = toMoney(row.amount);

  return {
    ...Object.fromEntries(Object.entries(BOOKING_FIELDS).map(([key, column]) => [key, row[column] ?? null])),
    id: row.id,
    hotelId: row.hotel_id,
    recommendationId: row.recommendation_id,
    recommendationTitle: row.recommendation_title || '',
    receptionistId: row.receptionist_id,
    receptionistName: row.receptionist_name || '',
    guestName: row.guest_name || '',
    guestRoom: row.guest_room || '',
    quantity: Number(row.quantity) || 1,
    amount,
    providerAmount: row.provider_amount == null ? Math.max(0, amount - commission) : toMoney(row.provider_amount),
    receptionistCommission,
    systemCommission,
    commission,
    status: row.status || 'Cobrado',
    note: row.note || '',
    createdAt: row.created_at || row.createdAt || null,
  };
}

function formatDate(value) {
  if (!value) return 'Sin actualizar';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function readLocal(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function findLocalAdmin(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readLocal(LOCAL_ADMIN_USERS_KEY, ADMIN_USERS);
  return users.find(
    (user) =>
      user.email.toLowerCase() === normalizedEmail &&
      user.password === password &&
      (user.status || 'Activo') === 'Activo',
  ) || null;
}

export async function authenticateAdmin(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) throw new Error('No se pudo ingresar. Revisá el email y la contraseña.');
    try { return await getAuthenticatedAdmin(); }
    catch (accessError) { await signOutAdmin(); throw accessError; }
  }

  return findLocalAdmin(email, password);
}

export async function listAdminUsers() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(fromAdminUserRow);
  }

  return readLocal(LOCAL_ADMIN_USERS_KEY, ADMIN_USERS);
}

export async function createAdminUser(payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('manage_admin_user', adminArgs(payload));

    if (error) throw error;
    return fromAdminUserRow(data);
  }

  const users = readLocal(LOCAL_ADMIN_USERS_KEY, ADMIN_USERS);
  const created = {
    ...payload,
    id: makeId('user'),
    status: payload.status || 'Activo',
    hotelId: payload.role === 'hotel_admin' ? payload.hotelId : null,
  };
  writeLocal(LOCAL_ADMIN_USERS_KEY, [created, ...users]);
  return created;
}

export async function updateAdminUser(id, payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('manage_admin_user', adminArgs(payload, id));

    if (error) throw error;
    return fromAdminUserRow(data);
  }

  const users = readLocal(LOCAL_ADMIN_USERS_KEY, ADMIN_USERS);
  const updated = users.map((user) =>
    String(user.id) === String(id)
      ? {
          ...user,
          ...payload,
          hotelId: payload.role === 'hotel_admin' ? payload.hotelId : null,
        }
      : user,
  );
  writeLocal(LOCAL_ADMIN_USERS_KEY, updated);
  return updated.find((user) => String(user.id) === String(id));
}

export async function deleteAdminUser(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.rpc('delete_admin_access', { p_id: id });
    if (error) throw error;
    return;
  }

  const users = readLocal(LOCAL_ADMIN_USERS_KEY, ADMIN_USERS);
  writeLocal(
    LOCAL_ADMIN_USERS_KEY,
    users.filter((user) => String(user.id) !== String(id)),
  );
}

export async function listHotels() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(fromHotelRow);
  }

  return readLocal(LOCAL_HOTELS_KEY, HOTELS);
}

export async function createHotel(payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('hotels')
      .insert(toHotelRow(payload))
      .select()
      .single();

    if (error) throw error;
    return fromHotelRow(data);
  }

  const hotels = readLocal(LOCAL_HOTELS_KEY, HOTELS);
  const created = {
    ...payload,
    id: makeId('hotel'),
    qrScans: Number(payload.qrScans || 0),
    recommendations: 0,
    lastUpdate: 'Ahora',
  };
  writeLocal(LOCAL_HOTELS_KEY, [created, ...hotels]);
  return created;
}

export async function updateHotel(id, payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('hotels')
      .update(toHotelRow(payload))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return fromHotelRow(data);
  }

  const hotels = readLocal(LOCAL_HOTELS_KEY, HOTELS);
  const updated = hotels.map((hotel) =>
    String(hotel.id) === String(id) ? { ...hotel, ...payload, lastUpdate: 'Ahora' } : hotel,
  );
  writeLocal(LOCAL_HOTELS_KEY, updated);
  return updated.find((hotel) => String(hotel.id) === String(id));
}

export async function deleteHotel(id) {
  if (isSupabaseConfigured) {
    // Las FKs con ON DELETE CASCADE / SET NULL limpian recommendations, events,
    // sales y desasignan a los admins del hotel automáticamente.
    const { error } = await supabase.from('hotels').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  const hotels = readLocal(LOCAL_HOTELS_KEY, HOTELS);
  writeLocal(
    LOCAL_HOTELS_KEY,
    hotels.filter((hotel) => String(hotel.id) !== String(id)),
  );

  const recommendations = readLocal(
    LOCAL_RECOMMENDATIONS_KEY,
    PLATFORM_SETTINGS.recommendations,
  );
  writeLocal(
    LOCAL_RECOMMENDATIONS_KEY,
    recommendations.filter((item) => String(item.hotelId) !== String(id)),
  );

  const events = readLocal(LOCAL_EVENTS_KEY, ADMIN_EVENTS);
  writeLocal(
    LOCAL_EVENTS_KEY,
    events.filter((event) => String(event.hotelId) !== String(id)),
  );

  const sales = readLocal(LOCAL_SALES_KEY, SALES);
  writeLocal(
    LOCAL_SALES_KEY,
    sales.filter((sale) => String(sale.hotelId) !== String(id)),
  );

  const users = readLocal(LOCAL_ADMIN_USERS_KEY, ADMIN_USERS);
  writeLocal(
    LOCAL_ADMIN_USERS_KEY,
    users.map((user) =>
      String(user.hotelId) === String(id)
        ? { ...user, hotelId: null, status: 'Borrador' }
        : user,
    ),
  );
}

export async function listRecommendations() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(fromRecommendationRow);
  }

  return readLocal(LOCAL_RECOMMENDATIONS_KEY, PLATFORM_SETTINGS.recommendations);
}

export async function listPublicCatalog(slug = null) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('get_public_catalog', { p_slug: slug });
    if (error) throw error;
    return { hotels: data.hotel ? [fromHotelRow(data.hotel)] : [],
      recommendations: (data.recommendations || []).map(fromRecommendationRow) };
  }
  const hotels = (await listHotels()).filter((hotel) => hotel.status === 'Activo');
  const hotel = slug ? hotels.find((item) => item.slug === slug) : hotels[0];
  return { hotels: hotel ? [hotel] : [], recommendations: hotel ? (await listRecommendations())
    .filter((item) => String(item.hotelId) === String(hotel.id) && item.status === 'Publicado') : [] };
}

export async function createRecommendation(payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('recommendations')
      .insert(toRecommendationRow(payload))
      .select()
      .single();

    if (error) throw error;
    return fromRecommendationRow(data);
  }

  const recommendations = readLocal(
    LOCAL_RECOMMENDATIONS_KEY,
    PLATFORM_SETTINGS.recommendations,
  );
  const split = getRecommendationSplit(payload);
  const created = { ...payload, ...split, id: makeId('rec') };
  writeLocal(LOCAL_RECOMMENDATIONS_KEY, [created, ...recommendations]);
  return created;
}

export async function updateRecommendation(id, payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('recommendations')
      .update(toRecommendationRow(payload))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return fromRecommendationRow(data);
  }

  const recommendations = readLocal(
    LOCAL_RECOMMENDATIONS_KEY,
    PLATFORM_SETTINGS.recommendations,
  );
  const updated = recommendations.map((item) =>
    String(item.id) === String(id) ? { ...item, ...payload, ...getRecommendationSplit(payload) } : item,
  );
  writeLocal(LOCAL_RECOMMENDATIONS_KEY, updated);
  return updated.find((item) => String(item.id) === String(id));
}

export async function deleteRecommendation(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('recommendations').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  const recommendations = readLocal(
    LOCAL_RECOMMENDATIONS_KEY,
    PLATFORM_SETTINGS.recommendations,
  );
  writeLocal(
    LOCAL_RECOMMENDATIONS_KEY,
    recommendations.filter((item) => String(item.id) !== String(id)),
  );
}

export async function listEvents() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(fromEventRow);
  }

  return readLocal(LOCAL_EVENTS_KEY, ADMIN_EVENTS);
}

export async function createEvent(payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('events')
      .insert(toEventRow(payload))
      .select()
      .single();

    if (error) throw error;
    return fromEventRow(data);
  }

  const events = readLocal(LOCAL_EVENTS_KEY, ADMIN_EVENTS);
  const created = { ...payload, id: makeId('event') };
  writeLocal(LOCAL_EVENTS_KEY, [created, ...events]);
  return created;
}

export async function updateEvent(id, payload) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('events')
      .update(toEventRow(payload))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return fromEventRow(data);
  }

  const events = readLocal(LOCAL_EVENTS_KEY, ADMIN_EVENTS);
  const updated = events.map((event) =>
    String(event.id) === String(id) ? { ...event, ...payload } : event,
  );
  writeLocal(LOCAL_EVENTS_KEY, updated);
  return updated.find((event) => String(event.id) === String(id));
}

export async function deleteEvent(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  const events = readLocal(LOCAL_EVENTS_KEY, ADMIN_EVENTS);
  writeLocal(
    LOCAL_EVENTS_KEY,
    events.filter((event) => String(event.id) !== String(id)),
  );
}

export async function listSales() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(fromSaleRow);
  }

  return readLocal(LOCAL_SALES_KEY, SALES);
}

export async function createSale(payload) {
  if (isSupabaseConfigured) {
    throw new Error('Registrá el cobro desde la bandeja de reservas.');
  }

  const sales = readLocal(LOCAL_SALES_KEY, SALES);
  const split = getSaleSplit(payload);
  const created = {
    ...payload,
    ...split,
    id: payload.id || makeId('sale'),
    quantity: Number(payload.quantity) || 1,
    amount: Number(payload.amount) || 0,
    status: payload.status || 'Cobrado',
    createdAt: payload.createdAt || new Date().toISOString(),
  };
  writeLocal(LOCAL_SALES_KEY, [created, ...sales]);
  return created;
}

export async function updateSale(id, payload) {
  if (isSupabaseConfigured) {
    throw new Error('Los importes de una reserva registrada no se pueden editar.');
  }

  const sales = readLocal(LOCAL_SALES_KEY, SALES);
  const updated = sales.map((sale) =>
    String(sale.id) === String(id)
      ? {
          ...sale,
          ...payload,
          ...getSaleSplit(payload),
          quantity: Number(payload.quantity) || 1,
          amount: Number(payload.amount) || 0,
        }
      : sale,
  );
  writeLocal(LOCAL_SALES_KEY, updated);
  return updated.find((sale) => String(sale.id) === String(id));
}

export async function deleteSale(id) {
  if (isSupabaseConfigured) {
    throw new Error('Los cobros se conservan como historial.');
  }

  const sales = readLocal(LOCAL_SALES_KEY, SALES);
  writeLocal(
    LOCAL_SALES_KEY,
    sales.filter((sale) => String(sale.id) !== String(id)),
  );
}

export async function createGuestBooking(recommendationId, form, hotelId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('create_guest_booking', {
      p_request_id: form.requestId, p_recommendation_id: recommendationId, p_hotel_id: hotelId,
      p_guest_name: form.guestName.trim(), p_guest_room: form.guestRoom.trim(),
      p_guest_contact: form.guestContact.trim(), p_quantity: Number(form.quantity),
      p_service_date: form.serviceDate, p_service_time: form.serviceTime,
      p_end_date: form.endDate || null, p_end_time: form.endTime || null,
      p_pickup_location: form.pickupLocation.trim(),
    });
    if (error) throw error;
    return fromSaleRow(data);
  }
  const start = validateBooking(form);
  const recommendations = await listRecommendations();
  const item = recommendations.find((rec) => String(rec.id) === String(recommendationId));
  if (!item?.bookable || item.status === 'Borrador' || String(item.hotelId) !== String(hotelId)) {
    throw new Error('Este servicio ya no está disponible en el hotel.');
  }
  const quote = quoteBooking(item, form);
  const expiresAt = new Date(Math.min(Date.now() + 86400000, start.getTime())).toISOString();
  const payload = {
    ...quote, id: form.requestId, hotelId, recommendationId: item.id, recommendationTitle: item.title,
    guestName: form.guestName.trim(), guestRoom: form.guestRoom.trim(), guestContact: form.guestContact.trim(),
    serviceDate: form.serviceDate, serviceTime: form.serviceTime,
    endDate: form.endDate || null, endTime: form.endTime || null,
    pickupLocation: form.pickupLocation.trim(),
    bookingCode: `LL-${form.requestId.replaceAll('-', '').slice(0, 12).toUpperCase()}`,
    bookingStatus: 'Solicitada', paymentMethod: 'cash', status: 'Reservado', expiresAt,
    receptionistName: 'Reserva web', note: 'Disponibilidad pendiente de confirmación del proveedor.',
  };
  const existing = readLocal(LOCAL_SALES_KEY, SALES).find((sale) => sale.id === payload.id);
  if (existing) return existing;
  return createSale(payload);
}

export async function processBooking(sale, action, user) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('process_booking', { p_sale_id: sale.id, p_action: action });
    if (error) throw error;
    return fromSaleRow(data);
  }
  if (user.role !== 'super_admin' && String(user.hotelId) !== String(sale.hotelId)) {
    throw new Error('Esta reserva pertenece a otro hotel.');
  }
  const now = new Date().toISOString();
  const expired = !sale.expiresAt || new Date(sale.expiresAt) <= new Date();
  let patch;
  if (action === 'confirm' && sale.bookingStatus === 'Solicitada' && sale.status === 'Reservado' && !expired) {
    patch = { bookingStatus: 'Confirmada' };
  } else if (action === 'collect' && canCollectCash(sale)) {
    patch = { status: 'Cobrado', paidAt: now, collectedBy: user.name };
  } else if (action === 'cancel' && sale.status === 'Reservado' && sale.bookingStatus !== 'Cancelada') {
    patch = { bookingStatus: 'Cancelada', status: 'Anulado' };
  } else {
    throw new Error('El cupón venció o su estado ya cambió. Actualizá las reservas.');
  }
  const mutate = () => {
    const sales = readLocal(LOCAL_SALES_KEY, SALES);
    const current = sales.find((item) => item.id === sale.id);
    if (!current || current.status !== sale.status || current.bookingStatus !== sale.bookingStatus) {
      throw new Error('La reserva ya fue procesada.');
    }
    const updated = { ...current, ...patch };
    writeLocal(LOCAL_SALES_KEY, sales.map((item) => item.id === sale.id ? updated : item));
    return updated;
  };
  return navigator.locks ? navigator.locks.request(`booking-${sale.id}`, mutate) : mutate();
}
