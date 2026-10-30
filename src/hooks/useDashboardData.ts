// src/hooks/useDashboardData.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { DashboardStats, DashboardChartsData, DateRangeType } from './dashboard/types';
import { INITIAL_STATS, INITIAL_CHARTS, DEBUG } from './dashboard/constants';
import { getDateRange } from './dashboard/dateRange';
import { getGroupBy } from './dashboard/groupBy';
import { useDashboardFetch } from './dashboard/useDashboardFetch';

export type { DashboardStats, DashboardChartsData, DateRangeType };

export const useDashboardData = () => {
  const isMounted = useRef(true);
  const requestId = useRef(0);
  const firstLoadDone = useRef(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeType>('mois');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [chartsData, setChartsData] = useState<DashboardChartsData>(INITIAL_CHARTS);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const { loadData } = useDashboardFetch({
    dateRange, customStartDate, customEndDate,
    setStats, setChartsData, setLoading, setRefreshing,
    isMountedRef: isMounted, requestIdRef: requestId,
    firstLoadDoneRef: firstLoadDone,
  });

  const getDateRangeCallback = useCallback(
    () => getDateRange(dateRange, customStartDate, customEndDate),
    [dateRange, customStartDate, customEndDate]
  );
  const getGroupByCallback = useCallback(() => getGroupBy(dateRange), [dateRange]);

  const effectiveCustomStart = dateRange === 'custom' ? customStartDate : '';
  const effectiveCustomEnd = dateRange === 'custom' ? customEndDate : '';

  // ⭐ Fetch rehefa miova période
  useEffect(() => {
    const isInitial = !firstLoadDone.current;
    if (DEBUG) console.log('[useDashboardData] ✅ Fetch:', { dateRange, effectiveCustomStart, effectiveCustomEnd, isInitial });
    loadData(!isInitial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, effectiveCustomStart, effectiveCustomEnd]);

  // ⭐⭐ VAOVAO: Mihaino ny event restore/backup mba hanao refresh automatique
  useEffect(() => {
    if (!window.api?.dashboard?.onChanged) return;

    let unsub = null;
    try {
      // ⭐ Mifanaraka amin'ny preload: 'dashboard:changed'
      unsub = window.api.dashboard.onChanged((payload: any) => {
        if (DEBUG) console.log('[useDashboardData] 🔄 dashboard:changed reçu:', payload);
        // Manao refresh feno — mamerina ny data avy amin'ny DB vaovao
        loadData(true);
      });
    } catch (err) {
      console.warn('⚠️ Impossible de souscrire dashboard:changed:', err);
    }

    return () => { try { unsub && unsub(); } catch (_) {} };
  }, [loadData]);

  // ⭐⭐ VAOVAO: Mihaino ny event app:dataReloaded (avy amin'ny main)
  useEffect(() => {
    if (!window.api?.dashboard?.onChanged) return;
    // Raha mila listener manokana ianao dia ampidiro ao amin'ny preload:
    // on('app:dataReloaded', callback)
    const handler = () => loadData(true);
    try {
      // Ampiasao raha misy ipcRenderer.on('app:dataReloaded') eo amin'ny preload
      // const unsub = window.api.app?.onDataReloaded?.(handler);
    } catch (_) {}
  }, [loadData]);

  return {
    loading, refreshing, stats, chartsData, loadData,
    dateRange, setDateRange,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    getDateRange: getDateRangeCallback,
    getGroupBy: getGroupByCallback,
  };
};

export default useDashboardData;