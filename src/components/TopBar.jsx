import { useAuth } from '../context/AuthContext';

export default function TopBar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white/80 backdrop-blur-xl border-b border-outline-variant/20 md:hidden">
      <div className="flex items-center gap-2">
        <span className="font-title-md text-title-md font-bold text-primary">Campus Transit</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-primary">notifications</span>
        <div className="w-8 h-8 rounded-full premium-gradient flex items-center justify-center text-white text-xs font-bold">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}
