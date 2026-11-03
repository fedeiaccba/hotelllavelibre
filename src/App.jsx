import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES } from './data/recommendations';
import CategoryFilter from './components/CategoryFilter';
import CheckoutModal from './components/CheckoutModal';
import DetailModal from './components/DetailModal';
import Footer from './components/Footer';
import Hero from './components/Hero';
import Navbar from './components/Navbar';
import RecommendationCard from './components/RecommendationCard';
import SearchBar from './components/SearchBar';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminLogin from './components/admin/AdminLogin';
import { createGuestBooking, listPublicCatalog } from './services/adminDataService';
import { getAuthenticatedAdmin } from './services/authService';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';
import './index.css';

export default function App() {
  const path = window.location.pathname;

  if (path.startsWith('/admin')) return <AdminGate />;

  return <PublicGuide />;
}

function AdminGate() {
  const [state, setState] = useState({ loading: true, user: null, error: '' });
  useEffect(() => {
    let alive = true;
    let revision = 0;
    async function refresh() {
      const current = ++revision;
      try {
        const user = await getAuthenticatedAdmin();
        if (alive && current === revision) setState({ loading: false, user, error: '' });
      } catch (error) {
        if (alive && current === revision) setState({ loading: false, user: null, error: error.message });
      }
    }
    void refresh();
    // Run Supabase queries outside its auth callback lock.
    const listener = isSupabaseConfigured ? supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        revision += 1;
        if (alive) setState({ loading: false, user: null, error: '' });
      } else if (event !== 'INITIAL_SESSION') setTimeout(() => { if (alive) void refresh(); }, 0);
    }) : null;
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { alive = false; listener?.data.subscription.unsubscribe(); document.removeEventListener('visibilitychange', visible); };
  }, []);
  if (state.loading) return <main className="p-8" role="status">Verificando acceso...</main>;
  if (state.user && !window.location.pathname.startsWith('/admin/login')) return <AdminDashboard key={`${state.user.authUserId || state.user.id}:${state.user.role}:${state.user.hotelId}`} user={state.user} />;
  return <AdminLogin initialError={state.error} />;
}

function PublicGuide() {
  const path = window.location.pathname;
  const [search, setSearch] = useState('');
  const [activeCategory, setCategory] = useState('excursion');
  const [hotels, setHotels] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedRec, setSelectedRec] = useState(null);
  const [checkoutRec, setCheckoutRec] = useState(null);

  useEffect(() => {
    async function loadPublicData() {
      try {
        const slug = path.startsWith('/h/') ? decodeURIComponent(path.split('/h/')[1]?.split('/')[0] || '') : null;
        const { hotels: hotelData, recommendations: recommendationData } = await listPublicCatalog(slug);
        const publishedRecommendations = recommendationData.filter(
          (item) => !item.status || item.status === 'Publicado',
        );
        setHotels(hotelData);
        setRecommendations(publishedRecommendations);
      } catch {
        setLoadError('No pudimos cargar las experiencias. Volvé a cargar la página.');
      } finally { setLoading(false); }
    }

    loadPublicData();
  }, [path]);

  const activeHotel = useMemo(() => {
    const slug = path.startsWith('/h/') ? decodeURIComponent(path.split('/h/')[1]?.split('/')[0] || '') : '';
    return slug ? hotels.find((hotel) => hotel.slug === slug) || null : hotels[0] || null;
  }, [hotels, path]);
  const activeHotelId = activeHotel?.id;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return recommendations
      .filter((item) => {
        const matchesHotel =
          activeHotelId && String(item.hotelId) === String(activeHotelId);
        const isPublished = !item.status || item.status === 'Publicado';
        const matchesCategory = activeCategory === 'todos' || item.category === activeCategory;
        const matchesSearch =
          !query ||
          [item.title, item.subtitle, item.shortDescription, item.category, item.provider]
            .join(' ')
            .toLowerCase()
            .includes(query);

        return matchesHotel && isPublished && matchesCategory && matchesSearch;
      })
      .sort(
        (a, b) =>
          Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
          a.title.localeCompare(b.title),
      );
  }, [activeCategory, activeHotelId, recommendations, search]);

  const activeLabel =
    CATEGORIES.find((category) => category.id === activeCategory)?.label || 'Servicios';

  return (
    <div className="public-catalog min-h-screen overflow-x-hidden bg-white text-[#243b39]">
      <Navbar hotel={activeHotel} />
      {!isSupabaseConfigured && <p className="demo-notice">Catálogo de demostración · Las solicitudes se guardan solo en este navegador.</p>}

      <main className="overflow-x-hidden">
        <Hero hotel={activeHotel} />

        <section className="sticky top-[64px] z-30 border-y border-[#ece0cc] bg-[#f6efe2]/97">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="rounded-[28px] border border-white/80 bg-white/55 p-3 shadow-[0_16px_45px_rgba(94,26,42,0.08)] sm:p-4">
              <SearchBar value={search} onChange={setSearch} />
              <CategoryFilter active={activeCategory} onChange={setCategory} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a877a]">
                Experiencias y alquileres
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#2a1d18] sm:text-3xl">
                {activeLabel === 'Todos' ? 'Todas las experiencias' : activeLabel}
              </h2>
            </div>
            <span className="w-fit rounded-full border border-[#e6d7bf] bg-white/80 px-4 py-2 text-sm font-semibold text-[#6e1f2c] shadow-sm">
              {filtered.length} {filtered.length === 1 ? 'servicio' : 'servicios'}
            </span>
          </div>

          {loading ? <p role="status">Cargando experiencias...</p> : loadError ? <p role="alert">{loadError}</p> : !activeHotel ? <p>Este hotel no está disponible.</p> : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {filtered.map((rec, index) => (
                <RecommendationCard
                  key={rec.id}
                  index={index}
                  rec={rec}
                  onCheckout={setCheckoutRec}
                  onSelect={setSelectedRec}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              search={search}
              onClear={() => {
                setSearch('');
                setCategory('todos');
              }}
            />
          )}
        </section>

      </main>

      <Footer hotel={activeHotel} />

      {selectedRec && (
        <DetailModal
          rec={selectedRec}
          onClose={() => setSelectedRec(null)}
          onCheckout={(rec) => {
            setSelectedRec(null);
            setCheckoutRec(rec);
          }}
        />
      )}

      {checkoutRec && (
        <CheckoutModal
          hotel={activeHotel}
          rec={checkoutRec}
          onClose={() => setCheckoutRec(null)}
          onConfirm={(form) => createGuestBooking(checkoutRec.id, form, activeHotel?.id)}
        />
      )}
    </div>
  );
}

function EmptyState({ search, onClear }) {
  return (
    <div className="rounded-[32px] border border-white/80 bg-white/70 px-6 py-14 text-center shadow-[0_18px_50px_rgba(94,26,42,0.08)]">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9a877a]">
        Sin resultados
      </p>
      <h3 className="mt-3 font-display text-2xl font-semibold text-[#2a1d18]">No encontramos coincidencias</h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#7c6a5e]">
        {search
          ? `No hay servicios para "${search}".`
          : 'No hay servicios disponibles en este tipo.'}
      </p>
      <button
        className="mt-7 rounded-full bg-[#6e1f2c] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(94,26,42,0.24)] transition hover:bg-[#561420] active:scale-[0.98]"
        onClick={onClear}
        type="button"
      >
        Ver todas
      </button>
    </div>
  );
}
