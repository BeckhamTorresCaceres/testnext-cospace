'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Globe2, LogOut, Menu, Shield, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchWithAuth, type UserSession } from '@/lib/api';
import { useTranslation } from '@/core/i18n';
import {
  AUTH_CHANGED_EVENT,
  openAuthModal,
} from '@/components/auth/AuthModal';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const { t, locale, toggleLocale } = useTranslation();

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      try {
        const res = await fetchWithAuth('/api/auth/me');
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setUser(data.user ?? null);
        } else {
          setUser(null);
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setCheckingAuth(false);
      }
    };
    loadSession();

    const handleAuthChanged = (event: Event) => {
      const custom = event as CustomEvent<{ user: UserSession | null }>;
      setUser(custom.detail?.user ?? null);
      setCheckingAuth(false);
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    return () => {
      active = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    };
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setMobileMenuOpen(false);
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/gestion') ||
      pathname.startsWith('/admin')
    ) {
      router.push('/');
    }
    router.refresh();
  };

  const navLinks = [
    { label: t('nav.home'), href: '/', show: true, requiresAuth: false },
    { label: t('nav.spaces'), href: '/spaces', show: true, requiresAuth: false },
    {
      label: t('nav.myBookings'),
      href: '/dashboard',
      show: true,
      requiresAuth: true,
    },
    {
      label: t('nav.admin'),
      href: '/gestion',
      show: user?.role === 'ADMIN',
      requiresAuth: true,
    },
  ].filter((item) => item.show);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-[22px] border border-white/80 bg-white/80 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-sky-600 text-white shadow-sm shadow-sky-600/30">
            <Building2 size={19} />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">CoSpace</span>
        </Link>

        {/* Enlaces de escritorio */}
        <div className="hidden items-center gap-1 rounded-2xl bg-slate-100/80 p-1 md:flex">
          {navLinks.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            if (item.requiresAuth && !user) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => openAuthModal('login', item.href)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
                >
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Acciones derecha */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLocale}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            title="Cambiar idioma / Change language (ES / EN)"
          >
            <Globe2 size={16} className="text-sky-600" />
            <span className="uppercase">{locale}</span>
          </button>

          {!checkingAuth && user ? (
            <div className="flex items-center gap-2">
              <Link
                href={user.role === 'ADMIN' ? '/gestion' : '/dashboard'}
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:flex"
              >
                {user.role === 'ADMIN' ? (
                  <Shield size={14} className="text-sky-600" />
                ) : (
                  <User size={14} className="text-sky-600" />
                )}
                <span className="max-w-[120px] truncate">{user.name}</span>
                <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                  {user.role}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-10 items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
                title={t('nav.logoutConfirm')}
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">{t('nav.signOut')}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="hidden min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:flex"
              >
                {t('nav.signUp')}
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="flex min-h-10 items-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                {t('nav.signIn')}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700 md:hidden"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="mx-auto mt-2 grid max-w-sm gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl md:hidden">
          {navLinks.map((item) =>
            item.requiresAuth && !user ? (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('login', item.href);
                }}
                className="rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            )
          )}
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <LogOut size={16} /> {t('nav.signOut')} ({user.name})
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openAuthModal('register');
              }}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-sky-600 hover:bg-sky-50"
            >
              {t('nav.signUp')}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
