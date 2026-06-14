import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, RECOMMENDATIONS } from './data/recommendations';
import AboutZone from './components/AboutZone';
import CategoryFilter from './components/CategoryFilter';
import CheckoutModal from './components/CheckoutModal';
import DetailModal from './components/DetailModal';
import Footer from './components/Footer';
import Hero from './components/Hero';
import HotelBranding from './components/HotelBranding';
import Navbar from './components/Navbar';
import RecommendationCard from './components/RecommendationCard';
import SearchBar from './components/SearchBar';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminLogin from './components/admin/AdminLogin';
import { getSessionUser } from './data/adminMock';
import { createSale, listHotels, listRecommendations } from './services/adminDataService';
import './index.css';

export default function App() {
  const path = window.location.pathname;

  if (path.startsWith('/admin/login')) {
    return <AdminLogin />;
  }

  if (path.startsWith('/admin')) {
    const sessionUser = getSessionUser();

    if (!sessionUser) {
      window.history.replaceState(null, '', '/admin/login');
      return <AdminLogin />;
    }

    return <AdminDashboard user={sessionUser} />;
  }

  return <PublicGuide />;
}

function PublicGuide() {
  const path = window.location.pathname;
  const [search, setSearch] = useState('');
  const [activeCategory, setCategory] = useState('todos');
  const [hotels, setHotels] = useState([]);
  const [recommendations, setRecommendations] = useState(RECOMMENDATIONS);
  const [selectedRec, setSelectedRec] = useState(null);
  const [checkoutRec, setCheckoutRec] = useState(null);

  useEffect(() => {
    async function loadPublicData() {
      try {
        const [hotelData, recommendationData] = await Promise.all([
          listHotels(),
          listRecommendations(),
        ]);
        const publishedRecommendations = recommendationData.filter(
          (item) => !item.status || item.status === 'Publicado',
        );
        setHotels(hotelData);
        setRecommendations(
          publishedRecommendations.length >= 3 ? recommendationData : RECOMMENDATIONS,
        );
      } catch {
        setRecommendations(RECOMMENDATIONS);
      }
    }

    loadPublicData();
  }, []);

  const activeHotel = useMemo(() => {
    const slug = path.startsWith('/h/') ? decodeURIComponent(path.split('/h/')[1]?.split('/')[0] || '') : '';
    return hotels.find((hotel) => hotel.slug === slug) || hotels[0] || null;
  }, [hotels, path]);
  const activeHotelId = activeHotel?.id;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return recommendations
      .filter((item) => {
        const matchesHotel =
          !activeHotelId || !item.hotelId || String(item.hotelId) === String(activeHotelId);
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
      // Priorizamos los servicios que más comisión dejan (orden interno, el huésped no ve el monto).
      .sort(
        (a, b) =>
          Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
          (Number(b.commission) || 0) - (Number(a.commission) || 0),
      );
  }, [activeCategory, activeHotelId, recommendations, search]);

  const activeLabel =
    CATEGORIES.find((category) => category.id === activeCategory)?.label || 'Servicios';

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#f7f1e6_0,#f3e9d8_34%,#f2e7d4_68%,#fbf6ec_100%)] text-[#2a1d18]">
      <Navbar hotel={activeHotel} />

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
                Servicios del hotel
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#2a1d18] sm:text-3xl">
                {activeLabel === 'Todos' ? 'Reservá y pagá tu estadía' : activeLabel}
              </h2>
            </div>
            <span className="w-fit rounded-full border border-[#e6d7bf] bg-white/80 px-4 py-2 text-sm font-semibold text-[#6e1f2c] shadow-sm">
              {filtered.length} {filtered.length === 1 ? 'servicio' : 'servicios'}
            </span>
          </div>

          {filtered.length > 0 ? (
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

        <HotelBranding hotel={activeHotel} />
        <AboutZone />
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
          autoCharge={Boolean(activeHotel?.autoCharge)}
          rec={checkoutRec}
          onClose={() => setCheckoutRec(null)}
          onConfirm={async ({ guestName, guestRoom, quantity, amount }) => {
            const auto = Boolean(activeHotel?.autoCharge);
            await createSale({
              hotelId: activeHotel?.id || checkoutRec.hotelId || null,
              recommendationId: checkoutRec.id,
              recommendationTitle: checkoutRec.title,
              receptionistId: null,
              receptionistName: 'Reserva web',
              guestName,
              guestRoom,
              quantity,
              amount,
              commission: (Number(checkoutRec.commission) || 0) * quantity,
              status: auto ? 'Cobrado' : 'Pendiente',
              note: auto ? 'Reserva online (cobro automático)' : 'Reserva online del huésped',
            });
          }}
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
