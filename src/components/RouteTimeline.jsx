import { useState, useMemo } from 'react';

export default function RouteTimeline({ route, busPosition, className = '' }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Find the closest stop to the bus
  const closestIdx = useMemo(() => {
    if (!busPosition || !route?.stops) return 0;
    let minDist = Infinity;
    let idx = 0;
    route.stops.forEach((s, i) => {
      const d = Math.sqrt(
        Math.pow(busPosition.latitude - s.lat, 2) +
        Math.pow(busPosition.longitude - s.lng, 2)
      );
      if (d < minDist) {
        minDist = d;
        idx = i;
      }
    });
    return idx;
  }, [busPosition, route?.stops]);

  // Determine which stops have been passed based on bus position
  const getStopStatus = (index) => {
    if (!busPosition) {
      return index === 0 ? 'current' : 'upcoming';
    }
    if (index < closestIdx) return 'departed';
    if (index === closestIdx) return 'current';
    return 'upcoming';
  };

  const stopsToRender = useMemo(() => {
    if (!route?.stops) return [];
    if (isExpanded || route.stops.length <= 3) {
      return route.stops.map((stop, index) => ({ stop, originalIndex: index }));
    }

    // Collapsed view: show first, active (or middle), and last stop
    const first = { stop: route.stops[0], originalIndex: 0 };
    const last = { stop: route.stops[route.stops.length - 1], originalIndex: route.stops.length - 1 };

    let middleIdx = closestIdx;
    if (middleIdx === 0 || middleIdx === route.stops.length - 1) {
      middleIdx = Math.floor(route.stops.length / 2);
    }
    const middle = { stop: route.stops[middleIdx], originalIndex: middleIdx };

    return [first, middle, last];
  }, [route?.stops, isExpanded, closestIdx]);

  return (
    <div className={`premium-gradient text-on-primary rounded-[32px] p-8 shadow-2xl relative overflow-hidden ${className}`}>
      {/* Background decoration */}
      <div className="absolute -top-10 -right-10 opacity-5 rotate-12">
        <span className="material-symbols-outlined text-[240px]">directions_bus</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-10 relative z-10">
        <h3 className="font-title-md text-white font-bold">Real-time Progress</h3>
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-label-bold uppercase ${
            busPosition ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'
          }`}
        >
          {busPosition ? 'Live' : 'Waiting'}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative pl-8 space-y-10 z-10">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-[3px] timeline-line opacity-20" />

        {stopsToRender.map(({ stop, originalIndex }) => {
          const status = getStopStatus(originalIndex);

          return (
            <div key={stop.name} className={`relative ${status === 'upcoming' && !busPosition ? '' : ''} ${status === 'upcoming' ? 'opacity-30' : ''}`}>
              {/* Dot */}
              <div
                className={`absolute -left-[28px] top-1 w-4 h-4 rounded-full ${
                  status === 'departed'
                    ? 'bg-secondary shadow-[0_0_15px_rgba(252,108,41,0.5)]'
                    : status === 'current'
                    ? 'bg-white animate-pulse ring-8 ring-white/10'
                    : 'bg-white/20 border-2 border-white/40'
                }`}
              />

              {/* Content */}
              <div className="flex flex-col">
                <span className="font-label-bold text-sm text-white tracking-wide">
                  {stop.name}
                </span>
                {status === 'departed' && (
                  <span className="text-xs text-white/50 mt-0.5">
                    Departed {route.departureTime} {route.period}
                  </span>
                )}
                {status === 'current' && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-secondary-fixed font-bold">
                      {busPosition ? 'Bus is here' : 'Next Stop'}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    <span className="text-xs text-white/70">
                      {busPosition ? 'Currently at this stop' : 'Waiting for driver'}
                    </span>
                  </div>
                )}
                {status === 'upcoming' && (
                  <span className="text-xs text-white/50 mt-0.5">
                    Upcoming
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand Button */}
      {route?.stops && route.stops.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-12 bg-white text-primary py-4 rounded-2xl font-label-bold text-label-bold hover:bg-secondary-fixed transition-all shadow-xl active:scale-95 z-10 relative"
        >
          {isExpanded ? 'Collapse Stop History' : 'Expand Full Stop History'}
        </button>
      )}
    </div>
  );
}
