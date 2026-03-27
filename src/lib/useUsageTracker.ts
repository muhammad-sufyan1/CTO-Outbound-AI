import { useState, useEffect } from 'react';

export interface UsageStats {
  date: string;
  counts: Record<string, number>;
}

export function useUsageTracker() {
  const [stats, setStats] = useState<UsageStats>({ date: new Date().toDateString(), counts: {} });

  useEffect(() => {
    const loadStats = () => {
      const today = new Date().toDateString();
      const saved = localStorage.getItem('app_usage_stats');
      if (saved) {
        try {
          const parsed: UsageStats = JSON.parse(saved);
          if (parsed.date === today) {
            setStats(parsed);
          } else {
            // Reset for new day
            setStats({ date: today, counts: {} });
          }
        } catch (e) {
          setStats({ date: today, counts: {} });
        }
      }
    };

    loadStats();

    // Listen for custom event to sync state across components
    window.addEventListener('usage_updated', loadStats);
    return () => window.removeEventListener('usage_updated', loadStats);
  }, []);

  const trackUsage = (widgetId: string) => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('app_usage_stats');
    let currentStats: UsageStats = { date: today, counts: {} };
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === today) {
          currentStats = parsed;
        }
      } catch (e) {}
    }

    const newCounts = { ...currentStats.counts, [widgetId]: (currentStats.counts[widgetId] || 0) + 1 };
    const newStats = { ...currentStats, counts: newCounts };
    
    localStorage.setItem('app_usage_stats', JSON.stringify(newStats));
    
    // Dispatch event so all hooks update
    window.dispatchEvent(new Event('usage_updated'));
  };

  return { stats, trackUsage };
}
