import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { notifApi } from '../../api/endpoints';
import {
  LayoutDashboard, ReceiptText, PlusCircle, Wallet, HandCoins, Package,
  PackagePlus, Users, Tag, LogOut, Bell, FileText, Database, ArrowLeftRight,
  ShieldCheck, BarChart3, Menu, X, Landmark,
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
  '/notificaciones':    { section: 'Sistema',    label: 'Alertas' },
  '/admin':             { section: 'Sistema',    label: 'Administración' },
  '/backup':            { section: 'Sistema',    label: 'Copias de seguridad' },
};

export default function AppLayout() {
  const { user, logout, isAdmin, isVendedor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

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
      {/* ── Barra superior: módulos principales ─────── */}
      <header className="z-30 flex h-[54px] shrink-0 items-center gap-1.5 border-b border-navy-800 bg-navy-900 px-2.5 text-white md:gap-2 md:px-3 xl:px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-sm p-1.5 text-slate-400 hover:bg-white/5 hover:text-white md:hidden"
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </button>

        <button onClick={() => navigate('/')} className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary shadow-panel">
            <BarChart3 size={16} className="text-white" strokeWidth={2.4} />
          </div>
          <div className="hidden text-left md:block">
            <p className="text-[12.5px] font-semibold leading-tight tracking-tight">Gestión Comercial</p>
            <p className="hidden text-[8.5px] font-medium uppercase tracking-widest text-slate-500 xl:block">ERP de distribución</p>
          </div>
        </button>

        <div className="mx-1 hidden h-6 w-px bg-white/10 md:block xl:mx-2" />

        <nav className="hidden min-w-0 flex-1 items-center gap-px md:flex">
          <TopItem to="/" label="Panel" icon={<LayoutDashboard size={14} />} end />
          <TopItem to="/ventas" label="Ventas" icon={<ReceiptText size={14} />} />
          {isAdmin && <TopItem to="/compras" label="Compras" icon={<Package size={14} />} />}
          <TopItem to="/cartera" label="Cartera" icon={<HandCoins size={14} />} />
          {isAdmin && <TopItem to="/finanzas" label="Finanzas" icon={<Wallet size={14} />} />}
          {isAdmin && <TopItem to="/caja" label="Caja" icon={<Landmark size={14} />} />}
          {isAdmin && <TopItem to="/reportes" label="Reportes" icon={<FileText size={14} />} />}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isVendedor && (
            <button onClick={() => navigate('/ventas/nueva')} className="btn-primary btn-sm hidden xl:inline-flex">
              <PlusCircle size={13} /> Nueva venta
            </button>
          )}
          <button
            onClick={() => navigate('/notificaciones')}
            className={clsx(
              'relative rounded-sm border p-1.5 transition-colors',
              count > 0
                ? 'border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'
                : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white',
            )}
            title={`${count} alerta(s) pendiente(s)`}
          >
            <Bell size={15} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
          <div className="hidden h-6 w-px bg-white/10 md:block" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-slate-200 ring-1 ring-white/15">
              {initials || '?'}
            </div>
            <div className="hidden leading-tight xl:block">
              <p className="max-w-[120px] truncate text-[11.5px] font-medium text-slate-200">{user?.nombre}</p>
              <p className="text-[9.5px] capitalize text-slate-500">{user?.rol}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="rounded-sm p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Riel lateral: acciones y datos maestros ── */}
        <aside className="hidden w-[58px] shrink-0 flex-col items-center border-r border-line bg-white py-2 md:flex">
          <RailGroup label="Acciones">
            <RailItem to="/ventas/nueva" label="Nueva venta" icon={<PlusCircle size={17} />} />
            {isAdmin && <RailItem to="/compras/nueva" label="Nueva compra" icon={<PackagePlus size={17} />} />}
          </RailGroup>

          <div className="my-2 h-px w-7 bg-line" />

          <RailGroup label="Datos maestros">
            <RailItem to="/clientes" label="Clientes" icon={<Users size={17} />} />
            <RailItem to="/productos" label="Productos y precios" icon={<Tag size={17} />} />
            <RailItem to="/stock" label="Movimientos de stock" icon={<ArrowLeftRight size={17} />} />
          </RailGroup>

          <div className="mt-auto flex flex-col items-center gap-0.5">
            <RailItem to="/notificaciones" label="Alertas" icon={<Bell size={17} />} badge={count} />
            {isAdmin && <RailItem to="/admin" label="Administración" icon={<ShieldCheck size={17} />} />}
            {isAdmin && <RailItem to="/backup" label="Copias de seguridad" icon={<Database size={17} />} />}
          </div>
        </aside>

        {/* ── Contenido ──────────────────────────────── */}
        <main className="scroll-slim min-w-0 flex-1 overflow-y-auto bg-canvas">
          <div className="mx-auto w-full max-w-[1720px] p-4 md:p-5 xl:p-6">
            <div className="mb-3 flex items-center gap-1.5 text-[10.5px] text-slate-400 md:hidden">
              <span>{meta.section}</span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-600">{meta.label}</span>
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
            className="fixed inset-0 z-40 bg-navy-950/50 md:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col bg-navy-900 md:hidden">
            <div className="flex h-[54px] items-center gap-2.5 border-b border-white/[0.07] px-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary">
                <BarChart3 size={17} className="text-white" strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-[13px] font-semibold leading-tight text-white">Gestión Comercial</p>
                <p className="text-[9px] uppercase tracking-widest text-slate-500">ERP de distribución</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="ml-auto text-slate-500 hover:text-white">
                <X size={17} />
              </button>
            </div>

            <nav className="scroll-slim flex-1 overflow-y-auto py-3">
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
                  <MobileItem to="/caja" label="Caja y flujo" icon={<Landmark size={15} />} />
                  <MobileItem to="/reportes" label="Reportes" icon={<FileText size={15} />} />
                </MobileSection>
              )}
              <MobileSection label="Inventario">
                <MobileItem to="/productos" label="Productos y precios" icon={<Tag size={15} />} />
                <MobileItem to="/stock" label="Movimientos de stock" icon={<ArrowLeftRight size={15} />} />
              </MobileSection>
              <MobileSection label="Sistema">
                <MobileItem to="/notificaciones" label="Alertas" icon={<Bell size={15} />} badge={count} />
                {isAdmin && <MobileItem to="/admin" label="Administración" icon={<ShieldCheck size={15} />} />}
                {isAdmin && <MobileItem to="/backup" label="Copias de seguridad" icon={<Database size={15} />} />}
              </MobileSection>
            </nav>

            <div className="border-t border-white/[0.07] p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-sky-200 ring-1 ring-primary/40">
                  {initials || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-slate-200">{user?.nombre}</p>
                  <p className="truncate text-[10px] capitalize text-slate-500">{user?.rol}</p>
                </div>
                <button onClick={handleLogout} className="rounded-sm p-1.5 text-slate-500 hover:text-white">
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </aside>
        </>
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
        'relative flex h-[54px] items-center gap-1.5 whitespace-nowrap px-2.5 text-[11.5px] font-medium transition-colors xl:px-3.5 xl:text-[12px]',
        isActive
          ? 'bg-white/[0.07] text-white after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-primary-light'
          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
      )}
    >
      {({ isActive }) => (
        <>
          <span className={clsx('hidden xl:inline-flex', isActive ? 'text-sky-300' : 'text-slate-500')}>{icon}</span>
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
      className={({ isActive }) => clsx(
        'relative flex h-9 w-9 items-center justify-center rounded-sm transition-colors',
        isActive
          ? 'bg-primary-50 text-primary ring-1 ring-primary/15'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
      )}
    >
      {icon}
      {!!badge && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
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
      <p className="px-4 pb-1 pt-2 text-[9.5px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
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
        'flex items-center gap-2.5 border-l-2 px-4 py-[7px] text-[12.5px] font-medium transition-colors',
        isActive
          ? 'border-primary-light bg-white/[0.07] text-white'
          : 'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
      )}
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? 'text-sky-300' : 'text-slate-500'}>{icon}</span>
          <span className="flex-1 truncate">{label}</span>
          {!!badge && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
