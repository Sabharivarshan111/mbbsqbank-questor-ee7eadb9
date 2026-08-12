import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Flame, Trophy } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { useTheme, withAlpha } from '@/theme';
import { supabase } from '@/lib/supabase';
import { YEAR_TO_KEY, type Year } from '@/lib/profile';
import { YEAR_LABEL } from '@/lib/questionBank';

type Scope = 'weekly' | 'lifetime';

interface Row {
  id: string;
  display_name: string;
  year: Year;
  xp: number;
  streak: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Reads through the same security-definer RPCs the web app uses
 * (`get_weekly_leaderboard` / `get_year_leaderboard`) so profile rows stay
 * private — no direct table access.
 */
export function Leaderboard({ year, selfName }: { year: Year; selfName: string }) {
  const { colors } = useTheme();
  const [scope, setScope] = useState<Scope>('weekly');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rpc = scope === 'weekly' ? 'get_weekly_leaderboard' : 'get_year_leaderboard';
      const { data, error: rpcError } = await supabase.rpc(rpc, { _year: year, _limit: 50 });
      if (rpcError) {
        throw new Error(rpcError.message);
      }
      const mapped = ((data ?? []) as Record<string, unknown>[]).map(row => ({
        id: String(row.id),
        display_name: String(row.display_name ?? 'Anonymous'),
        year: row.year as Year,
        xp: Number(scope === 'weekly' ? row.weekly_xp ?? 0 : row.year_xp ?? row.xp ?? 0),
        streak: Number(row.streak ?? 0),
      }));
      setRows(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the leaderboard.');
    } finally {
      setLoading(false);
    }
  }, [scope, year]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Trophy size={20} color={colors.warning} />
        <Text style={[styles.title, { color: colors.text }]}>Leaderboard</Text>
        <View style={styles.grow} />
        <View style={[styles.scope, { backgroundColor: colors.cardElevated }]}>
          {(['weekly', 'lifetime'] as Scope[]).map(option => {
            const active = option === scope;
            return (
              <Pressable
                key={option}
                onPress={() => setScope(option)}
                style={[styles.scopeItem, active && { backgroundColor: colors.background }]}>
                <Text
                  style={[
                    styles.scopeText,
                    { color: active ? colors.text : colors.textMuted },
                  ]}>
                  {option === 'weekly' ? 'Weekly' : 'Lifetime'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={[styles.caption, { color: colors.textMuted }]}>
        {YEAR_LABEL[YEAR_TO_KEY[year]]} ·{' '}
        {scope === 'weekly' ? 'XP earned this week only.' : 'XP earned all-time.'} Ties broken by
        streak.
      </Text>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.fuchsia} />
        </View>
      ) : error ? (
        <Pressable onPress={load} style={styles.state}>
          <Text style={[styles.stateText, { color: colors.textMuted }]}>{error}</Text>
          <Text style={[styles.retry, { color: colors.fuchsia }]}>Tap to retry</Text>
        </Pressable>
      ) : rows.length === 0 ? (
        <View style={styles.state}>
          <Text style={[styles.stateText, { color: colors.textMuted }]}>
            No one on the board yet this week.
          </Text>
        </View>
      ) : (
        rows.slice(0, 10).map((row, index) => {
          const isSelf = selfName.length > 0 && row.display_name === selfName;
          return (
            <View
              key={row.id}
              style={[
                styles.row,
                isSelf && {
                  backgroundColor: withAlpha(colors.fuchsia, 0.12),
                  borderColor: withAlpha(colors.fuchsia, 0.4),
                  borderWidth: StyleSheet.hairlineWidth,
                },
              ]}>
              <Text style={[styles.rank, { color: colors.textMuted }]}>
                {index < 3 ? MEDALS[index] : `#${index + 1}`}
              </Text>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {row.display_name}
                {isSelf ? ' (you)' : ''}
              </Text>
              <View style={styles.streak}>
                <Flame size={13} color="#FB923C" />
                <Text style={[styles.streakText, { color: '#FB923C' }]}>{row.streak}</Text>
              </View>
              <Text style={[styles.xp, { color: colors.text }]}>{row.xp} XP</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  grow: {
    flex: 1,
  },
  scope: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  scopeItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  scopeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 12,
  },
  state: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  stateText: {
    fontSize: 13,
    textAlign: 'center',
  },
  retry: {
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 10,
  },
  rank: {
    width: 34,
    fontSize: 14,
    fontWeight: '700',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
  },
  xp: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 58,
    textAlign: 'right',
  },
});
