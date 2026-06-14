import { useState } from 'react';
import { setSessionUser } from '../../data/adminMock';
import { authenticateAdmin } from '../../services/adminDataService';
import BrandMark from '../BrandMark';
import Icon from '../Icon';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password.trim()) {
      setError('Ingresá email y contraseña.');
      return;
    }

    let user;
    try {
      user = await authenticateAdmin(form.email, form.password);
    } catch (currentError) {
      setError(currentError.message || 'No se pudo iniciar sesión.');
      return;
    }

    if (!user) {
      setError('Email o contraseña incorrectos.');
      return;
    }

    setSessionUser(user);
    window.location.href = '/admin';
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#f7f1e6_0,#f3e9d8_38%,#f2e7d4_72%,#fbf6ec_100%)] px-4 py-8 text-[#2a1d18] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
          <section className="hidden overflow-hidden rounded-[36px] border border-white/80 bg-[#6e1f2c] shadow-[0_24px_70px_rgba(94,26,42,0.18)] lg:block">
            <div className="relative flex h-full min-h-[620px] flex-col justify-between p-10 text-white">
              <img
                alt="Costa de Albufeira"
                className="absolute inset-0 h-full w-full object-cover opacity-50"
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=85"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[#241915]/85 via-[#6e1f2c]/65 to-[#e7cf9b]/30" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#e8c879]/40 bg-white/15 px-4 py-2 text-xs font-semibold text-[#ecca80] backdrop-blur-md">
                  <Icon name="key" size={15} />
                  Conserjería digital
                </span>
                <h1 className="mt-8 max-w-md font-display text-5xl font-semibold leading-[1.08] tracking-tight">
                  La conserjería que ven tus huéspedes, en una sola llave.
                </h1>
              </div>
              <div className="relative grid gap-3">
                {['Hoteles', 'Recomendaciones', 'Cobros y comisiones', 'Eventos'].map((item) => (
                  <div
                    className="rounded-[24px] border border-white/15 bg-white/12 px-5 py-4 text-sm font-semibold backdrop-blur-md"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[36px] border border-white/85 bg-white/78 p-5 shadow-[0_24px_70px_rgba(94,26,42,0.12)] backdrop-blur sm:p-8 lg:p-10">
            <div className="mx-auto flex min-h-[560px] max-w-md flex-col justify-center">
              <div className="mb-8">
                <BrandMark size="md" />
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#9a877a]">
                  Panel administrativo
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#2a1d18]">
                  Ingresar al sistema
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#7c6a5e]">
                  Acceso para administrar hoteles y recomendaciones visibles para huéspedes.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <Field
                  icon="mail"
                  label="Email"
                  onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                  placeholder="tu@email.com"
                  type="email"
                  value={form.email}
                />
                <Field
                  icon="lock"
                  label="Contraseña"
                  onChange={(value) => setForm((current) => ({ ...current, password: value }))}
                  placeholder="Tu contraseña"
                  type="password"
                  value={form.password}
                />

                {error && (
                  <p className="rounded-[18px] border border-[#f0d0d2] bg-[#fff7f7] px-4 py-3 text-sm font-medium text-[#8b4a4c]">
                    {error}
                  </p>
                )}

                <button
                  className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#1a1210] px-6 text-sm font-semibold text-[#ecca80] shadow-[0_16px_34px_rgba(26,18,16,0.22)] transition hover:bg-[#241915] active:scale-[0.98]"
                  type="submit"
                >
                  Ingresar
                  <Icon name="arrowRight" size={16} />
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ icon, label, onChange, placeholder, type, value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#9a877a]">
        {label}
      </span>
      <span className="relative block">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a8978b]"
          name={icon}
          size={18}
        />
        <input
          className="h-14 w-full rounded-full border border-[#e6d7bf] bg-white px-12 text-[15px] font-medium text-[#2a1d18] shadow-sm outline-none transition placeholder:text-[#b6a594] focus:border-[#c49a3f] focus:ring-4 focus:ring-[#e7cf9b]/70"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
      </span>
    </label>
  );
}
