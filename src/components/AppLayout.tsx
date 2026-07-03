import { ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/index';
import { Icon, IconName } from './Icons';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  to: string;
  icon: IconName;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: 'grid', roles: [UserRole.ADMIN, UserRole.VENDOR] },
  { label: 'Clientes', to: '/clients', icon: 'users', roles: [UserRole.ADMIN, UserRole.VENDOR] },
  { label: 'Produtos', to: '/products', icon: 'box', roles: [UserRole.ADMIN, UserRole.VENDOR] },
  { label: 'Vendas', to: '/sales', icon: 'cart', roles: [UserRole.ADMIN, UserRole.VENDOR] },
  { label: 'Relatórios', to: '/reports', icon: 'barChart', roles: [UserRole.ADMIN, UserRole.VENDOR] },
];

function longDate(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const profileRef = useRef<HTMLDivElement | null>(null);

  const visibleNav = navItems.filter((item) => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const closeProfile = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', closeProfile);
    return () => document.removeEventListener('mousedown', closeProfile);
  }, []);

  return (
    <div className="min-h-screen bg-[#eef4f2] text-slate-700 dark:bg-slate-950 dark:text-slate-200">
      <div className="flex min-h-screen">
        <aside className="hidden w-[214px] shrink-0 bg-primary-400 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-primary-500 px-5 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-primary-500">
                MC
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold leading-5 tracking-wide">MCPRATA</p>
                <p className="text-xs text-primary-50">Sistema ERP</p>
              </div>
            </div>

            <nav className="space-y-2 px-3 py-5 text-sm">
              {visibleNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition',
                      isActive
                        ? 'bg-white text-primary-500 shadow-sm'
                        : 'text-white/90 hover:bg-white/10 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="border-t border-primary-500 px-5 py-4 text-center text-xs text-primary-50">
            © 2026 MCPRATA
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex min-h-[54px] items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
            <p className="text-sm capitalize text-slate-500">{longDate()}</p>

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((current) => !current)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white shadow-sm ring-2 ring-primary-100"
                aria-label="Abrir perfil"
              >
                {user?.name?.slice(0, 2).toUpperCase() ?? 'MC'}
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-[calc(100%+0.7rem)] z-30 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                  <div className="bg-primary-400 px-4 py-4 text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold ring-1 ring-white/35">
                        {user?.name?.slice(0, 2).toUpperCase() ?? 'MC'}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{user?.name}</p>
                        <p className="truncate text-sm text-primary-50">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 p-3 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-slate-500">Perfil</span>
                      <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                        {user?.role}
                      </span>
                    </div>

                    {user?.role === UserRole.ADMIN && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          navigate('/users');
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Gerenciar usuários
                        <Icon name="users" className="h-4 w-4 text-primary-500" />
                      </button>
                    )}

                    <label className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-50">
                      <span className="font-medium">Modo escuro</span>
                      <span
                        className={[
                          'relative h-6 w-11 rounded-full transition',
                          isDarkMode ? 'bg-primary-500' : 'bg-slate-300',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={isDarkMode}
                          onChange={(event) => setIsDarkMode(event.target.checked)}
                          className="sr-only"
                        />
                        <span
                          className={[
                            'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition',
                            isDarkMode ? 'left-6' : 'left-1',
                          ].join(' ')}
                        />
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-lg px-3 py-2 text-left font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      Sair da conta
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-primary-400 px-3 py-3 text-sm md:hidden">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-medium',
                    isActive ? 'bg-white text-primary-600' : 'text-white',
                  ].join(' ')
                }
              >
                <Icon name={item.icon} className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 md:p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
