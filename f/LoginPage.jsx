import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate(role === 'driver' ? '/driver' : '/student');
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex bg-background w-full">
      {/* 🧭 Left Panel: Premium Gradient Sidebar 🧭 */}
      <div className="hidden lg:flex w-1/2 premium-gradient relative overflow-hidden flex-col justify-between p-16 text-white">
        {/* Background decorations */}
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-gradient-to-br from-secondary/20 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-gradient-to-tr from-secondary/15 to-transparent blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="flex items-center gap-3 relative z-10 animate-fadeInUp">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px] text-secondary-container">directions_bus</span>
          </div>
          <div>
            <h2 className="font-display-lg text-lg tracking-wider font-extrabold">CAMPUS TRANSIT</h2>
            <p className="text-[10px] tracking-widest text-white/60 uppercase">FET Branch</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 relative z-10 animate-fadeInUp stagger-1">
          <div className="flex">
            <div className="w-20 h-20 rounded-[28px] bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-2xl">
              <span className="material-symbols-outlined text-[64px] text-secondary-container animate-pulse">directions_bus</span>
            </div>
          </div>

          <div className="text-center space-y-4">
            <h1 className="font-display-lg text-[40px] leading-tight font-extrabold tracking-tight text-left">
              Reliable Campus Commute
            </h1>
            <p className="font-body-sm text-body-sm text-white/70 leading-relaxed text-left">
              Real-time campus transit tracking for FET Branch. Check schedules, live routes, and set custom alarms.
            </p>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex gap-3 flex-wrap justify-start relative z-10 animate-fadeInUp stagger-2">
          {[
            { icon: 'location_on', text: 'Live GPS Feed' },
            { icon: 'notifications_active', text: 'Smart Proximity Alarms' },
            { icon: 'schedule', text: 'Dynamic ETAs' },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <span className="material-symbols-outlined text-[16px] text-secondary-container">{f.icon}</span>
              <span className="text-[12px] font-semibold text-white/90">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 🔐 Right Panel: Login Form 🔐 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-16 bg-background">
        <div className="w-full max-w-md bg-white border border-outline-variant/10 rounded-[32px] shadow-2xl shadow-primary/5 p-8 md:p-10 flex flex-col gap-6 animate-scaleIn">
          
          {/* Form Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center shadow-lg shadow-secondary/5 mb-2">
              <span className="material-symbols-outlined text-[28px] text-secondary font-semibold">lock_open</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg font-extrabold text-primary">Welcome Back</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Sign in to track your campus fleet</p>
          </div>

          {/* Role Toggle Selector */}
          <div className="bg-surface-variant/40 rounded-2xl p-1 flex">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-label-bold text-label-bold transition-all duration-300 ${
                role === 'student'
                  ? 'bg-white text-primary shadow-md font-bold'
                  : 'text-on-surface-variant/60 hover:text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">school</span>
              Student
            </button>
            <button
              type="button"
              onClick={() => setRole('driver')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-label-bold text-label-bold transition-all duration-300 ${
                role === 'driver'
                  ? 'bg-white text-primary shadow-md font-bold'
                  : 'text-on-surface-variant/60 hover:text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">airline_seat_recline_extra</span>
              Driver
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-error-container/50 border border-error/20 text-on-error-container rounded-2xl p-3.5 flex items-start gap-2.5 animate-fadeInUp">
              <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
              <span className="text-[12px] leading-snug">{error}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-bold text-xs text-primary uppercase tracking-wider pl-1">Email</label>
              <div className="flex items-center bg-slate-50 border border-outline-variant/30 rounded-xl px-4 focus-within:ring-2 focus-within:ring-secondary focus-within:border-secondary transition-all shadow-sm hover:border-secondary/50">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant/40 mr-2.5">mail</span>
                <input
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-none py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-0"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-bold text-xs text-primary uppercase tracking-wider pl-1">Password</label>
              <div className="flex items-center bg-slate-50 border border-outline-variant/30 rounded-xl px-4 focus-within:ring-2 focus-within:ring-secondary focus-within:border-secondary transition-all shadow-sm hover:border-secondary/50">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant/40 mr-2.5">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-none py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-0"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant/50">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full secondary-gradient text-on-secondary py-4 rounded-xl font-label-bold text-label-bold flex items-center justify-center gap-2 mt-2 transition-all duration-300 shadow-xl shadow-secondary/30 active:scale-95 hover:-translate-y-1 ${
                loading ? 'opacity-80 cursor-not-allowed' : 'hover:opacity-100 hover:shadow-secondary/50 hover:shadow-2xl'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <p className="text-center font-body-sm text-sm text-on-surface-variant">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-secondary hover:underline font-bold transition-all">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
