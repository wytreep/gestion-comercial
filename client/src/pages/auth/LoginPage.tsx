import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { BarChart3, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface F { email: string; password: string; }

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<F>();

  const onSubmit = async (d: F) => {
    setErr('');
    try { await login(d.email, d.password); navigate('/'); }
    catch (e: any) { setErr(e.message ?? 'Credenciales incorrectas'); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="h-[3px] w-full bg-primary" />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-[370px]">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary shadow-panel">
              <BarChart3 size={21} className="text-white" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-tight tracking-tight text-slate-900">Gestión Comercial</p>
              <p className="text-[9.5px] font-medium uppercase tracking-widest text-slate-500">ERP de distribución</p>
            </div>
          </div>

          <div className="rounded-md border border-line bg-white shadow-panel">
            <div className="border-b border-line px-5 py-4">
              <h1 className="text-[15px] font-semibold text-slate-900">Iniciar sesión</h1>
              <p className="mt-0.5 text-[11.5px] text-slate-500">Accede con tu cuenta corporativa.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 p-5">
              {err && (
                <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-[11.5px] text-red-700">
                  {err}
                </div>
              )}
              <div className="field">
                <label className="label">Correo electrónico</label>
                <input
                  type="email"
                  autoComplete="username"
                  className="input"
                  placeholder="nombre@empresa.com"
                  {...register('email', { required: true })}
                />
              </div>
              <div className="field">
                <label className="label">Contraseña</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="input"
                  placeholder="••••••••"
                  {...register('password', { required: true })}
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg mt-1">
                <LockKeyhole size={14} />
                {isSubmitting ? 'Verificando…' : 'Ingresar'}
              </button>
            </form>
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-400">
            <LockKeyhole size={11} />
            <span>Acceso restringido · Gestión Comercial</span>
          </div>
        </div>
      </div>
    </div>
  );
}
