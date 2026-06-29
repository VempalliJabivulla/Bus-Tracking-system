import { useState, useEffect, useRef, useCallback } from 'react';
import { getETA } from '../lib/olaMaps';
import { formatDuration } from '../lib/constants';

export default function ETATimer({ busPosition, destinationStop, className = '' }) {
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const lastFetchRef = useRef(0);

  const fetchETA = useCallback(async () => {
    if (!busPosition || !destinationStop) return;

    const now = Date.now();
    // Throttle: don't fetch more than once every 30 seconds
    if (now - lastFetchRef.current < 30000) return;
    lastFetchRef.current = now;

    setLoading(true);
    try {
      const result = await getETA(
        busPosition.latitude,
        busPosition.longitude,
        destinationStop.lat,
        destinationStop.lng
      );
      setEta(result);
      setError(null);
    } catch (err) {
      console.error('ETA fetch error:', err);
      setError('Unable to calculate ETA');
    } finally {
      setLoading(false);
    }
  }, [busPosition, destinationStop]);

  useEffect(() => {
    fetchETA();
    // Refresh ETA every 30 seconds
    intervalRef.current = setInterval(fetchETA, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchETA]);

  // Determine color based on ETA
  const getETAColor = () => {
    if (!eta) return 'text-white';
    const mins = eta.durationSeconds / 60;
    if (mins <= 5) return 'text-red-400';
    if (mins <= 10) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getETABgColor = () => {
    if (!eta) return 'bg-white/10';
    const mins = eta.durationSeconds / 60;
    if (mins <= 5) return 'bg-red-500/20 border-red-500/30';
    if (mins <= 10) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-green-500/20 border-green-500/30';
  };

  if (!busPosition) {
    return (
      <div className={`glass-card rounded-[24px] p-6 ${className}`}>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-[20px]">schedule</span>
          <span className="font-label-bold text-label-bold">Waiting for bus to go live...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-[24px] p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-widest text-[10px]">
          Estimated Arrival
        </h4>
        {loading && <div className="spinner !w-4 !h-4 !border-2" />}
      </div>

      {error ? (
        <p className="text-error font-body-sm text-body-sm">{error}</p>
      ) : eta ? (
        <div className="space-y-4">
          {/* Large ETA Display */}
          <div className={`${getETABgColor()} border rounded-2xl p-4 flex items-center justify-between`}>
            <div>
              <p className={`text-3xl font-extrabold font-headline-lg ${getETAColor()}`}>
                {formatDuration(eta.durationSeconds)}
              </p>
              <p className="text-on-surface-variant font-label-md text-label-md mt-1">
                to {destinationStop.name}
              </p>
            </div>
            <span className={`material-symbols-outlined text-[40px] ${getETAColor()}`}>
              timer
            </span>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-4 text-on-surface-variant font-body-sm text-body-sm">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">straighten</span>
              {eta.distanceText}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">speed</span>
              {eta.durationText}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="spinner !w-5 !h-5 !border-2" />
          <span className="text-on-surface-variant font-body-sm text-body-sm">Calculating ETA...</span>
        </div>
      )}
    </div>
  );
}
