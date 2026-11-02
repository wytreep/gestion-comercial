import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifApi } from '../../api/endpoints';
import { Spinner, Empty, BadgeNotif } from '../../components/ui';
import { formatDateTime } from '../../utils/format';
import { CheckCheck, Check, CheckCircle2 } from 'lucide-react';

export default function NotificacionesPage() {
  const qc = useQueryClient();

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ['notificaciones'],
    queryFn:  notifApi.listar,
  });

  const leerMut = useMutation({
    mutationFn: (id: number) => notifApi.leer(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notificaciones'] }); qc.invalidateQueries({ queryKey: ['notif-count'] }); },
  });

  const leerTodasMut = useMutation({
    mutationFn: notifApi.leerTodas,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notificaciones'] }); qc.invalidateQueries({ queryKey: ['notif-count'] }); },
  });

  const pendientes = notifs.filter(n => !n.leida).length;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">
          Alertas y notificaciones
          {pendientes > 0 && (
            <span className="ml-2 bg-orange-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendientes}
            </span>
          )}
        </h1>
        {pendientes > 0 && (
          <button onClick={() => leerTodasMut.mutate()} className="btn-secondary flex items-center gap-2">
            <CheckCheck size={15} /> Marcar todas como leídas
          </button>
        )}
      </div>

      {isLoading ? <Spinner /> : notifs.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-success">
            <CheckCircle2 size={20} />
          </span>
          <p className="font-semibold text-success">Sin alertas pendientes</p>
          <p className="text-[11.5px] text-slate-400">El sistema revisará deudas vencidas y stock bajo automáticamente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div key={n.id}
              className={`card flex items-start gap-4 ${!n.leida ? 'border-l-4 border-l-orange-400 bg-orange-50/30' : 'opacity-60'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <BadgeNotif tipo={n.tipo} />
                  <span className="text-xs text-gray-400">{formatDateTime(n.created_at)}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800">{n.titulo}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.mensaje}</p>
              </div>
              {!n.leida && (
                <button onClick={() => leerMut.mutate(n.id)}
                  className="shrink-0 btn-secondary btn-sm flex items-center gap-1">
                  <Check size={12} /> Leída
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
