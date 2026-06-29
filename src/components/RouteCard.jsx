import { useNavigate } from 'react-router-dom';

export default function RouteCard({ route, liveLocation, className = '' }) {
  const navigate = useNavigate();
  const isActive = route.status === 'active';
  const isDeparted = route.status === 'departed';
  const hasLive = !!liveLocation;

  return (
    <div
      className={`route-glass-card p-6 md:p-8 rounded-[32px] flex flex-col md:flex-row items-center gap-8 group ${
        isDeparted ? 'opacity-60 grayscale-[0.5]' : ''
      } ${className}`}
    >
      {/* Time Block */}
      <div
        className={`flex flex-col items-center justify-center min-w-[100px] h-[100px] rounded-[24px] border ${
          isDeparted
            ? 'bg-primary/5 text-primary/50 border-primary/5'
            : 'bg-primary/5 text-primary border-primary/5'
        }`}
      >
        <span className="font-label-bold text-[10px] text-primary/60 uppercase mb-1 tracking-widest">
          Departs
        </span>
        <span className="font-headline-lg text-headline-lg font-extrabold">
          {route.departureTime}
        </span>
        <span className="font-label-md text-label-md font-bold opacity-60">{route.period}</span>
      </div>

      {/* Route Info */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`px-3 py-1 rounded-lg font-label-bold text-[10px] tracking-tighter ${
              isDeparted
                ? 'bg-surface-variant text-on-surface-variant'
                : 'secondary-gradient text-on-secondary'
            }`}
          >
            {route.code}
          </span>
          <h4
            className={`font-title-md text-title-md font-bold transition-colors ${
              isDeparted
                ? 'text-primary/70'
                : 'text-primary group-hover:text-secondary'
            }`}
          >
            {route.name}
          </h4>
        </div>

        {isDeparted ? (
          <div className="flex items-center gap-2 text-on-surface-variant font-label-bold text-label-bold">
            <span className="material-symbols-outlined text-[20px] text-error">block</span>
            Departed On-Time
          </div>
        ) : (
          <div className="flex items-center flex-wrap gap-x-5 gap-y-2 text-on-surface-variant font-body-sm text-body-sm">
            {route.stops.slice(0, 3).map((stop, idx) => (
              <span key={stop.name} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    idx === 0 ? 'bg-secondary' : 'bg-secondary/40'
                  }`}
                />
                {stop.name}
              </span>
            ))}
            {route.stops.length > 3 && (
              <span className="text-on-surface-variant/50 font-label-md text-label-md">
                +{route.stops.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Live status indicator */}
        {hasLive && isActive && (
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-green-500 live-indicator" />
            <span className="text-green-700 font-label-bold text-label-bold text-[11px]">
              Bus is live — sharing location
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
        {isDeparted ? (
          <>
            <button className="flex-1 md:flex-none border border-outline-variant/30 text-on-surface/40 px-6 py-3.5 rounded-2xl font-label-bold text-label-bold cursor-not-allowed">
              History
            </button>
            <button className="flex-1 md:flex-none bg-outline-variant/50 text-white/50 px-8 py-3.5 rounded-2xl font-label-bold text-label-bold cursor-not-allowed">
              View Live
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate(`/student/live/${route.id}`)}
              className="flex-1 md:flex-none border border-outline-variant/30 text-on-surface-variant py-3.5 rounded-2xl font-label-bold text-label-bold hover:bg-white hover:text-primary transition-all flex items-center justify-center gap-2 px-4"
            >
              <span className="material-symbols-outlined text-[20px]">info</span> Details
            </button>
            <button
              onClick={() => navigate(`/student/live/${route.id}`)}
              className="flex-1 md:flex-none premium-gradient text-on-primary py-3.5 rounded-2xl font-label-bold text-label-bold hover:shadow-xl hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95 px-6"
            >
              <span className="material-symbols-outlined text-[20px] live-indicator">
                radio_button_checked
              </span>
              View Live
            </button>
          </>
        )}
      </div>
    </div>
  );
}
