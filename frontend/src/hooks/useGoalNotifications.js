import { useEffect, useRef } from 'react';

function buildGoalMessage(match) {
  return `¡GOL! ${match.teamA.name} ${match.teamA.goals} - ${match.teamB.goals} ${match.teamB.name}`;
}

export function useGoalNotifications(matches, enabled) {
  const previousScoresRef = useRef(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !('Notification' in window)) return;

    const previousScores = previousScoresRef.current;
    const liveMatches = matches.filter((match) => match.status === 'En Vivo');

    if (!initializedRef.current) {
      for (const match of matches) {
        previousScores.set(match.id, {
          home: match.teamA.goals,
          away: match.teamB.goals,
        });
      }
      initializedRef.current = true;
      return;
    }

    for (const match of liveMatches) {
      const prev = previousScores.get(match.id) || {
        home: match.teamA.goals,
        away: match.teamB.goals,
      };

      const homeScored = match.teamA.goals > prev.home;
      const awayScored = match.teamB.goals > prev.away;

      if (homeScored || awayScored) {
        new Notification('Tobis · ¡GOL!', {
          body: buildGoalMessage(match),
          icon: match.teamA.flag,
          tag: `goal-${match.id}-${match.teamA.goals}-${match.teamB.goals}`,
        });
      }

      previousScores.set(match.id, {
        home: match.teamA.goals,
        away: match.teamB.goals,
      });
    }

    for (const match of matches) {
      if (!previousScores.has(match.id)) {
        previousScores.set(match.id, {
          home: match.teamA.goals,
          away: match.teamB.goals,
        });
      }
    }
  }, [matches, enabled]);
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const permission = await Notification.requestPermission();
  return permission;
}
