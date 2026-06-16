import { useMemo, useRef, useState } from 'react';
import MatchDetailPanel from './components/MatchDetailPanel.jsx';
import FilterTabs from './components/FilterTabs.jsx';
import LiveViewer from './components/LiveViewer.jsx';
import Navbar from './components/Navbar.jsx';
import ScheduleDays from './components/ScheduleDays.jsx';
import ScheduleFullList from './components/ScheduleFullList.jsx';
import ScoreCard from './components/ScoreCard.jsx';
import {
  requestNotificationPermission,
  useGoalNotifications,
} from './hooks/useGoalNotifications.js';
import { useMatches } from './hooks/useMatches.js';
import { useMatchDetail } from './hooks/useMatchDetail.js';
import { isLiveDataSource, todayIsoDate } from './services/api.js';

export default function App() {
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const viewerRef = useRef(null);

  const {
    matches: dayMatches,
    allMatches: fullSchedule,
    scheduleDays,
    meta,
    loading,
  } = useMatches({
    date: selectedDate,
  });

  const matches = useMemo(() => {
    if (activeFilter === 'all') return dayMatches;
    return dayMatches.filter((match) => match.status === activeFilter);
  }, [dayMatches, activeFilter]);

  const usingFallback = meta?.usingFallback || !isLiveDataSource(meta?.source);

  useGoalNotifications(dayMatches, notificationsEnabled);

  const counts = useMemo(
    () => ({
      all: dayMatches.length,
      'En Vivo': dayMatches.filter((match) => match.status === 'En Vivo').length,
      Finalizado: dayMatches.filter((match) => match.status === 'Finalizado').length,
    }),
    [dayMatches]
  );

  const selectedMatch =
    fullSchedule.find((match) => String(match.id) === String(selectedMatchId)) || null;

  const {
    detail: matchDetail,
    enrichedMatch: selectedEnrichedMatch,
    message: detailMessage,
    loading: detailLoading,
  } = useMatchDetail(selectedMatch);

  const viewerMatch = selectedEnrichedMatch || selectedMatch;

  function selectMatch(matchId) {
    setSelectedMatchId(matchId);

    requestAnimationFrame(() => {
      viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function enableNotifications() {
    const permission = await requestNotificationPermission();
    setNotificationsEnabled(permission === 'granted');
  }

  return (
    <div className="min-h-screen bg-carbon">
      <Navbar selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-card p-3 sm:mb-6 sm:gap-4 sm:p-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold sm:text-lg">Partidos del día</h2>
            <p className="text-xs leading-relaxed text-white/60 sm:text-sm">
              {meta?.message || 'Cargando actualización...'}
              {meta?.apiBudget
                ? ` · API ${meta.apiBudget.usedToday}/${meta.apiBudget.limit} hoy`
                : ''}
              {dayMatches.length ? ` · ${dayMatches.length} este día` : ''}
              {meta?.totalInSchedule ? ` · ${meta.totalInSchedule} en fase de grupos` : ''}
            </p>
            {meta?.budgetExhausted ? (
              <p className="mt-1 text-xs text-white/45">
                Mostrando la última actualización disponible
              </p>
            ) : null}
            {usingFallback && !loading ? (
              <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Marcadores en vivo no conectados. En Vercel define{' '}
                <code className="text-amber-50">VITE_API_URL</code> con tu backend Railway y
                agrega <code className="text-amber-50">SPORTSAPI_KEY</code> en Railway.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={enableNotifications}
            className={`touch-target w-full rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] sm:w-auto sm:py-2 ${
              notificationsEnabled
                ? 'bg-accent/15 text-accent'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            {notificationsEnabled ? 'Notificaciones activas' : 'Activar alertas de gol'}
          </button>
        </section>

        <ScheduleDays
          days={scheduleDays}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setShowFullSchedule(false);
          }}
        />

        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <FilterTabs
              activeFilter={activeFilter}
              onChange={setActiveFilter}
              counts={counts}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFullSchedule((current) => !current)}
            className={`touch-target rounded-full px-4 py-2 text-sm font-medium transition active:scale-[0.98] ${
              showFullSchedule
                ? 'bg-accent text-black'
                : 'border border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
            }`}
          >
            {showFullSchedule
              ? 'Ver partidos del día'
              : `Calendario completo (${meta?.totalInSchedule || fullSchedule.length || 72})`}
          </button>
        </div>

        {loading && (
          <p className="mb-6 rounded-2xl border border-white/10 bg-card p-6 text-white/60">
            Cargando partidos...
          </p>
        )}

        {!loading && !showFullSchedule && matches.length === 0 && (
          <p className="mb-6 rounded-2xl border border-white/10 bg-card p-6 text-white/60">
            No hay partidos para esta fecha o filtro.
          </p>
        )}

        {showFullSchedule ? (
          <ScheduleFullList
            scheduleDays={scheduleDays}
            allMatches={fullSchedule}
            selectedMatchId={selectedMatchId}
            onSelectMatch={selectMatch}
          />
        ) : (
          <section aria-label="Partidos" className="mb-4 grid gap-3 sm:mb-6 sm:gap-4">
            {matches.map((match) => (
              <ScoreCard
                key={match.id}
                match={match}
                highlighted={String(selectedMatch?.id) === String(match.id)}
                onSelect={() => selectMatch(match.id)}
              />
            ))}
          </section>
        )}

        <div ref={viewerRef} className="mb-4 scroll-mt-[4.5rem] sm:mb-6 sm:scroll-mt-24">
          <LiveViewer match={viewerMatch} />
        </div>

        {viewerMatch ? (
          <div className="mb-6">
            <MatchDetailPanel
              match={viewerMatch}
              detail={matchDetail}
              loading={detailLoading}
              message={detailMessage}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
