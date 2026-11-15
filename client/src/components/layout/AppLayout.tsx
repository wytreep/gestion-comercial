import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useTema } from '../../context/ThemeContext';
import { notifApi } from '../../api/endpoints';
import { plural } from '../../utils/format';
import { ETIQUETA_TEMA } from '../../utils/theme';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  LayoutDashboard, ReceiptText, PlusCircle, Wallet, HandCoins, Package,
  PackagePlus, Users, Boxes, LogOut, Bell, ChartColumnBig, Database, ArrowUpDown,
  ShieldCheck, BarChart3, Menu, X, Banknote, QrCode, Monitor, Moon, Sun, Check,
} from 'lucide-react';
import clsx from 'clsx';

const ROUTE_META: Record<string, { section: string; label: string }> = {
  '/':                  { section: 'Operación',  label: 'Panel de control' },
  '/ventas':            { section: 'Operación',  label: 'Historial de ventas' },
  '/ventas/nueva':      { section: 'Operación',  label: 'Nueva venta' },
  '/cartera':           { section: 'Operación',  label: 'Cartera y cobros' },
  '/compras':           { section: 'Operación',  label: 'Historial de compras' },
  '/compras/nueva':     { section: 'Operación',  label: 'Nueva compra' },
  '/clientes':          { section: 'Operación',  label: 'Clientes' },
  '/finanzas':          { section: 'Finanzas',   label: 'Finanzas' },
  '/caja':              { section: 'Finanzas',   label: 'Caja y flujo' },
  '/reportes':          { section: 'Finanzas',   label: 'Reportes' },
  '/productos':         { section: 'Inventario', label: 'Productos y precios' },
  '/stock':             { section: 'Inventario', label: 'Movimientos de stock' },
  '/etiquetas':         { section: 'Inventario', label: 'Etiquetas QR' },
  '/notificaciones':    { section: 'Sistema',    label: 'Alertas' },
  '/admin':             { section: 'Sistema',    label: 'Administración' },
  '/backup':            { section: 'Sistema',    label: 'Copias de seguridad' },
};

