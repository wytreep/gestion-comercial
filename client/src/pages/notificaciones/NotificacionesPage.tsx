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
        <div>
          <h1 className="page-title">
            Alertas y notificaciones
            {pendientes > 0 && (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-warning-solid px-1.5 py-0.5 align-middle text-2xs font-bold text-white">
                {pendientes}
              </span>
            )}
          </h1>
        </div>
        {pendientes > 0 && (
          <button onClick={() => leerTodasMut.mutate()} className="btn-secondary">
            <CheckCheck size={15} aria-hidden="true" /> Marcar todas como leídas
          </button>
        )}
      </div>

      {isLoading ? <Spinner /> : notifs.length === 0 ? (
        <div className="card">
          <Empty
            icon={<CheckCircle2 size={20} />}
            title="Sin alertas pendientes"
            description="El sistema revisará deudas vencidas y stock bajo automáticamente."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div
              key={n.id}
              className={`card flex items-start gap-4 ${!n.leida ? 'border-l-4 border-l-warning bg-warning-soft/30' : 'opacity-60'}`}
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <BadgeNotif tipo={n.tipo} />
                  <span className="text-2xs text-muted">{formatDateTime(n.created_at)}</span>
                </div>
                <p className="text-xs font-semibold text-ink">{n.titulo}</p>
                <p className="mt-0.5 text-tiny leading-relaxed text-muted">{n.mensaje}</p>
              </div>
              {!n.leida && (
                <button
                  onClick={() => leerMut.mutate(n.id)}
                  className="btn-secondary btn-sm shrink-0"
                  aria-label={`Marcar como leída: ${n.titulo}`}
                >
                  <Check size={12} aria-hidden="true" /> Leída
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
