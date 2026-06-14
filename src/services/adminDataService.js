import { ADMIN_EVENTS, ADMIN_USERS, HOTELS, PLATFORM_SETTINGS, SALES } from '../data/adminMock';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const LOCAL_ADMIN_USERS_KEY = 'gringacho_admin_users';
const LOCAL_EVENTS_KEY = 'gringacho_events';
const LOCAL_HOTELS_KEY = 'gringacho_hotels';
const LOCAL_RECOMMENDATIONS_KEY = 'gringacho_recommendations';
const LOCAL_SALES_KEY = 'gringacho_sales';

function toAdminUserRow(user) {
  return {
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    hotel_id: user.role === 'hotel_admin' ? user.hotelId || null : null,
    status: user.status || 'Activo',
  };
}

function fromAdminUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
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
    recommendations: row.recommendations || 0,
    lastUpdate: formatDate(row.updated_at),
  };
}

function toRecommendationRow(recommendation) {
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
    commission: Number(recommendation.commission) || 0,
    provider: recommendation.provider || '',
    payment_url: recommendation.paymentUrl || '',
    tips: recommendation.tips || [],
  };
}

function fromRecommendationRow(row) {
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
    price: Number(row.price) || 0,
    commission: Number(row.commission) || 0,
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

function toSaleRow(sale) {
  return {
    hotel_id: sale.hotelId,
    recommendation_id: sale.recommendationId || null,
    recommendation_title: sale.recommendationTitle,
    receptionist_id: sale.receptionistId || null,
    receptionist_name: sale.receptionistName,
    guest_name: sale.guestName || '',
    guest_room: sale.guestRoom || '',
    quantity: Number(sale.quantity) || 1,
    amount: Number(sale.amount) || 0,
    commission: Number(sale.commission) || 0,
    status: sale.status || 'Cobrado',
    note: sale.note || '',
  };
}

function fromSaleRow(row) {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    recommendationId: row.recommendation_id,
    recommendationTitle: row.recommendation_title || '',
    receptionistId: row.receptionist_id,
    receptionistName: row.receptionist_name || '',
    guestName: row.guest_name || '',
    guestRoom: row.guest_room || '',
    quantity: Number(row.quantity) || 1,
    amount: Number(row.amount) || 0,
    commission: Number(row.commission) || 0,
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
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('password', password)
        .eq('status', 'Activo')
        .maybeSingle();

      if (error) throw error;
      return data ? fromAdminUserRow(data) : findLocalAdmin(email, password);
    } catch {
      return findLocalAdmin(email, password);
    }
  }

  return findLocalAdmin(email, password);
}

export async function listAdminUsers() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data.map(fromAdminUserRow);
    } catch {
      return readLocal(LOCAL_ADMIN_USERS_KEY, ADMIN_USERS);
    }
  }

  return readLocal(LOCAL_ADMIN_USERS_KEY, ADMIN_USERS);
}

export async function createAdminUser(payload) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .insert(toAdminUserRow(payload))
        .select()
        .single();

      if (error) throw error;
      return fromAdminUserRow(data);
    } catch {
      // Fall through to the local demo store when the optional Supabase table is not applied yet.
    }
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
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .update(toAdminUserRow(payload))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return fromAdminUserRow(data);
    } catch {
      // Fall through to the local demo store when the optional Supabase table is not applied yet.
    }
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
    try {
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) throw error;
      return;
    } catch {
      // Fall through to the local demo store when the optional Supabase table is not applied yet.
    }
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
  const created = { ...payload, id: makeId('rec') };
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
    String(item.id) === String(id) ? { ...item, ...payload } : item,
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
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(fromEventRow);
    } catch {
      return readLocal(LOCAL_EVENTS_KEY, ADMIN_EVENTS);
    }
  }

  return readLocal(LOCAL_EVENTS_KEY, ADMIN_EVENTS);
}

export async function createEvent(payload) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert(toEventRow(payload))
        .select()
        .single();

      if (error) throw error;
      return fromEventRow(data);
    } catch {
      // Fall through to the local demo store when the optional Supabase table is not applied yet.
    }
  }

  const events = readLocal(LOCAL_EVENTS_KEY, ADMIN_EVENTS);
  const created = { ...payload, id: makeId('event') };
  writeLocal(LOCAL_EVENTS_KEY, [created, ...events]);
  return created;
}

export async function updateEvent(id, payload) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(toEventRow(payload))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return fromEventRow(data);
    } catch {
      // Fall through to the local demo store when the optional Supabase table is not applied yet.
    }
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
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      return;
    } catch {
      // Fall through to the local demo store when the optional Supabase table is not applied yet.
    }
  }

  const events = readLocal(LOCAL_EVENTS_KEY, ADMIN_EVENTS);
  writeLocal(
    LOCAL_EVENTS_KEY,
    events.filter((event) => String(event.id) !== String(id)),
  );
}

export async function listSales() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(fromSaleRow);
    } catch {
      return readLocal(LOCAL_SALES_KEY, SALES);
    }
  }

  return readLocal(LOCAL_SALES_KEY, SALES);
}

export async function createSale(payload) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .insert(toSaleRow(payload))
        .select()
        .single();

      if (error) throw error;
      return fromSaleRow(data);
    } catch {
      // Fall through to the local demo store when the optional Supabase table is not applied yet.
    }
  }

  const sales = readLocal(LOCAL_SALES_KEY, SALES);
  const created = {
    ...payload,
    id: makeId('sale'),
    quantity: Number(payload.quantity) || 1,
    amount: Number(payload.amount) || 0,
    commission: Number(payload.commission) || 0,
    status: payload.status || 'Cobrado',
    createdAt: payload.createdAt || new Date().toISOString(),
  };
  writeLocal(LOCAL_SALES_KEY, [created, ...sales]);
  return created;
}

export async function updateSale(id, payload) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .update(toSaleRow(payload))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return fromSaleRow(data);
    } catch {
      // Fall through to the local demo store when the optional Supabase table is not applied yet.
    }
  }

  const sales = readLocal(LOCAL_SALES_KEY, SALES);
  const updated = sales.map((sale) =>
    String(sale.id) === String(id)
      ? {
          ...sale,
          ...payload,
          quantity: Number(payload.quantity) || 1,
          amount: Number(payload.amount) || 0,
          commission: Number(payload.commission) || 0,
        }
      : sale,
  );
  writeLocal(LOCAL_SALES_KEY, updated);
  return updated.find((sale) => String(sale.id) === String(id));
}

export async function deleteSale(id) {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
      return;
    } catch {
      // Fall through to the local demo store when the optional Supabase table is not applied yet.
    }
  }

  const sales = readLocal(LOCAL_SALES_KEY, SALES);
  writeLocal(
    LOCAL_SALES_KEY,
    sales.filter((sale) => String(sale.id) !== String(id)),
  );
}
