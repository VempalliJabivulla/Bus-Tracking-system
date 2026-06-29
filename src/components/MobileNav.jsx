import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MobileNav() {
  const { isDriver } = useAuth();

  const studentItems = [
    { to: '/student', icon: 'home', label: 'Home' },
    { to: '/student/routes', icon: 'route', label: 'Routes' },
    { to: '/student/planner', icon: 'map', label: 'Planner' },
  ];

  const driverItems = [
    { to: '/driver', icon: 'dashboard', label: 'Dashboard' },
    { to: '/driver/route', icon: 'share_location', label: 'Share' },
  ];

  const items = isDriver ? driverItems : studentItems;

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 md:hidden flex justify-around items-center px-4 py-4 bg-white/90 backdrop-blur-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)] border-t border-outline-variant/10">
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center font-label-md text-label-md gap-1 ${
              isActive ? 'text-primary font-bold' : 'text-on-surface-variant/60'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
          <span className="text-[10px]">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