export default function AppLayout() {
  const { user, logout, isAdmin, isVendedor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useFocusTrap(mobileOpen, drawerRef, () => setMobileOpen(false));

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Al cambiar de sección, el foco pasa al contenido para que la navegación
  // por teclado no vuelva al inicio del documento.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  const { data: notifCount } = useQuery({
    queryKey: ['notif-count'],
    queryFn:  notifApi.count,
    refetchInterval: 60_000,
  });

  const count = notifCount?.total ?? 0;
  const meta = ROUTE_META[location.pathname] ?? { section: 'Sistema', label: 'Gestión comercial' };
  const initials = (user?.nombre ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <a
        href="#contenido-principal"
        className="skip-link"
        onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}
      >
        Saltar al contenido
      </a>

      {/* ── Barra superior: módulos principales ─────── */}
      <header className="z-sticky flex h-[54px] shrink-0 items-center gap-1.5 border-b border-navy-800 bg-navy-900 px-2.5 text-white md:gap-2 md:px-3 xl:px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-sm p-1.5 text-slate-400 hover:bg-white/5 hover:text-white md:hidden"
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
          aria-controls="menu-movil"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <button
          onClick={() => navigate('/')}
          className="flex shrink-0 items-center gap-2.5"
          title="Ir al panel de control"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary shadow-panel" aria-hidden="true">
            <BarChart3 size={16} className="text-white" strokeWidth={2.4} />
          </div>
          <div className="hidden text-left md:block">
            <p className="text-xs font-semibold leading-tight tracking-tight">Gestión Comercial</p>
            <p className="hidden text-2xs font-medium uppercase tracking-widest text-slate-400 xl:block">ERP de distribución</p>
          </div>
          <span className="sr-only md:hidden">Ir al panel de control</span>
        </button>

        <div className="mx-1 hidden h-6 w-px bg-white/10 md:block xl:mx-2" />

        <nav className="hidden min-w-0 flex-1 items-center gap-px md:flex" aria-label="Módulos principales">
          <TopItem to="/" label="Panel" icon={<LayoutDashboard size={14} />} end />
          <TopItem to="/ventas" label="Ventas" icon={<ReceiptText size={14} />} />
          {isAdmin && <TopItem to="/compras" label="Compras" icon={<Package size={14} />} />}
          <TopItem to="/cartera" label="Cartera" icon={<HandCoins size={14} />} />
          {isAdmin && <TopItem to="/finanzas" label="Finanzas" icon={<Wallet size={14} />} />}
          {isAdmin && <TopItem to="/caja" label="Caja" icon={<Banknote size={14} />} />}
          {isAdmin && <TopItem to="/reportes" label="Reportes" icon={<ChartColumnBig size={14} />} />}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isVendedor && (
            <button onClick={() => navigate('/ventas/nueva')} className="btn-primary btn-sm hidden xl:inline-flex">
              <PlusCircle size={13} aria-hidden="true" /> Nueva venta
            </button>
          )}
          <TemaMenu />
          <button
            onClick={() => navigate('/notificaciones')}
            className={clsx(
              'relative rounded-sm border p-1.5 transition-colors',
              count > 0
                ? 'border-warning/40 bg-warning/15 text-warning-invert hover:bg-warning/25'
                : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white',
            )}
            title={plural(count, 'alerta pendiente', 'alertas pendientes')}
            aria-label={count > 0 ? `Alertas: ${plural(count, 'pendiente')}` : 'Alertas: sin pendientes'}
          >
            <Bell size={15} aria-hidden="true" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-solid px-1 text-2xs font-bold text-white" aria-hidden="true">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {count > 0 ? plural(count, 'alerta pendiente', 'alertas pendientes') : 'Sin alertas pendientes'}
          </span>
          <div className="hidden h-6 w-px bg-white/10 md:block" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-2xs font-semibold text-slate-200 ring-1 ring-white/15" aria-hidden="true">
              {initials || '?'}
            </div>
            <div className="hidden leading-tight xl:block">
              <p className="max-w-[120px] truncate text-tiny font-medium text-slate-200">{user?.nombre}</p>
              <p className="text-2xs capitalize text-slate-400">{user?.rol}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Riel lateral: acciones y datos maestros ── */}
        <aside className="hidden w-[58px] shrink-0 border-r border-line bg-card py-2 md:flex">
          <nav aria-label="Acciones y datos maestros" className="flex w-full flex-1 flex-col items-center">
            <RailGroup label="Acciones">
              <RailItem to="/ventas/nueva" label="Nueva venta" icon={<PlusCircle size={17} />} />
              {isAdmin && <RailItem to="/compras/nueva" label="Nueva compra" icon={<PackagePlus size={17} />} />}
            </RailGroup>

            <div className="my-2 h-px w-7 bg-line" />

            <RailGroup label="Datos maestros">
              <RailItem to="/clientes" label="Clientes" icon={<Users size={17} />} />
              <RailItem to="/productos" label="Productos y precios" icon={<Boxes size={17} />} />
              <RailItem to="/stock" label="Movimientos de stock" icon={<ArrowUpDown size={17} />} />
              <RailItem to="/etiquetas" label="Etiquetas QR" icon={<QrCode size={17} />} />
            </RailGroup>

            <div className="mt-auto flex flex-col items-center gap-0.5">
              <RailItem to="/notificaciones" label="Alertas" icon={<Bell size={17} />} badge={count} />
              {isAdmin && <RailItem to="/admin" label="Administración" icon={<ShieldCheck size={17} />} />}
              {isAdmin && <RailItem to="/backup" label="Copias de seguridad" icon={<Database size={17} />} />}
            </div>
          </nav>
        </aside>

        {/* ── Contenido ──────────────────────────────── */}
        <main
          ref={mainRef}
          id="contenido-principal"
          tabIndex={-1}
          className="scroll-slim min-w-0 flex-1 overflow-y-auto bg-canvas outline-none"
        >
          <div className="mx-auto w-full max-w-[1720px] p-4 md:p-5 xl:p-6">
            <div className="mb-3 flex items-center gap-1.5 text-2xs text-muted md:hidden">
              <span>{meta.section}</span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-soft">{meta.label}</span>
            </div>
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Drawer móvil ─────────────────────────────── */}
      {mobileOpen && (
        <>
          <button
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-dropdown bg-navy-950/50 md:hidden"
          />
          <aside
            ref={drawerRef}
            id="menu-movil"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            tabIndex={-1}
            className="surface-dark fixed inset-y-0 left-0 z-drawer flex w-[250px] flex-col bg-navy-900 outline-none md:hidden"
          >
            <div className="flex h-[54px] items-center gap-2.5 border-b border-white/[0.07] px-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary" aria-hidden="true">
                <BarChart3 size={17} className="text-white" strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-[13px] font-semibold leading-tight text-white">Gestión Comercial</p>
                <p className="text-2xs uppercase tracking-widest text-slate-400">ERP de distribución</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
                className="ml-auto rounded-sm p-1 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <nav className="scroll-slim flex-1 overflow-y-auto py-3" aria-label="Navegación móvil">
              <MobileSection label="Operación">
                <MobileItem to="/" label="Panel de control" icon={<LayoutDashboard size={15} />} end />
                <MobileItem to="/ventas" label="Ventas" icon={<ReceiptText size={15} />} />
                <MobileItem to="/ventas/nueva" label="Nueva venta" icon={<PlusCircle size={15} />} />
                <MobileItem to="/cartera" label="Cartera y cobros" icon={<HandCoins size={15} />} />
                {isAdmin && <MobileItem to="/compras" label="Compras" icon={<Package size={15} />} />}
                {isAdmin && <MobileItem to="/compras/nueva" label="Nueva compra" icon={<PackagePlus size={15} />} />}
                <MobileItem to="/clientes" label="Clientes" icon={<Users size={15} />} />
              </MobileSection>
              {isAdmin && (
                <MobileSection label="Finanzas">
                  <MobileItem to="/finanzas" label="Finanzas" icon={<Wallet size={15} />} />
                  <MobileItem to="/caja" label="Caja y flujo" icon={<Banknote size={15} />} />
                  <MobileItem to="/reportes" label="Reportes" icon={<ChartColumnBig size={15} />} />
                </MobileSection>
              )}
              <MobileSection label="Inventario">
                <MobileItem to="/productos" label="Productos y precios" icon={<Boxes size={15} />} />
                <MobileItem to="/stock" label="Movimientos de stock" icon={<ArrowUpDown size={15} />} />
                <MobileItem to="/etiquetas" label="Etiquetas QR" icon={<QrCode size={15} />} />
              </MobileSection>
              <MobileSection label="Sistema">
                <MobileItem to="/notificaciones" label="Alertas" icon={<Bell size={15} aria-hidden="true" />} badge={count} />
                {isAdmin && <MobileItem to="/admin" label="Administración" icon={<ShieldCheck size={15} />} />}
                {isAdmin && <MobileItem to="/backup" label="Copias de seguridad" icon={<Database size={15} />} />}
              </MobileSection>
            </nav>

            <div className="border-t border-white/[0.07] p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-tiny font-semibold text-primary-invert ring-1 ring-primary/40" aria-hidden="true">
                  {initials || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-200">{user?.nombre}</p>
                  <p className="truncate text-2xs capitalize text-slate-400">{user?.rol}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Cerrar sesión"
                  className="rounded-sm p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <LogOut size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

// ── Selector de tema ───────────────────────────────────

const TEMAS = [
  { valor: 'claro',   Icono: Sun },
  { valor: 'oscuro',  Icono: Moon },
  { valor: 'sistema', Icono: Monitor },
] as const;

function TemaMenu() {
  const { tema, setTema } = useTema();
  const [abierto, setAbierto] = useState(false);
  const cajaRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const actual = TEMAS.find((t) => t.valor === tema) ?? TEMAS[2];
  const Icono = actual.Icono;

  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  };

  useEffect(() => {
    if (!abierto) return;
    itemsRef.current[TEMAS.findIndex((t) => t.valor === tema)]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); cerrar(); }
    };
    const onFuera = (e: MouseEvent) => {
      if (!cajaRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onFuera);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onFuera);
    };
  }, [abierto, tema]);

  return (
    <div ref={cajaRef} className="relative">
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Tema: ${ETIQUETA_TEMA[tema]}`}
        title={`Tema: ${ETIQUETA_TEMA[tema]}`}
        className="rounded-sm border border-white/10 p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        <Icono size={15} aria-hidden="true" />
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label="Tema de la interfaz"
          className="absolute right-0 top-full z-dropdown mt-1.5 w-44 rounded border border-line bg-card p-1 shadow-dropdown"
        >
          <p className="px-2 pb-1 pt-0.5 text-2xs font-semibold uppercase tracking-wide text-muted">Tema</p>
          {TEMAS.map(({ valor, Icono: I }, i) => {
            const activo = tema === valor;
            return (
              <button
                key={valor}
                ref={(el) => { itemsRef.current[i] = el; }}
                type="button"
                role="menuitemradio"
                aria-checked={activo}
                onClick={() => { setTema(valor); cerrar(); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const delta = e.key === 'ArrowDown' ? 1 : -1;
                    itemsRef.current[(i + delta + TEMAS.length) % TEMAS.length]?.focus();
                  }
                }}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors',
                  activo ? 'bg-primary-50 font-semibold text-accent' : 'text-body hover:bg-surface',
                )}
              >
                <I size={14} aria-hidden="true" />
                <span className="flex-1">{ETIQUETA_TEMA[valor]}</span>
                {activo && <Check size={13} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Navegación superior ─────────────────────────────────

function TopItem({ to, label, icon, end }: { to: string; label: string; icon: ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => clsx(
        'relative flex h-[54px] items-center gap-1.5 whitespace-nowrap px-2.5 text-tiny font-medium transition-colors xl:px-3.5 xl:text-xs',
        isActive
          ? 'bg-white/[0.07] text-white after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-primary-light'
          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
      )}
    >
      {({ isActive }) => (
        <>
          <span className={clsx('hidden xl:inline-flex', isActive ? 'text-primary-invert' : 'text-slate-400')} aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

// ── Riel lateral ───────────────────────────────────────

function RailGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center gap-0.5" title={label}>
      {children}
    </div>
  );
}

function RailItem({ to, label, icon, badge }: { to: string; label: string; icon: ReactNode; badge?: number }) {
  return (
    <NavLink
      to={to}
      title={label}
      aria-label={badge ? `${label} (${badge} pendientes)` : label}
      className={({ isActive }) => clsx(
        'relative flex h-9 w-9 items-center justify-center rounded-sm transition-colors',
        isActive
          ? 'bg-primary-50 text-accent ring-1 ring-primary/15'
          : 'text-muted hover:bg-slate-100 hover:text-slate-700',
      )}
    >
      <span aria-hidden="true">{icon}</span>
      {!!badge && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-solid px-1 text-2xs font-bold text-white" aria-hidden="true">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

// ── Drawer móvil ───────────────────────────────────────

function MobileSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <p className="px-4 pb-1 pt-2 text-2xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="space-y-px">{children}</div>
    </div>
  );
}

function MobileItem({ to, label, icon, badge, end }: { to: string; label: string; icon: ReactNode; badge?: number; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => clsx(
        'flex items-center gap-2.5 border-l-2 px-4 py-[7px] text-xs font-medium transition-colors',
        isActive
          ? 'border-primary-light bg-white/[0.07] text-white'
          : 'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
      )}
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? 'text-primary-invert' : 'text-slate-400'} aria-hidden="true">{icon}</span>
          <span className="flex-1 truncate">{label}</span>
          {!!badge && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-solid px-1 text-2xs font-bold text-white" aria-hidden="true">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
