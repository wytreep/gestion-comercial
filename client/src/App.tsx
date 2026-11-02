import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

import AppLayout    from './components/layout/AppLayout';
import LoginPage    from './pages/auth/LoginPage';

// Pages
import DashboardPage       from './pages/dashboard/DashboardPage';
import VentasPage          from './pages/ventas/VentasPage';
import NuevaVentaPage      from './pages/ventas/NuevaVentaPage';
import ComprasPage, { NuevaCompraPage } from './pages/compras/ComprasPage';
import ProductosPage       from './pages/productos/ProductosPage';
import ClientesPage        from './pages/clientes/ClientesPage';
import CarteraPage         from './pages/cartera/CarteraPage';
import CajaPage            from './pages/caja/CajaPage';
import FinanzasPage        from './pages/finanzas/FinanzasPage';
import NotificacionesPage  from './pages/notificaciones/NotificacionesPage';
import ReportesPage        from './pages/reportes/ReportesPage';
import StockPage           from './pages/stock/StockPage';
import AdminPage           from './pages/admin/AdminPage';
import BackupPage          from './pages/admin/BackupPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuth, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

function Public({ children }: { children: React.ReactNode }) {
  const { isAuth, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuth ? <Navigate to="/" replace /> : <>{children}</>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Public><LoginPage /></Public>} />

            <Route element={<Protected><AppLayout /></Protected>}>
              <Route index                element={<DashboardPage />} />
              <Route path="ventas"        element={<VentasPage />} />
              <Route path="ventas/nueva"  element={<NuevaVentaPage />} />
              <Route path="compras"       element={<AdminOnly><ComprasPage /></AdminOnly>} />
              <Route path="compras/nueva" element={<AdminOnly><NuevaCompraPage /></AdminOnly>} />
              <Route path="productos"     element={<ProductosPage />} />
              <Route path="clientes"      element={<ClientesPage />} />
              <Route path="cartera"       element={<CarteraPage />} />
              <Route path="caja"          element={<AdminOnly><CajaPage /></AdminOnly>} />
              <Route path="finanzas"      element={<AdminOnly><FinanzasPage /></AdminOnly>} />
              <Route path="notificaciones"element={<NotificacionesPage />} />
              <Route path="reportes"      element={<AdminOnly><ReportesPage /></AdminOnly>} />
              <Route path="stock"         element={<StockPage />} />
              <Route path="admin"         element={<AdminOnly><AdminPage /></AdminOnly>} />
              <Route path="backup"        element={<AdminOnly><BackupPage /></AdminOnly>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
