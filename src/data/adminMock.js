import { CATEGORIES, RECOMMENDATIONS } from './recommendations';

export const ADMIN_USERS = [
  {
    id: 1,
    name: 'Admin General',
    email: 'admin@demo.com',
    password: '123456',
    role: 'super_admin',
    hotelId: null,
    status: 'Activo',
  },
  {
    id: 2,
    name: 'Recepción Atlântico',
    email: 'hotel@demo.com',
    password: '123456',
    role: 'hotel_admin',
    hotelId: 101,
    status: 'Activo',
  },
];

export const HOTELS = [
  {
    id: 101,
    name: 'Hotel Atlântico Albufeira',
    slug: 'hotel-atlantico-albufeira',
    location: 'Albufeira, Algarve, Portugal',
    plan: 'Premium',
    status: 'Activo',
    adminName: 'Recepción Atlântico',
    publicUrl: '/h/hotel-atlantico-albufeira',
    qrScans: 1842,
    recommendations: 9,
    lastUpdate: 'Hace 2 h',
  },
  {
    id: 102,
    name: 'Lagos Bay Suites',
    slug: 'lagos-bay-suites',
    location: 'Lagos, Algarve, Portugal',
    plan: 'Standard',
    status: 'Activo',
    adminName: 'Equipo Lagos',
    publicUrl: '/h/lagos-bay-suites',
    qrScans: 924,
    recommendations: 7,
    lastUpdate: 'Ayer',
  },
  {
    id: 103,
    name: 'Carvoeiro Cliff Hotel',
    slug: 'carvoeiro-cliff-hotel',
    location: 'Carvoeiro, Algarve, Portugal',
    plan: 'Premium',
    status: 'Borrador',
    adminName: 'Concierge Carvoeiro',
    publicUrl: '/h/carvoeiro-cliff-hotel',
    qrScans: 312,
    recommendations: 5,
    lastUpdate: 'Hace 5 días',
  },
];

export const ADMIN_EVENTS = [
  {
    id: 1,
    hotelId: 101,
    title: 'FIESA Sand City',
    date: 'Temporada verano',
    category: 'Cultura',
    status: 'Publicado',
  },
  {
    id: 2,
    hotelId: 101,
    title: 'Noche de fado en la Cidade Velha',
    date: 'Viernes 21:00',
    category: 'Música',
    status: 'Programado',
  },
  {
    id: 3,
    hotelId: 102,
    title: 'Mercado artesanal de Lagos',
    date: 'Sábado mañana',
    category: 'Local',
    status: 'Publicado',
  },
];

export const PLATFORM_SETTINGS = {
  categories: CATEGORIES.filter((category) => category.id !== 'todos').map((category) => ({
    ...category,
    status: 'Activa',
    visible: true,
  })),
  recommendations: RECOMMENDATIONS.map((recommendation, index) => ({
    ...recommendation,
    hotelId: 101,
    status: index < 7 ? 'Publicado' : 'Borrador',
    featured: index < 3,
  })),
};

export function getSessionUser() {
  try {
    const stored = window.localStorage.getItem('gringacho_admin_session');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setSessionUser(user) {
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    hotelId: user.hotelId,
    status: user.status || 'Activo',
  };
  window.localStorage.setItem('gringacho_admin_session', JSON.stringify(safeUser));
  return safeUser;
}

export function clearSessionUser() {
  window.localStorage.removeItem('gringacho_admin_session');
}
