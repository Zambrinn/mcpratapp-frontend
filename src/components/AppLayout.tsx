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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });
  const profileRef = useRef<HTMLDivElement | null>(null);

  const visibleNav = navItems.filter((item) => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
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
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-[#080c14] dark:text-slate-100 antialiased">
      <div className="flex min-h-screen">
        {/* Atelier Sidebar */}
        <aside className="hidden w-64 shrink-0 bg-[#090D16] text-slate-200 border-r border-slate-800/80 md:flex md:flex-col md:justify-between">
          <div>
            {/* Logo / Brand Header */}
            <div className="flex items-center gap-3.5 border-b border-slate-800/80 px-6 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white font-black shadow-lg shadow-teal-500/20 ring-1 ring-white/20">
                MC
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-extrabold tracking-tight text-white">MCPRATA</p>
                <p className="text-[11px] font-medium tracking-wide uppercase text-teal-400">Jóias 925</p>
              </div>
            </div>

            {/* Nav Menu */}
            <nav className="space-y-1.5 px-3 py-6 text-sm">
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Menu Principal
              </div>
              {visibleNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all duration-150',
                      isActive
                        ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30 font-semibold shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100',
                    ].join(' ')
                  }
                >
                  <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}

              {user?.role === UserRole.ADMIN && (
                <NavLink
                  to="/users"
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all duration-150',
                      isActive
                        ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30 font-semibold shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100',
                    ].join(' ')
                  }
                >
                  <Icon name="users" className="h-5 w-5 shrink-0" />
                  <span>Usuários</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* User Profile Footer in Sidebar */}
          <div className="border-t border-slate-800/80 p-3.5">
            <div className="flex items-center justify-between rounded-xl bg-slate-900/80 p-2.5 border border-slate-800/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-xs font-bold text-teal-400 ring-1 ring-teal-500/30">
                  {user?.name?.slice(0, 2).toUpperCase() ?? 'MC'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-200">{user?.name}</p>
                  <span className="inline-block text-[10px] font-medium text-teal-400 uppercase tracking-wider">
                    {user?.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair da conta"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 text-center text-[10px] text-slate-500">
              MCPRATA ERP v2.4
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="min-w-0 flex-1 flex flex-col">
          {/* Top Header */}
          <header className="sticky top-0 z-30 flex min-h-[60px] items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 md:px-8 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#090D16]/80 transition-colors">
            <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">
              <Icon name="calendar" className="h-4 w-4 text-teal-500" />
              <span>{longDate()}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Direct Theme Switcher Button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {isDarkMode ? (
                  <Icon name="sun" className="h-4 w-4 text-amber-400 animate-fadeIn" />
                ) : (
                  <Icon name="moon" className="h-4 w-4 text-slate-600 animate-fadeIn" />
                )}
              </button>

              {/* Profile dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((current) => !current)}
                  className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  aria-label="Abrir perfil"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500 text-[11px] font-bold text-white shadow-xs">
                    {user?.name?.slice(0, 2).toUpperCase() ?? 'MC'}
                  </span>
                  <span className="hidden sm:inline max-w-[120px] truncate">{user?.name}</span>
                  <Icon name="chevronDown" className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-72 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-modal">
                    <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-4 text-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 font-bold ring-1 ring-white/30">
                          {user?.name?.slice(0, 2).toUpperCase() ?? 'MC'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{user?.name}</p>
                          <p className="truncate text-xs text-white/80">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 p-3 text-sm">
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-850">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Perfil de Acesso</span>
                        <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 dark:border dark:border-teal-800/40">
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
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                        >
                          <span>Gerenciar usuários</span>
                          <Icon name="users" className="h-4 w-4 text-teal-500" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                      >
                        <span>Alternar Tema</span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          {isDarkMode ? 'Escuro' : 'Claro'}
                          {isDarkMode ? <Icon name="moon" className="h-3.5 w-3.5 text-amber-400" /> : <Icon name="sun" className="h-3.5 w-3.5 text-amber-500" />}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition"
                      >
                        <span>Sair da conta</span>
                        <Icon name="x" className="h-4 w-4 text-rose-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Mobile Navigation Header */}
          <nav className="flex gap-2 overflow-x-auto border-b border-slate-800 bg-[#090D16] px-3 py-2.5 text-sm md:hidden">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                    isActive ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-300 hover:text-white',
                  ].join(' ')
                }
              >
                <Icon name={item.icon} className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Main content view */}
          <div className="p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
