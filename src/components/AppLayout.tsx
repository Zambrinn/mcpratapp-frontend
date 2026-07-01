import { ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/index';
import { Button } from './Button';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: 'Vendas', to: '/sales', roles: [UserRole.ADMIN, UserRole.VENDOR] },
  { label: 'Usuários', to: '/users', roles: [UserRole.ADMIN] },
];

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const profileRef = useRef<HTMLDivElement | null>(null);

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
    <div className="min-h-screen bg-[#eef3f2] text-slate-700 dark:text-slate-200">
      <div className="flex min-h-screen">
        <aside className="hidden w-[224px] shrink-0 bg-primary-500 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="border-b border-primary-600 px-5 py-6">
              <p className="text-xl font-bold tracking-wide">MCPRATA</p>
              <p className="text-xs text-primary-100">Sistema ERP</p>
            </div>

            <nav className="space-y-2 p-3 text-sm">
              {navItems
                .filter((item) => user && item.roles.includes(user.role))
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'block rounded-lg px-4 py-3 font-medium transition',
                        isActive
                          ? 'bg-white text-primary-700'
                          : 'text-primary-50 hover:bg-primary-600',
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
            </nav>
          </div>

          <div className="border-t border-primary-600 p-3">
            <Button variant="secondary" fullWidth onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex min-h-[74px] items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
            <div>
              <p className="text-sm capitalize text-slate-500">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((current) => !current)}
                className="flex min-w-[176px] items-center justify-between gap-3 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-3 text-left shadow-sm transition hover:border-primary-200 hover:bg-primary-50 dark:border-slate-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
                    {user?.name?.slice(0, 2).toUpperCase() ?? 'MC'}
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-sm font-semibold leading-4 text-slate-800">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.role}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">v</span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-[calc(100%+0.65rem)] z-30 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700">
                  <div className="bg-primary-500 px-4 py-4 text-white">
                    <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold text-white ring-1 ring-white/30">
                      {user?.name?.slice(0, 2).toUpperCase() ?? 'MC'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{user?.name}</p>
                      <p className="truncate text-sm text-primary-50">{user?.email}</p>
                    </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Perfil</span>
                      <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                        {user?.role}
                      </span>
                    </div>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700">
                      <span>
                        <span className="block font-medium text-slate-700">Modo escuro</span>
                        <span className="text-xs text-slate-500">Alterna o tema da interface</span>
                      </span>
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
                    <Button variant="secondary" fullWidth onClick={handleLogout}>
                      Sair da conta
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </header>

          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
