import { useState, useEffect, useRef } from 'react';
import { ALARM_SOUND_URL } from '../lib/constants';

export default function AlarmManager({ eta, busPosition, stopName, className = '' }) {
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmMinutes, setAlarmMinutes] = useState(5);
  const [isTriggered, setIsTriggered] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const audioRef = useRef(null);
  const notifiedRef = useRef(false);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(ALARM_SOUND_URL);
    audioRef.current.loop = true;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Check if alarm should trigger
  useEffect(() => {
    if (!alarmEnabled || !eta || dismissed || notifiedRef.current) return;

    const etaMinutes = eta.durationSeconds / 60;

    if (etaMinutes <= alarmMinutes) {
      setIsTriggered(true);
      notifiedRef.current = true;

      // Play sound
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚌 Bus Alert!', {
          body: `Your bus is ${Math.round(etaMinutes)} minutes away from ${stopName}!`,
          icon: '/bus-icon.svg',
          tag: 'bus-alarm',
        });
      }

      // Vibration
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
  }, [eta, alarmEnabled, alarmMinutes, dismissed, stopName]);

  // Request notification permission
  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const handleEnable = async () => {
    await requestPermission();
    setAlarmEnabled(true);
    setDismissed(false);
    notifiedRef.current = false;
  };

  const handleDismiss = () => {
    setIsTriggered(false);
    setDismissed(true);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleDisable = () => {
    setAlarmEnabled(false);
    setIsTriggered(false);
    setDismissed(false);
    notifiedRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <div className={`glass-card rounded-[24px] p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-widest text-[10px]">
          <span className="material-symbols-outlined text-[14px] align-middle mr-1">alarm</span>
          Arrival Alarm
        </h4>
        {alarmEnabled && (
          <button
            onClick={handleDisable}
            className="text-error font-label-bold text-[10px] hover:underline"
          >
            DISABLE
          </button>
        )}
      </div>

      {/* Triggered State */}
      {isTriggered && !dismissed && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error text-[32px] alarm-active">
              alarm_on
            </span>
            <div>
              <p className="font-title-md text-error font-bold">Bus is arriving!</p>
              <p className="font-body-sm text-body-sm text-error/70">
                ~{eta ? Math.round(eta.durationSeconds / 60) : alarmMinutes} min to {stopName}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-full bg-error text-on-error py-3 rounded-xl font-label-bold text-label-bold active:scale-95 transition-all"
          >
            Dismiss Alarm
          </button>
        </div>
      )}

      {/* Setup State */}
      {!alarmEnabled && !isTriggered && (
        <div className="space-y-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Get notified when the bus is close to your stop
          </p>
          <div className="flex items-center gap-3">
            <label className="font-label-bold text-label-bold text-on-surface-variant text-[11px]">
              Alert me
            </label>
            <select
              value={alarmMinutes}
              onChange={(e) => setAlarmMinutes(Number(e.target.value))}
              className="bg-white/60 border border-outline-variant/30 rounded-xl px-3 py-2 font-body-sm text-body-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value={2}>2 min</option>
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
            </select>
            <span className="font-label-bold text-label-bold text-on-surface-variant text-[11px]">
              before arrival
            </span>
          </div>
          <button
            onClick={handleEnable}
            className="w-full secondary-gradient text-on-secondary py-3 rounded-xl font-label-bold text-label-bold flex items-center justify-center gap-2 hover:opacity-95 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">alarm_add</span>
            Set Alarm
          </button>
        </div>
      )}

      {/* Armed State */}
      {alarmEnabled && !isTriggered && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
          <span className="material-symbols-outlined text-green-600 text-[24px]">alarm_on</span>
          <div>
            <p className="font-label-bold text-green-700">Alarm set</p>
            <p className="font-body-sm text-body-sm text-green-600/70">
              Will alert when bus is {alarmMinutes} min away
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
