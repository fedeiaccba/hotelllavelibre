import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearSessionUser, setSessionUser } from '../../data/adminMock';
import { CATEGORIES } from '../../data/recommendations';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import {
  createHotel,
  createAdminUser,
  createEvent,
  createRecommendation,
  deleteAdminUser,
  deleteEvent,
  deleteHotel,
  deleteRecommendation,
  listAdminUsers,
  listEvents,
  listHotels,
  listRecommendations,
  updateAdminUser,
  updateEvent,
  updateHotel,
  updateRecommendation,
} from '../../services/adminDataService';
import BrandMark from '../BrandMark';
import Icon from '../Icon';

const EMPTY_HOTEL = {
  name: '',
  slug: '',
  location: 'Albufeira, Algarve, Portugal',
  plan: 'Premium',
  status: 'Activo',
  adminName: '',
  publicUrl: '',
  qrScans: 0,
};

const EMPTY_RECOMMENDATION = {
  hotelId: '',
  title: '',
  subtitle: '',
  category: 'imperdibles',
  shortDescription: '',
  fullDescription: '',
  image: '',
  distance: '',
  duration: '',
  difficulty: '',
  location: '',
  hours: '',
  mapUrl: '',
  status: 'Publicado',
  featured: false,
  tips: [],
};

const EMPTY_ADMIN_USER = {
  name: '',
  email: '',
  password: '123456',
  role: 'hotel_admin',
  hotelId: '',
  status: 'Activo',
};

const EMPTY_EVENT = {
  hotelId: '',
  title: '',
  date: '',
  category: 'Local',
  status: 'Publicado',
};

const ROLE_LABELS = {
  super_admin: 'Super admin',
  hotel_admin: 'Hotel admin',
};

const SCHEMA_EXPORT = `create table public.admin_users (...);
create table public.hotels (...);
create table public.recommendations (...);
create table public.events (...);

El archivo completo esta en supabase/schema.sql.`;

