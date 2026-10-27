'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ArrowRight, Building2, X } from 'lucide-react';
import { parseApiError, type UserSession } from '@/lib/api';
import { Spinner } from '@/components/shared/Loader';
import { Portal } from '@/components/shared/Portal';
import { loginWithGoogleAction } from '@/features/auth/server/actions';

export type AuthModalMode = 'login' | 'register';

interface OpenAuthModalDetail {
  mode?: AuthModalMode;
  redirectTo?: string;
}

const OPEN_AUTH_EVENT = 'cospace:open-auth-modal';
export const AUTH_CHANGED_EVENT = 'cospace:auth-changed';

export function openAuthModal(mode: AuthModalMode = 'login', redirectTo?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<OpenAuthModalDetail>(OPEN_AUTH_EVENT, {
      detail: { mode, redirectTo },
    })
  );
}

export function notifyAuthChanged(user: UserSession | null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(AUTH_CHANGED_EVENT, {
      detail: { user },
    })
  );
}

export function AuthModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>('login');
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);

  // Campos del formulario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const resetForm = (nextMode: AuthModalMode) => {
    setMode(nextMode);
    setErrorMsg(null);
    setLoading(false);
    setGoogleLoading(false);
  };

  // Escuchar eventos globales openAuthModal(...)
  useEffect(() => {
    const handleOpen = (event: Event) => {
      const custom = event as CustomEvent<OpenAuthModalDetail>;
      const nextMode = custom.detail?.mode ?? 'login';
      resetForm(nextMode);
      setRedirectTo(custom.detail?.redirectTo);
      setIsOpen(true);
    };

    window.addEventListener(OPEN_AUTH_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_AUTH_EVENT, handleOpen);
  }, []);

  // Abrir automáticamente si la URL trae ?auth=login o ?auth=register o ?redirect=... o ?error=...
  useEffect(() => {
    const authParam = searchParams.get('auth');
    const redirectParam = searchParams.get('redirect');
    const errorParam = searchParams.get('error');

    if (authParam === 'login' || authParam === 'register' || redirectParam || errorParam) {
      queueMicrotask(() => {
        resetForm(authParam === 'register' ? 'register' : 'login');
        setRedirectTo(redirectParam || undefined);
        if (errorParam) {
          if (errorParam === 'OAuthFailed') {
            setErrorMsg('No se pudo autenticar con Google. Intenta nuevamente.');
          } else if (errorParam === 'OAuthSyncFailed') {
            setErrorMsg('Ocurrió un error al sincronizar la cuenta de Google.');
          } else {
            setErrorMsg('Error de autenticación. Por favor, intenta de nuevo.');
          }
        }
        setIsOpen(true);
      });
    }
  }, [searchParams]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setErrorMsg(null);
    if (searchParams.get('auth') || searchParams.get('redirect') || searchParams.get('error')) {
      router.replace(pathname, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  // Cerrar con tecla Escape y bloquear scroll del fondo
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login' ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const fallback =
          mode === 'login' ? 'Error al iniciar sesión' : 'Error al crear la cuenta';
        const message = await parseApiError(res, fallback);
        throw new Error(message);
      }

      const data = await res.json();
      const loggedUser: UserSession | null = data?.user ?? null;

      notifyAuthChanged(loggedUser);
      setIsOpen(false);
      setPassword('');

      if (redirectTo) {
        router.push(redirectTo);
      } else if (loggedUser?.role === 'ADMIN' && pathname === '/') {
        router.push('/gestion');
      }
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md animate-fade-in"
        onClick={closeModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="flex min-h-full items-center justify-center py-6">
          <div
            className="relative w-full max-w-md rounded-[32px] border border-slate-200/80 bg-white p-7 shadow-2xl shadow-slate-900/20 animate-scale-in sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        {/* Cabecera de marca */}
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-sky-600 text-white shadow-sm shadow-sky-600/30">
            <Building2 size={18} />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            CoSpace
          </span>
        </div>

        {/* Selector de pestañas Login / Registro */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => resetForm('login')}
            className={`rounded-xl py-2 text-xs font-semibold transition ${
              mode === 'login'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => resetForm('register')}
            className={`rounded-xl py-2 text-xs font-semibold transition ${
              mode === 'register'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <h2
          id="auth-modal-title"
          className="mt-5 text-2xl font-bold tracking-tight text-slate-900"
        >
          {mode === 'login' ? 'Qué bueno verte' : 'Crea tu cuenta'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'login'
            ? 'Accede a tus reservas y espacios favoritos en CoSpace.'
            : 'Reserva tu próximo espacio de coworking en minutos.'}
        </p>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Botón de OAuth con Google */}
        <button
          type="button"
          disabled={googleLoading || loading}
          onClick={async () => {
            try {
              setGoogleLoading(true);
              setErrorMsg(null);
              await loginWithGoogleAction(redirectTo);
            } catch (err: unknown) {
              setErrorMsg(err instanceof Error ? err.message : 'Error al conectar con Google.');
              setGoogleLoading(false);
            }
          }}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] disabled:opacity-50"
        >
          {googleLoading ? (
            <>
              <Spinner size={18} />
              <span>Conectando con Google...</span>
            </>
          ) : (
            <>
              <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{mode === 'login' ? 'Continuar con Google' : 'Registrarse con Google'}</span>
            </>
          )}
        </button>

        {/* Separador elegante */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 font-medium text-slate-400">
              o con correo electrónico
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Nombre completo
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Beckham Torres"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              maxLength={150}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@cospace.com"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={mode === 'register' ? 8 : 1}
              maxLength={100}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === 'register' ? 'Mínimo 8 caracteres' : 'Tu contraseña'
              }
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 font-semibold text-white shadow-lg shadow-sky-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-700 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner size={18} />
                <span>
                  {mode === 'login' ? 'Accediendo...' : 'Creando cuenta...'}
                </span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <>
              ¿Aún no tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => resetForm('register')}
                className="font-semibold text-sky-600 hover:underline"
              >
                Regístrate aquí
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => resetForm('login')}
                className="font-semibold text-sky-600 hover:underline"
              >
                Inicia sesión
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  </div>
</Portal>
  );
}

