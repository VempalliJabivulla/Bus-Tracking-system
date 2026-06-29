import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SEED_ROUTES } from '../lib/constants';

export default function RegisterPage() {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [routeId, setRouteId] = useState('');
  const [stopName, setStopName] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, updatePrefs } = useAuth();
  const navigate = useNavigate();

  const selectedRoute = SEED_ROUTES.find((r) => r.id === routeId);
  const stops = selectedRoute ? selectedRoute.stops : [];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (role === 'student' && !routeId) {
      setError('Please select your bus route.');
      return;
    }

    if (role === 'student' && !stopName) {
      setError('Please select your stop.');
      return;
    }

    if (role === 'driver' && !busNumber.trim()) {
      setError('Please enter your bus number.');
      return;
    }

    setLoading(true);
    const result = await register(email, password, name);

    if (!result.success) {
      setError(result.error || 'Registration failed. Please try again.');
      setLoading(false);
      return;
    }

    // Save user preferences
    const prefs =
      role === 'driver'
        ? { role: 'driver', busNumber: busNumber.trim() }
        : { role: 'student', routeId, stopName };

    const prefResult = await updatePrefs(prefs);
    setLoading(false);

    if (!prefResult.success) {
      setError(prefResult.error || 'Could not save preferences.');
      return;
    }

    navigate(role === 'driver' ? '/driver' : '/student');
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left Panel: Premium Gradient Sidebar ── */}
      <div className="hidden lg:flex w-1/2 premium-gradient relative overflow-hidden flex-col justify-between p-16 text-white">
        {/* Background decorations */}
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-gradient-to-br from-secondary/20 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-gradient-to-tr from-secondary/15 to-transparent blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-lg">
            <span className="material-symbols-outlined text-secondary text-[24px]">directions_bus</span>
          </div>
          <span className="font-title-md text-title-md font-bold tracking-tight">
            Campus<span className="text-secondary-container">Transit</span>
          </span>
        </div>

        {/* Central Illustration and Title */}
        <div className="my-auto space-y-8 relative z-10 max-w-md animate-fadeInUp">
          <div className="relative w-64 h-48 mx-auto flex items-center justify-center">
            {/* Animated Road */}
            <div className="absolute bottom-6 left-0 right-0 h-1.5 bg-white/15 rounded-full overflow-hidden flex justify-around items-center px-4">
              <div className="w-6 h-0.5 bg-white/40 rounded-full animate-pulse" />
              <div className="w-6 h-0.5 bg-white/40 rounded-full animate-pulse" />
              <div className="w-6 h-0.5 bg-white/40 rounded-full animate-pulse" />
            </div>
            {/* Pulsing glow background */}
            <div className="absolute w-40 h-40 bg-radial-gradient rounded-full bg-secondary/10 filter blur-xl animate-pulse" />
            {/* Floating Bus Icon */}
            <div className="animate-busMove relative z-10 flex items-center justify-center w-24 h-24 bg-white/5 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-md">
              <span className="material-symbols-outlined text-[64px] text-secondary-container">directions_bus</span>
            </div>
          </div>

          <div className="text-center space-y-4">
            <h1 className="font-display-lg text-[40px] leading-tight font-extrabold tracking-tight">
              Create Your Account
            </h1>
            <p className="font-body-sm text-body-sm text-white/70 leading-relaxed">
              Track your campus bus in real-time or start sharing location as a driver. Registration is fast and simple.
            </p>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex gap-3 flex-wrap justify-center relative z-10 animate-fadeInUp stagger-2">
          {[
            { icon: 'verified_user', text: 'Secure Profiles' },
            { icon: 'speed', text: 'Instant Synchronization' },
            { icon: 'group', text: 'Full Campus Fleet' },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
              <span className="material-symbols-outlined text-[16px] text-secondary-container">{f.icon}</span>
              <span className="text-[12px] font-semibold text-white/90">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Register Form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-md bg-white border border-outline-variant/10 rounded-[32px] shadow-2xl shadow-primary/5 p-8 md:p-10 flex flex-col gap-6 animate-scaleIn my-8">
          
          {/* Form Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center shadow-lg shadow-secondary/5 mb-2">
              <span className="material-symbols-outlined text-[28px] text-secondary font-semibold">person_add</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg font-extrabold text-primary">Get Started</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Sign up to join Campus Transit</p>
          </div>

          {/* Role Toggle Selector */}
          <div className="bg-surface-variant/40 rounded-2xl p-1 flex shrink-0">
            <button
              type="button"
              onClick={() => {
                setRole('student');
                setBusNumber('');
              }}
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
              onClick={() => {
                setRole('driver');
                setRouteId('');
                setStopName('');
              }}
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
            
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-bold text-xs text-primary uppercase tracking-wider pl-1">Full Name</label>
              <div className="flex items-center bg-slate-50 border border-outline-variant/30 rounded-xl px-4 focus-within:ring-2 focus-within:ring-secondary focus-within:border-secondary transition-all shadow-sm hover:border-secondary/50">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant/40 mr-2.5">person</span>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border-none py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-0"
                  autoComplete="name"
                />
              </div>
            </div>

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
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-none py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-0"
                  autoComplete="new-password"
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

            {/* ── Student specific fields ── */}
            {role === 'student' && (
              <>
                {/* Route Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-bold text-xs text-primary uppercase tracking-wider pl-1">Bus Route</label>
                  <div className="flex items-center bg-slate-50 border border-outline-variant/30 rounded-xl px-4 focus-within:ring-2 focus-within:ring-secondary focus-within:border-secondary transition-all shadow-sm hover:border-secondary/50">
                    <span className="material-symbols-outlined text-[20px] text-on-surface-variant/40 mr-2.5">route</span>
                    <select
                      value={routeId}
                      onChange={(e) => {
                        setRouteId(e.target.value);
                        setStopName('');
                      }}
                      className="w-full bg-transparent border-none py-3.5 text-sm text-on-surface focus:outline-none focus:ring-0 cursor-pointer appearance-none"
                    >
                      <option value="">Select your route</option>
                      {SEED_ROUTES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.code} — {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Stop Selector (Conditional) */}
                {routeId && (
                  <div className="flex flex-col gap-1.5 animate-fadeInUp">
                    <label className="font-label-bold text-xs text-primary uppercase tracking-wider pl-1">Your Stop</label>
                    <div className="flex items-center bg-slate-50 border border-outline-variant/30 rounded-xl px-4 focus-within:ring-2 focus-within:ring-secondary focus-within:border-secondary transition-all shadow-sm hover:border-secondary/50">
                      <span className="material-symbols-outlined text-[20px] text-on-surface-variant/40 mr-2.5">pin_drop</span>
                      <select
                        value={stopName}
                        onChange={(e) => setStopName(e.target.value)}
                        className="w-full bg-transparent border-none py-3.5 text-sm text-on-surface focus:outline-none focus:ring-0 cursor-pointer appearance-none"
                      >
                        <option value="">Select your stop</option>
                        {stops.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Driver specific fields ── */}
            {role === 'driver' && (
              <div className="flex flex-col gap-1.5 animate-fadeInUp">
                <label className="font-label-bold text-xs text-primary uppercase tracking-wider pl-1">Bus Number</label>
                <div className="flex items-center bg-slate-50 border border-outline-variant/30 rounded-xl px-4 focus-within:ring-2 focus-within:ring-secondary focus-within:border-secondary transition-all shadow-sm hover:border-secondary/50">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant/40 mr-2.5">directions_bus</span>
                  <input
                    type="text"
                    placeholder="e.g. KA-01-AB-1234"
                    value={busNumber}
                    onChange={(e) => setBusNumber(e.target.value)}
                    className="w-full bg-transparent border-none py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            )}

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
                  Create Account
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <p className="text-center font-body-sm text-sm text-on-surface-variant shrink-0">
            Already have an account?{' '}
            <Link to="/login" className="text-secondary hover:underline font-bold transition-all">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
