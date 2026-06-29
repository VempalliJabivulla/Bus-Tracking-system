import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout, isDriver } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = isDriver
    ? [
        { to: '/driver', icon: 'dashboard', label: 'Dashboard' },
        { to: '/driver/route', icon: 'directions_bus', label: 'My Route' },
      ]
    : [
        { to: '/student', icon: 'dashboard', label: 'Dashboard' },
        { to: '/student/routes', icon: 'directions_bus', label: 'Routes' },
        { to: '/student/schedules', icon: 'calendar_today', label: 'Schedules' },
        { to: '/student/planner', icon: 'map', label: 'Route Planner' },
      ];

  return (
    <aside className="fixed left-0 top-0 h-full z-40 border-r border-outline-variant/10 bg-white w-64 hidden md:flex flex-col transition-all duration-300">
      <div className="p-8">
        <h1 className="font-headline-lg text-headline-lg font-extrabold text-primary tracking-tight">
          Campus Transit
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 opacity-70">
          Reliable Commute
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl mx-2 font-label-bold text-label-bold transition-all ${
                isActive
                  ? 'premium-gradient text-on-primary font-bold shadow-lg shadow-primary/20'
                  : 'text-on-surface-variant hover:bg-surface-variant/30'
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-8 border-t border-outline-variant/10">


        <div className="mt-8 space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-4 py-2 text-on-surface-variant font-label-bold text-label-bold">
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span className="truncate">{user.name || user.email}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-error transition-colors font-label-bold text-label-bold w-full"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span> Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