export default function AdminDashboard({ user }) {
  const isSuperAdmin = user.role === 'super_admin';
  const [adminUsers, setAdminUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [hotelData, recommendationData, eventData, adminUserData] = await Promise.all([
        listHotels(),
        listRecommendations(),
        listEvents(),
        isSuperAdmin ? listAdminUsers() : Promise.resolve([]),
      ]);
      setHotels(hotelData);
      setRecommendations(recommendationData);
      setEvents(eventData);
      setAdminUsers(adminUserData);
    } catch (currentError) {
      setError(currentError.message || 'No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const scopedHotels = useMemo(
    () => {
      if (isSuperAdmin) return hotels;
      const assignedHotels = hotels.filter((hotel) => String(hotel.id) === String(user.hotelId));
      return assignedHotels.length > 0 ? assignedHotels : hotels.slice(0, 1);
    },
    [hotels, isSuperAdmin, user.hotelId],
  );
  const activeHotel = scopedHotels[0] || hotels[0];
  const scopedRecommendations = useMemo(
    () =>
      isSuperAdmin
        ? recommendations
        : recommendations.filter((item) => String(item.hotelId) === String(activeHotel?.id)),
    [activeHotel?.id, isSuperAdmin, recommendations],
  );
  const scopedEvents = events.filter(
    (item) => isSuperAdmin || String(item.hotelId) === String(activeHotel?.id),
  );

  function handleLogout() {
    clearSessionUser();
    window.location.href = '/admin/login';
  }

  async function saveHotel(payload) {
    try {
      setError('');
      if (modal?.mode === 'edit-hotel') {
        await updateHotel(modal.item.id, payload);
      } else {
        await createHotel({
          ...payload,
          publicUrl: payload.publicUrl || `/h/${payload.slug}`,
        });
      }
      setModal(null);
      await loadData();
    } catch (currentError) {
      setError(currentError.message || 'No se pudo guardar el hotel.');
    }
  }

  async function saveRecommendation(payload) {
    try {
      setError('');
      const normalized = {
        ...payload,
        hotelId: payload.hotelId || activeHotel?.id,
        tips: typeof payload.tips === 'string'
          ? payload.tips.split('\n').map((tip) => tip.trim()).filter(Boolean)
          : payload.tips,
      };

      if (modal?.mode === 'edit-recommendation') {
        await updateRecommendation(modal.item.id, normalized);
      } else {
        await createRecommendation(normalized);
      }
      setModal(null);
      await loadData();
    } catch (currentError) {
      setError(currentError.message || 'No se pudo guardar la recomendación.');
    }
  }

  async function saveAdminUser(payload) {
    try {
      setError('');
      const normalized = {
        ...payload,
        hotelId: payload.role === 'hotel_admin' ? payload.hotelId : null,
      };

      let savedUser;
      if (modal?.mode === 'edit-admin-user') {
        savedUser = await updateAdminUser(modal.item.id, normalized);
      } else {
        savedUser = await createAdminUser(normalized);
      }

      if (String(savedUser?.id) === String(user.id)) {
        setSessionUser(savedUser);
      }

      setModal(null);
      await loadData();
    } catch (currentError) {
      setError(currentError.message || 'No se pudo guardar el usuario.');
    }
  }

  async function saveEvent(payload) {
    try {
      setError('');
      const normalized = {
        ...payload,
        hotelId: payload.hotelId || activeHotel?.id,
      };

      if (modal?.mode === 'edit-event') {
        await updateEvent(modal.item.id, normalized);
      } else {
        await createEvent(normalized);
      }
      setModal(null);
      await loadData();
    } catch (currentError) {
      setError(currentError.message || 'No se pudo guardar el evento.');
    }
  }

  async function removeHotel(hotel) {
    if (!window.confirm(`¿Eliminar ${hotel.name}? También se eliminarán sus recomendaciones.`)) return;
    try {
      setError('');
      await deleteHotel(hotel.id);
      await loadData();
    } catch (currentError) {
      setError(currentError.message || 'No se pudo eliminar el hotel.');
    }
  }

  async function removeRecommendation(recommendation) {
    if (!window.confirm(`¿Eliminar ${recommendation.title}?`)) return;
    try {
      setError('');
      await deleteRecommendation(recommendation.id);
      await loadData();
    } catch (currentError) {
      setError(currentError.message || 'No se pudo eliminar la recomendación.');
    }
  }

  async function removeAdminUser(adminUser) {
    if (String(adminUser.id) === String(user.id)) {
      setError('No podÃ©s eliminar el usuario con el que estÃ¡s conectado.');
      return;
    }
    if (!window.confirm(`Â¿Eliminar acceso de ${adminUser.name}?`)) return;

    try {
      setError('');
      await deleteAdminUser(adminUser.id);
      await loadData();
    } catch (currentError) {
      setError(currentError.message || 'No se pudo eliminar el usuario.');
    }
  }

  async function removeEvent(event) {
    if (!window.confirm(`Â¿Eliminar ${event.title}?`)) return;

    try {
      setError('');
      await deleteEvent(event.id);
      await loadData();
    } catch (currentError) {
      setError(currentError.message || 'No se pudo eliminar el evento.');
    }
  }

  function openPublicGuide() {
    const target = activeHotel?.publicUrl || '/';
    window.open(target, '_blank', 'noopener,noreferrer');
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#f4eefc_0,#f8f5ee_34%,#f3eefb_68%,#fbfaf7_100%)] text-[#252231]">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-[#fbf8ff]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#242130] sm:text-[15px]">
                {isSuperAdmin ? 'Admin General' : activeHotel?.name || 'Hotel admin'}
              </p>
              <p className="hidden text-xs text-[#8e86a5] sm:block">
                {isSupabaseConfigured ? 'Conectado a Supabase' : 'Modo mock local'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-[#e7ddf2] bg-white/75 px-3 py-2 text-xs font-semibold text-[#6f5c92] shadow-sm sm:inline-flex">
              {user.role === 'super_admin' ? 'Super admin' : 'Hotel admin'}
            </span>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[#e7ddf2] bg-white/75 px-3 py-2 text-xs font-semibold text-[#6f5c92] shadow-sm transition hover:border-[#cfc0df]"
              onClick={handleLogout}
              type="button"
            >
              <Icon name="logOut" size={14} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <HeroPanel
          isSuperAdmin={isSuperAdmin}
          onNewHotel={() => setModal({ mode: 'new-hotel' })}
          onNewRecommendation={() => setModal({ mode: 'new-recommendation' })}
          onViewPublic={openPublicGuide}
        />

        {error && (
          <div className="mb-5 rounded-[24px] border border-[#f0d0d2] bg-[#fff7f7] px-4 py-3 text-sm font-medium text-[#8b4a4c]">
            {error}
          </div>
        )}

        <StatsGrid
          events={scopedEvents.length}
          hotels={scopedHotels.length}
          recommendations={scopedRecommendations.length}
          scans={scopedHotels.reduce((total, hotel) => total + Number(hotel.qrScans || 0), 0)}
        />

        {isSuperAdmin ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <HotelsSection
              hotels={scopedHotels}
              loading={loading}
              onDelete={removeHotel}
              onEdit={(hotel) => setModal({ mode: 'edit-hotel', item: hotel })}
              onNew={() => setModal({ mode: 'new-hotel' })}
            />
            <AdminUsersSection
              currentUserId={user.id}
              hotels={hotels}
              loading={loading}
              onDelete={removeAdminUser}
              onEdit={(adminUser) => setModal({ mode: 'edit-admin-user', item: adminUser })}
              onNew={() => setModal({ mode: 'new-admin-user' })}
              users={adminUsers}
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <HotelProfileSection
              hotel={activeHotel}
              onEdit={() => activeHotel && setModal({ mode: 'edit-hotel', item: activeHotel })}
            />
            <CategoriesSection onSchema={() => setModal({ mode: 'schema' })} />
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <RecommendationsSection
            hotels={hotels}
            loading={loading}
            onDelete={removeRecommendation}
            onEdit={(recommendation) =>
              setModal({ mode: 'edit-recommendation', item: recommendation })
            }
            onNew={() => setModal({ mode: 'new-recommendation' })}
            recommendations={scopedRecommendations}
          />
          <EventsSection
            events={scopedEvents}
            hotels={hotels}
            loading={loading}
            onDelete={removeEvent}
            onEdit={(event) => setModal({ mode: 'edit-event', item: event })}
            onNew={() => setModal({ mode: 'new-event' })}
          />
        </div>

        {isSuperAdmin && (
          <div className="mt-6">
            <CategoriesSection onSchema={() => setModal({ mode: 'schema' })} />
          </div>
        )}
      </section>

      {modal?.mode?.includes('hotel') && (
        <CrudModal
          onClose={() => setModal(null)}
          title={modal.mode === 'edit-hotel' ? 'Editar hotel' : 'Nuevo hotel'}
        >
          <HotelForm
            initialValue={modal.item || EMPTY_HOTEL}
            onCancel={() => setModal(null)}
            onSubmit={saveHotel}
          />
        </CrudModal>
      )}

      {modal?.mode?.includes('recommendation') && (
        <CrudModal
          onClose={() => setModal(null)}
          title={
            modal.mode === 'edit-recommendation'
              ? 'Editar recomendación'
              : 'Nueva recomendación'
          }
        >
          <RecommendationForm
            activeHotelId={activeHotel?.id}
            hotels={hotels}
            initialValue={modal.item || EMPTY_RECOMMENDATION}
            isSuperAdmin={isSuperAdmin}
            onCancel={() => setModal(null)}
            onSubmit={saveRecommendation}
          />
        </CrudModal>
      )}

      {modal?.mode?.includes('admin-user') && (
        <CrudModal
          onClose={() => setModal(null)}
          title={modal.mode === 'edit-admin-user' ? 'Editar acceso' : 'Nuevo acceso'}
        >
          <AdminUserForm
            hotels={hotels}
            initialValue={modal.item || EMPTY_ADMIN_USER}
            onCancel={() => setModal(null)}
            onSubmit={saveAdminUser}
          />
        </CrudModal>
      )}

      {modal?.mode?.includes('event') && (
        <CrudModal
          onClose={() => setModal(null)}
          title={modal.mode === 'edit-event' ? 'Editar evento' : 'Nuevo evento'}
        >
          <EventForm
            activeHotelId={activeHotel?.id}
            hotels={hotels}
            initialValue={modal.item || EMPTY_EVENT}
            isSuperAdmin={isSuperAdmin}
            onCancel={() => setModal(null)}
            onSubmit={saveEvent}
          />
        </CrudModal>
      )}

      {modal?.mode === 'schema' && (
        <CrudModal onClose={() => setModal(null)} title="Schema y datos">
          <SchemaPanel onClose={() => setModal(null)} />
        </CrudModal>
      )}
    </main>
  );
}

function HeroPanel({ isSuperAdmin, onNewHotel, onNewRecommendation, onViewPublic }) {
  return (
    <div className="mb-7 rounded-[34px] border border-white/85 bg-white/72 p-6 shadow-[0_18px_55px_rgba(96,75,132,0.08)] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8e86a5]">
            LlaveLibre · {isSuperAdmin ? 'Panel de administración general' : 'Panel de gestión del hotel'}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[#242130] sm:text-4xl">
            {isSuperAdmin
              ? 'Control central de hoteles y contenido'
              : 'Tu guía turística para huéspedes'}
          </h1>
          <p className="mt-3 border-l-2 border-[#d6a95d] pl-4 text-sm leading-7 text-[#6f6a7f] sm:text-[15px]">
            {isSuperAdmin
              ? 'CRUD de hoteles y recomendaciones conectado a Supabase cuando haya credenciales configuradas.'
              : 'Gestioná la información, las recomendaciones y la experiencia que se abre desde el QR.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && <ActionButton icon="plus" label="Nuevo hotel" onClick={onNewHotel} />}
          <ActionButton icon="list" label="Nueva recomendación" onClick={onNewRecommendation} />
          <ActionButton icon="eye" label="Ver web pública" onClick={onViewPublic} variant="soft" />
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ events, hotels, recommendations, scans }) {
  const stats = [
    { icon: 'hotel', label: 'Hoteles', value: hotels },
    { icon: 'list', label: 'Recomendaciones', value: recommendations },
    { icon: 'calendar', label: 'Eventos', value: events },
    { icon: 'chart', label: 'Escaneos QR', value: scans.toLocaleString('es-ES') },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {stats.map((stat) => (
        <div
          className="rounded-[28px] border border-white/85 bg-white/78 p-4 shadow-[0_14px_40px_rgba(96,75,132,0.08)] sm:p-5"
          key={stat.label}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f0e8f8] text-[#6f5c92]">
            <Icon name={stat.icon} size={20} />
          </span>
          <p className="mt-4 text-2xl font-semibold text-[#242130]">{stat.value}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a91aa]">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function HotelsSection({ hotels, loading, onDelete, onEdit, onNew }) {
  return (
    <Panel
      action={<ActionButton icon="plus" label="Crear hotel" onClick={onNew} size="sm" />}
      eyebrow="Administración general"
      icon="hotel"
      title="Hoteles"
    >
      {loading ? (
        <EmptyPanelText>Cargando hoteles...</EmptyPanelText>
      ) : hotels.length === 0 ? (
        <EmptyPanelText>No hay hoteles todavÃ­a.</EmptyPanelText>
      ) : (
        <div className="space-y-3">
          {hotels.map((hotel) => (
            <div
              className="grid gap-4 rounded-[24px] border border-[#efe7f6] bg-[#fbf8ff] p-4 lg:grid-cols-[1fr_auto]"
              key={hotel.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#242130]">{hotel.name}</h3>
                  <StatusPill status={hotel.status} />
                </div>
                <p className="mt-1 text-xs leading-5 text-[#7d758d]">{hotel.location}</p>
                <p className="mt-2 text-xs font-medium text-[#9a91aa]">
                  {hotel.recommendations || 0} recomendaciones ·{' '}
                  {Number(hotel.qrScans || 0).toLocaleString('es-ES')} escaneos ·{' '}
                  {hotel.lastUpdate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <IconButton icon="edit" label="Editar" onClick={() => onEdit(hotel)} />
                <IconButton icon="x" label="Eliminar" onClick={() => onDelete(hotel)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function AdminUsersSection({ currentUserId, hotels, loading, onDelete, onEdit, onNew, users }) {
  return (
    <Panel
      action={<ActionButton icon="users" label="Crear acceso" onClick={onNew} size="sm" />}
      eyebrow="Solo superadmin"
      icon="users"
      title="Roles y accesos"
    >
      {loading ? (
        <EmptyPanelText>Cargando usuarios...</EmptyPanelText>
      ) : users.length === 0 ? (
        <EmptyPanelText>No hay usuarios administrativos.</EmptyPanelText>
      ) : (
        <div className="space-y-3">
          {users.map((adminUser) => {
            const hotel = hotels.find((item) => String(item.id) === String(adminUser.hotelId));
            return (
              <div
                className="grid gap-3 rounded-[24px] border border-[#efe7f6] bg-[#fbf8ff] p-4 sm:grid-cols-[1fr_auto]"
                key={adminUser.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-[#242130]">{adminUser.name}</h3>
                    <StatusPill status={adminUser.status || 'Activo'} />
                  </div>
                  <p className="mt-1 truncate text-xs leading-5 text-[#7d758d]">{adminUser.email}</p>
                  <p className="mt-2 text-xs font-medium text-[#9a91aa]">
                    {ROLE_LABELS[adminUser.role] || adminUser.role}
                    {adminUser.role === 'hotel_admin' ? ` · ${hotel?.name || 'Sin hotel asignado'}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <IconButton icon="edit" label="Editar" onClick={() => onEdit(adminUser)} />
                  <IconButton
                    disabled={String(adminUser.id) === String(currentUserId)}
                    icon="x"
                    label="Eliminar"
                    onClick={() => onDelete(adminUser)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function HotelProfileSection({ hotel, onEdit }) {
  return (
    <Panel
      action={<ActionButton icon="edit" label="Editar datos" onClick={onEdit} size="sm" />}
      eyebrow="Hotel"
      icon="hotel"
      title={hotel?.name || 'Hotel'}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Ubicación" value={hotel?.location} />
        <InfoCard label="Plan" value={hotel?.plan} />
        <InfoCard label="URL pública" value={hotel?.publicUrl} />
        <InfoCard label="Estado" value={hotel?.status} />
      </div>
      <div className="mt-4 rounded-[24px] border border-[#efe7f6] bg-[#fbf8ff] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a91aa]">
          QR del huésped
        </p>
        <div className="mt-3 flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 grid-cols-4 gap-1 rounded-[18px] bg-white p-3 shadow-sm">
            {Array.from({ length: 16 }).map((_, index) => (
              <span
                className={`rounded-sm ${index % 3 === 0 || index === 5 ? 'bg-[#6f5c92]' : 'bg-[#eee6f6]'}`}
                key={index}
              />
            ))}
          </div>
          <p className="text-sm leading-6 text-[#6f6a7f]">
            Código mock preparado para enlazar con la página pública del hotel.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function CategoriesSection({ onSchema }) {
  return (
    <Panel
      action={<ActionButton icon="database" label="Schema listo" onClick={onSchema} size="sm" variant="soft" />}
      eyebrow="Taxonomía"
      icon="grid"
      title="Categorías"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {CATEGORIES.filter((category) => category.id !== 'todos').map((category) => (
          <div
            className="flex items-center justify-between gap-3 rounded-[22px] border border-[#efe7f6] bg-[#fbf8ff] p-3"
            key={category.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0e8f8] text-[#6f5c92]">
                <Icon name={category.icon} size={18} />
              </span>
              <span className="truncate text-sm font-semibold text-[#242130]">{category.label}</span>
            </div>
            <span className="rounded-full bg-[#e6f4ea] px-3 py-1 text-xs font-semibold text-[#356b48]">
              Activa
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RecommendationsSection({ hotels, loading, onDelete, onEdit, onNew, recommendations }) {
  return (
    <Panel
      action={<ActionButton icon="plus" label="Agregar" onClick={onNew} size="sm" />}
      eyebrow="Contenido público"
      icon="list"
      title="Recomendaciones"
    >
      {loading ? (
        <EmptyPanelText>Cargando recomendaciones...</EmptyPanelText>
      ) : recommendations.length === 0 ? (
        <EmptyPanelText>No hay recomendaciones todavía.</EmptyPanelText>
      ) : (
        <div className="space-y-3">
          {recommendations.map((item) => {
            const hotel = hotels.find((current) => String(current.id) === String(item.hotelId));
            return (
              <div
                className="flex gap-3 rounded-[24px] border border-[#efe7f6] bg-[#fbf8ff] p-3"
                key={item.id}
              >
                <img
                  alt={item.title}
                  className="h-16 w-16 shrink-0 rounded-[18px] object-cover"
                  src={item.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80'}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-[#242130]">{item.title}</h3>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#7d758d]">{item.location}</p>
                  <p className="mt-1 text-xs font-medium text-[#9a91aa]">
                    {hotel?.name || 'Hotel'} · {item.category} · {item.distance}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <IconButton icon="edit" label="Editar" onClick={() => onEdit(item)} />
                  <IconButton icon="x" label="Eliminar" onClick={() => onDelete(item)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function EventsSection({ events, hotels, loading, onDelete, onEdit, onNew }) {
  return (
    <Panel
      action={<ActionButton icon="calendar" label="Programar" onClick={onNew} size="sm" variant="soft" />}
      eyebrow="Agenda"
      icon="calendar"
      title="Eventos"
    >
      {loading ? (
        <EmptyPanelText>Cargando eventos...</EmptyPanelText>
      ) : events.length === 0 ? (
        <EmptyPanelText>No hay eventos programados.</EmptyPanelText>
      ) : (
        <div className="space-y-3">
        {events.map((event) => {
          const hotel = hotels.find((item) => String(item.id) === String(event.hotelId));
          return (
            <div
              className="rounded-[24px] border border-[#efe7f6] bg-[#fbf8ff] p-4"
              key={event.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#242130]">{event.title}</h3>
                <StatusPill status={event.status} />
              </div>
              <p className="mt-2 text-xs leading-5 text-[#7d758d]">
                {event.date} · {event.category}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-xs font-medium text-[#9a91aa]">{hotel?.name || 'Hotel'}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <IconButton icon="edit" label="Editar" onClick={() => onEdit(event)} />
                  <IconButton icon="x" label="Eliminar" onClick={() => onDelete(event)} />
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </Panel>
  );
}

function HotelForm({ initialValue, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    ...EMPTY_HOTEL,
    ...initialValue,
  });

  function update(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'name' && !current.slug) {
        next.slug = slugify(value);
        next.publicUrl = `/h/${next.slug}`;
      }
      if (key === 'slug') next.publicUrl = `/h/${slugify(value)}`;
      return next;
    });
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => {
      event.preventDefault();
      onSubmit({ ...form, slug: slugify(form.slug || form.name) });
    }}>
      <FormField label="Nombre" onChange={(value) => update('name', value)} required value={form.name} />
      <FormField label="Slug" onChange={(value) => update('slug', value)} required value={form.slug} />
      <FormField label="Ubicación" onChange={(value) => update('location', value)} required value={form.location} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Plan"
          onChange={(value) => update('plan', value)}
          options={['Premium', 'Standard']}
          value={form.plan}
        />
        <SelectField
          label="Estado"
          onChange={(value) => update('status', value)}
          options={['Activo', 'Borrador']}
          value={form.status}
        />
      </div>
      <FormField label="Admin visible" onChange={(value) => update('adminName', value)} value={form.adminName} />
      <FormField label="URL pública" onChange={(value) => update('publicUrl', value)} value={form.publicUrl} />
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function RecommendationForm({ activeHotelId, hotels, initialValue, isSuperAdmin, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    ...EMPTY_RECOMMENDATION,
    ...initialValue,
    hotelId: initialValue.hotelId || activeHotelId || hotels[0]?.id || '',
    tips: Array.isArray(initialValue.tips) ? initialValue.tips.join('\n') : initialValue.tips || '',
  });

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => {
      event.preventDefault();
      onSubmit(form);
    }}>
      {isSuperAdmin && (
        <SelectField
          label="Hotel"
          onChange={(value) => update('hotelId', value)}
          options={hotels.map((hotel) => ({ label: hotel.name, value: hotel.id }))}
          value={form.hotelId}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Título" onChange={(value) => update('title', value)} required value={form.title} />
        <FormField label="Subtítulo" onChange={(value) => update('subtitle', value)} value={form.subtitle} />
      </div>
      <FormField
        label="Descripción corta"
        onChange={(value) => update('shortDescription', value)}
        required
        value={form.shortDescription}
      />
      <TextareaField
        label="Descripción completa"
        onChange={(value) => update('fullDescription', value)}
        value={form.fullDescription}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Categoría"
          onChange={(value) => update('category', value)}
          options={CATEGORIES.filter((category) => category.id !== 'todos').map((category) => ({
            label: category.label,
            value: category.id,
          }))}
          value={form.category}
        />
        <SelectField
          label="Estado"
          onChange={(value) => update('status', value)}
          options={['Publicado', 'Borrador']}
          value={form.status}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Distancia" onChange={(value) => update('distance', value)} value={form.distance} />
        <FormField label="Duración" onChange={(value) => update('duration', value)} value={form.duration} />
        <SelectField
          label="Dificultad"
          onChange={(value) => update('difficulty', value)}
          options={['', 'Fácil', 'Moderado', 'Exigente']}
          value={form.difficulty || ''}
        />
      </div>
      <FormField label="Ubicación" onChange={(value) => update('location', value)} value={form.location} />
      <FormField label="Imagen URL" onChange={(value) => update('image', value)} value={form.image} />
      <FormField label="Google Maps URL" onChange={(value) => update('mapUrl', value)} value={form.mapUrl} />
      <TextareaField
        label="Tips, uno por línea"
        onChange={(value) => update('tips', value)}
        value={form.tips}
      />
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function AdminUserForm({ hotels, initialValue, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    ...EMPTY_ADMIN_USER,
    ...initialValue,
    hotelId: initialValue.hotelId || hotels[0]?.id || '',
  });

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'role' && value === 'super_admin' ? { hotelId: '' } : {}),
    }));
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => {
      event.preventDefault();
      onSubmit(form);
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre" onChange={(value) => update('name', value)} required value={form.name} />
        <FormField label="Email" onChange={(value) => update('email', value)} required type="email" value={form.email} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="ContraseÃ±a" onChange={(value) => update('password', value)} required value={form.password} />
        <SelectField
          label="Rol"
          onChange={(value) => update('role', value)}
          options={[
            { label: 'Hotel admin', value: 'hotel_admin' },
            { label: 'Super admin', value: 'super_admin' },
          ]}
          value={form.role}
        />
      </div>
      {form.role === 'hotel_admin' && (
        <SelectField
          label="Hotel asignado"
          onChange={(value) => update('hotelId', value)}
          options={[
            { label: 'Sin hotel asignado', value: '' },
            ...hotels.map((hotel) => ({ label: hotel.name, value: hotel.id })),
          ]}
          value={form.hotelId}
        />
      )}
      <SelectField
        label="Estado"
        onChange={(value) => update('status', value)}
        options={['Activo', 'Borrador']}
        value={form.status}
      />
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function EventForm({ activeHotelId, hotels, initialValue, isSuperAdmin, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    ...EMPTY_EVENT,
    ...initialValue,
    hotelId: initialValue.hotelId || activeHotelId || hotels[0]?.id || '',
  });

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => {
      event.preventDefault();
      onSubmit(form);
    }}>
      {isSuperAdmin && (
        <SelectField
          label="Hotel"
          onChange={(value) => update('hotelId', value)}
          options={hotels.map((hotel) => ({ label: hotel.name, value: hotel.id }))}
          value={form.hotelId}
        />
      )}
      <FormField label="TÃ­tulo" onChange={(value) => update('title', value)} required value={form.title} />
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Fecha u horario" onChange={(value) => update('date', value)} required value={form.date} />
        <FormField label="CategorÃ­a" onChange={(value) => update('category', value)} value={form.category} />
        <SelectField
          label="Estado"
          onChange={(value) => update('status', value)}
          options={['Publicado', 'Programado', 'Borrador']}
          value={form.status}
        />
      </div>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function SchemaPanel({ onClose }) {
  const [copied, setCopied] = useState(false);

  async function copySchema() {
    await navigator.clipboard.writeText(SCHEMA_EXPORT);
    setCopied(true);
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[24px] border border-[#efe7f6] bg-[#fbf8ff] p-4">
        <p className="text-sm font-semibold text-[#242130]">Tablas activas del sistema</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {['admin_users', 'hotels', 'recommendations', 'events'].map((table) => (
            <span
              className="rounded-full border border-[#e7ddf2] bg-white px-4 py-2 text-xs font-semibold text-[#6f5c92]"
              key={table}
            >
              {table}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          className="rounded-full border border-[#e7ddf2] bg-white px-5 py-3 text-sm font-semibold text-[#6f5c92]"
          onClick={onClose}
          type="button"
        >
          Cerrar
        </button>
        <button
          className="rounded-full bg-[#6f5c92] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(111,92,146,0.22)]"
          onClick={copySchema}
          type="button"
        >
          {copied ? 'Copiado' : 'Copiar resumen'}
        </button>
      </div>
    </div>
  );
}

function CrudModal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#211b2f]/60 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[32px] border border-white/70 bg-white p-5 shadow-[0_-18px_70px_rgba(30,23,45,0.20)] sm:max-w-3xl sm:rounded-[32px] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[#242130]">{title}</h2>
          <button
            aria-label="Cerrar"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0e8f8] text-[#6f5c92]"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Panel({ action, children, eyebrow, icon, title }) {
  return (
    <section className="rounded-[32px] border border-white/85 bg-white/76 p-5 shadow-[0_18px_55px_rgba(96,75,132,0.08)] sm:p-6">
      <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0e8f8] text-[#6f5c92]">
            <Icon name={icon} size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a91aa]">
              {eyebrow}
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold text-[#242130]">{title}</h2>
          </div>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      {children}
    </section>
  );
}

function ActionButton({ icon, label, onClick, size = 'md', variant = 'primary' }) {
  const classes =
    variant === 'primary'
      ? 'bg-[#6f5c92] text-white shadow-[0_14px_30px_rgba(111,92,146,0.22)] hover:bg-[#5d4d7c]'
      : 'border border-[#e7ddf2] bg-white/80 text-[#6f5c92] shadow-sm hover:border-[#cfc0df]';

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98] ${classes} ${
        size === 'sm' ? 'px-3 py-2 text-xs' : 'px-5 py-3 text-sm'
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon name={icon} size={size === 'sm' ? 14 : 16} />
      {label}
    </button>
  );
}

function IconButton({ disabled = false, icon, label, onClick }) {
  return (
    <button
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e7ddf2] bg-white text-[#6f5c92] shadow-sm transition hover:border-[#cfc0df] disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

function StatusPill({ status }) {
  const isActive = status === 'Activo' || status === 'Publicado';
  const isDraft = status === 'Borrador';
  const colors = isActive
    ? 'bg-[#e6f4ea] text-[#356b48]'
    : isDraft
      ? 'bg-[#f8f0d8] text-[#8c6b1f]'
      : 'bg-[#efe6f7] text-[#73518e]';

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors}`}>{status}</span>;
}

function InfoCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-[22px] border border-[#efe7f6] bg-[#fbf8ff] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9a91aa]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[#242130]">{value || '-'}</p>
    </div>
  );
}

function EmptyPanelText({ children }) {
  return (
    <div className="rounded-[24px] border border-[#efe7f6] bg-[#fbf8ff] p-5 text-sm text-[#6f6a7f]">
      {children}
    </div>
  );
}

function FormField({ label, onChange, required = false, type = 'text', value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#8e86a5]">
        {label}
      </span>
      <input
        className="h-12 w-full rounded-full border border-[#e8def3] bg-white px-4 text-sm font-medium text-[#242130] outline-none transition focus:border-[#b9a8d3] focus:ring-4 focus:ring-[#ded2ef]/70"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value || ''}
      />
    </label>
  );
}

function TextareaField({ label, onChange, value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#8e86a5]">
        {label}
      </span>
      <textarea
        className="min-h-28 w-full resize-y rounded-[24px] border border-[#e8def3] bg-white px-4 py-3 text-sm font-medium leading-6 text-[#242130] outline-none transition focus:border-[#b9a8d3] focus:ring-4 focus:ring-[#ded2ef]/70"
        onChange={(event) => onChange(event.target.value)}
        value={value || ''}
      />
    </label>
  );
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#8e86a5]">
        {label}
      </span>
      <select
        className="h-12 w-full rounded-full border border-[#e8def3] bg-white px-4 text-sm font-medium text-[#242130] outline-none transition focus:border-[#b9a8d3] focus:ring-4 focus:ring-[#ded2ef]/70"
        onChange={(event) => onChange(event.target.value)}
        value={value || ''}
      >
        {options.map((option) => {
          const normalized = typeof option === 'string' ? { label: option || 'Sin dificultad', value: option } : option;
          return (
            <option key={normalized.value} value={normalized.value}>
              {normalized.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function FormActions({ onCancel }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <button
        className="rounded-full border border-[#e7ddf2] bg-white px-5 py-3 text-sm font-semibold text-[#6f5c92]"
        onClick={onCancel}
        type="button"
      >
        Cancelar
      </button>
      <button
        className="rounded-full bg-[#6f5c92] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(111,92,146,0.22)]"
        type="submit"
      >
        Guardar cambios
      </button>
    </div>
  );
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
