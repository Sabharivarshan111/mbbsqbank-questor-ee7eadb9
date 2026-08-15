import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  ChevronUp,
  Flame,
  FlaskConical,
  Lock,
  LogIn,
  LogOut,
  Moon,
  Pencil,
  RefreshCw,
  Snowflake,
  Sun,
  Trophy,
} from 'lucide-react-native';
import { typeScale } from '@/theme/typography';
import { useTheme, withAlpha, type ThemePreference } from '@/theme';
import { GradientFill } from '@/components/Gradient';
import { ProgressRing, ThinBar } from '@/components/ProgressRing';
import {
  collectAllQuestions,
  getSubjects,
  YEAR_LABEL,
} from '@/lib/questionBank';
import { reconcileProgress } from '@/lib/progress';
import { requestDailyAd } from '@/lib/dailyAd';
import {
  GoogleSignInCancelled,
  getSignedInEmail,
  signInWithGoogle,
  signOutGoogle,
} from '@/lib/googleAuth';
import { useCountDone } from '@/hooks/useProgress';
import { useProfile } from '@/hooks/useProfile';
import { ProfileSheet } from '@/components/ProfileSheet';
import { Leaderboard } from '@/components/Leaderboard';

type Tab = 'stats' | 'calendar' | 'notes';

const TABS: { key: Tab; label: string }[] = [
  { key: 'stats', label: 'Stats' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'notes', label: 'Notes' },
];

const XP_MILESTONES = [
  { label: 'Bronze Scholar', xp: 10, medal: '🥉' },
  { label: 'Silver Scholar', xp: 50, medal: '🥈' },
  { label: 'Gold Scholar', xp: 100, medal: '🥇' },
  { label: 'Platinum Mind', xp: 250, medal: '🔘' },
  { label: 'Diamond Mind', xp: 500, medal: '💎' },
  { label: 'Legendary Healer', xp: 1000, medal: '👑' },
];

const STREAK_BADGES = [
  { label: 'Spark', days: 3, tint: '#7C2D12' },
  { label: 'Blaze', days: 7, tint: '#3F3F46' },
  { label: 'Inferno', days: 14, tint: '#713F12' },
  { label: 'Wildfire', days: 30, tint: '#164E63' },
  { label: 'Eternal', days: 100, tint: '#27272A' },
];

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
];

export default function ProgressScreen() {
  const { colors, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const countDone = useCountDone();

  const { local: profile, yearKey: year, year: shortYear, displayName, streak, freezes, save } =
    useProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('stats');
  const [rewardsOpen, setRewardsOpen] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);


  const subjects = useMemo(
    () =>
      getSubjects(year).map(subject => {
        const all = collectAllQuestions(subject.node);
        const done = countDone(all);
        return {
          ...subject,
          total: all.length,
          done,
          pct: all.length ? Math.round((done / all.length) * 100) : 0,
        };
      }),
    [year, countDone],
  );

  const totals = useMemo(
    () =>
      subjects.reduce(
        (acc, subject) => ({
          done: acc.done + subject.done,
          total: acc.total + subject.total,
        }),
        { done: 0, total: 0 },
      ),
    [subjects],
  );

  const yearPct = totals.total ? Math.round((totals.done / totals.total) * 100) : 0;
  const xp = totals.done;

  useEffect(() => {
    getSignedInEmail().then(setEmail);
  }, []);

  // Once-a-day rewarded ad for the "progress" bucket. Gated on an existing
  // profile, matching the web app — a first-run user is being onboarded and
  // should not get an ad prompt stacked behind that sheet.
  useEffect(() => {
    if (profile) {
      requestDailyAd('progress').catch(() => undefined);
    }
  }, [profile]);

  const signIn = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const account = await signInWithGoogle();
      setEmail(account.email);
      // Merge whatever this device recorded anonymously into the account.
      await reconcileProgress();
    } catch (err) {
      if (!(err instanceof GoogleSignInCancelled)) {
        setAuthError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthBusy(true);
    try {
      await signOutGoogle();
      setEmail(null);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await reconcileProgress();
    } finally {
      setSyncing(false);
    }
  }, []);

  const weakest = useMemo(() => [...subjects].sort((a, b) => a.pct - b.pct).slice(0, 4), [subjects]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}>
      {/* Profile header */}
      <View style={styles.profileRow}>
        <View>
          <Text style={[styles.name, { color: colors.text }]}>
            {displayName ? `Dr. ${displayName}` : 'Set up your profile'}
          </Text>
          <Text style={[styles.year, { color: colors.textMuted }]}>{YEAR_LABEL[year]}</Text>
        </View>
        <Touchable
          onPress={() => setEditOpen(true)}
          label="Edit profile"
          hitSlop={14}
          scaleTo={0.85}>
          <Pencil size={20} color={colors.text} />
        </Touchable>
      </View>

      {/* Sync state */}
      {email ? (
        <View
          style={[
            styles.syncCard,
            {
              backgroundColor: withAlpha(colors.green, 0.06),
              borderColor: withAlpha(colors.green, 0.3),
            },
          ]}>
          <View style={[styles.syncIcon, { backgroundColor: withAlpha(colors.green, 0.15) }]}>
            <Check size={16} color={colors.green} />
          </View>
          <View style={styles.syncBody}>
            <Text style={[styles.syncLabel, { color: colors.textMuted }]}>
              Synced across devices
            </Text>
            <Text style={[styles.syncValue, { color: colors.text }]} numberOfLines={1}>
              {email}
            </Text>
          </View>
          <Touchable
            onPress={signOut}
            label="Sign out"
            hint={`Signed in as ${email}`}
            disabled={authBusy}
            hitSlop={14}
            scaleTo={0.85}>
            <LogOut size={20} color={colors.textMuted} />
          </Touchable>
        </View>
      ) : (
        <Touchable
          onPress={signIn}
          disabled={authBusy}
          state={{ busy: authBusy }}
          label="Sign in with Google"
          hint="Syncs your progress across devices"
          scaleTo={0.985}
          style={[styles.syncCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.syncIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
            {authBusy ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <LogIn size={16} color={colors.text} />
            )}
          </View>
          <View style={styles.syncBody}>
            <Text style={[styles.syncLabel, { color: colors.textMuted }]}>
              {authBusy ? 'Signing in…' : 'Not signed in'}
            </Text>
            <Text style={[styles.syncValue, { color: colors.text }]}>
              Sign in with Google to sync across devices
            </Text>
          </View>
        </Touchable>
      )}

      {authError ? (
        <Text accessibilityLiveRegion="polite" style={[styles.authError, { color: colors.danger }]}>
          {authError}
        </Text>
      ) : null}

      <Touchable
        onPress={sync}
        label="Merge this device with the cloud"
        disabled={syncing}
        state={{ busy: syncing }}
        style={[styles.syncRow, { borderColor: colors.border }]}>
        <RefreshCw size={15} color={colors.textMuted} />
        <Text style={[styles.syncRowText, { color: colors.textMuted }]}>
          {syncing ? 'Syncing…' : 'Merge this device with the cloud'}
        </Text>
      </Touchable>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.cardElevated }]}>
        {TABS.map(item => {
          const active = item.key === tab;
          return (
            <Touchable
              key={item.key}
              onPress={() => setTab(item.key)}
              role="tab"
              label={item.label}
              state={{ selected: active }}
              scale={false}
              style={[styles.tab, active && { backgroundColor: colors.background }]}>
              <Text
                style={[styles.tabText, { color: active ? colors.text : colors.textMuted }]}>
                {item.label}
              </Text>
            </Touchable>
          );
        })}
      </View>

      {tab !== 'stats' ? (
        <View style={[styles.placeholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
            {tab === 'calendar'
              ? 'The study calendar is not ported yet.'
              : 'Saved notes are not ported yet.'}
          </Text>
        </View>
      ) : (
        <>
          {/* Year ring */}
          <View style={[styles.ringCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.ringKicker, { color: colors.textMuted }]}>YOUR YEAR</Text>
            <View style={styles.ringWrap}>
              <ProgressRing percent={yearPct}>
                <Text style={[styles.ringPct, { color: colors.fuchsia }]}>{yearPct}%</Text>
                <Text style={[styles.ringLabel, { color: colors.textMuted }]}>done</Text>
              </ProgressRing>
            </View>
            <View style={styles.ringStats}>
              <View style={styles.ringStat}>
                <Text style={[styles.ringStatValue, { color: colors.success }]}>{totals.done}</Text>
                <Text style={[styles.ringStatLabel, { color: colors.textMuted }]}>COMPLETED</Text>
              </View>
              <View style={styles.ringStat}>
                <Text style={[styles.ringStatValue, { color: '#FB923C' }]}>
                  {totals.total - totals.done}
                </Text>
                <Text style={[styles.ringStatLabel, { color: colors.textMuted }]}>REMAINING</Text>
              </View>
              <View style={styles.ringStat}>
                <Text style={[styles.ringStatValue, { color: colors.fuchsia }]}>
                  {totals.total}
                </Text>
                <Text style={[styles.ringStatLabel, { color: colors.textMuted }]}>TOTAL</Text>
              </View>
            </View>
          </View>

          {/* Streak / level */}
          <View style={[styles.streakCard, { borderColor: colors.border }]}>
            <GradientFill
              from={withAlpha(colors.fuchsia, 0.12)}
              to={withAlpha('#FB923C', 0.06)}
              borderRadius={16}
            />
            <View style={styles.streakTop}>
              <View style={styles.streakLeft}>
                <Flame size={22} color="#FB923C" />
                <Text style={[styles.streakText, { color: colors.text }]}>
                  {streak} day streak
                </Text>
                <View style={[styles.freeze, { borderColor: withAlpha(colors.cyan, 0.5) }]}>
                  <Snowflake size={11} color={colors.cyan} />
                  <Text style={[styles.freezeText, { color: colors.cyan }]}>{freezes}</Text>
                </View>
              </View>
              <View style={styles.streakRight}>
                <Text style={[styles.levelText, { color: colors.text }]}>
                  Level <Text style={{ color: colors.fuchsia }}>1</Text>
                  <Text style={{ color: colors.textMuted }}> · {xp} Year XP</Text>
                </Text>
                <Text style={[styles.lifetime, { color: colors.textMuted }]}>
                  Lifetime: {xp} XP
                </Text>
              </View>
            </View>
            <View style={styles.streakBar}>
              <ThinBar percent={Math.min(100, (xp / 50) * 100)} />
            </View>
            <Text style={[styles.streakHint, { color: colors.textMuted }]}>
              {Math.min(xp, 50)} / 50 XP to level 2
            </Text>
            <View style={styles.badgeRow}>
              {[10, 50, 100, 500].map(milestone => (
                <View
                  key={milestone}
                  style={[styles.miniBadge, { borderColor: colors.border }]}>
                  <Trophy size={16} color={xp >= milestone ? colors.warning : colors.textMuted} />
                  <Text style={[styles.miniBadgeText, { color: colors.textMuted }]}>
                    {milestone}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rewards */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Touchable
              style={styles.cardHeader}
              onPress={() => setRewardsOpen(open => !open)}
              label="Rewards"
              hint={rewardsOpen ? 'Collapses the rewards list' : 'Expands the rewards list'}
              state={{ expanded: rewardsOpen }}
              scale={false}
              dim>
              <Trophy size={20} color={colors.warning} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Rewards</Text>
              <Text style={[styles.cardCount, { color: colors.fuchsia }]}>
                {XP_MILESTONES.filter(m => xp >= m.xp).length}
                <Text style={{ color: colors.textMuted }}> / {XP_MILESTONES.length + 5}</Text>
              </Text>
              <View style={styles.grow} />
              <ChevronUp
                size={20}
                color={colors.textMuted}
                style={rewardsOpen ? undefined : styles.flip}
              />
            </Touchable>

            {rewardsOpen ? (
              <>
                <Text style={[styles.subLabel, { color: colors.textMuted }]}>XP MILESTONES</Text>
                <View style={styles.milestoneGrid}>
                  {XP_MILESTONES.map(milestone => {
                    const unlocked = xp >= milestone.xp;
                    return (
                      <View
                        key={milestone.label}
                        style={[
                          styles.milestone,
                          {
                            backgroundColor: colors.cardElevated,
                            borderColor: colors.border,
                            opacity: unlocked ? 1 : 0.55,
                          },
                        ]}>
                        {!unlocked ? (
                          <Lock size={11} color={colors.textMuted} style={styles.lock} />
                        ) : null}
                        <Text style={styles.milestoneMedal}>{milestone.medal}</Text>
                        <Text style={[styles.milestoneName, { color: colors.text }]}>
                          {milestone.label}
                        </Text>
                        <Text style={[styles.milestoneXp, { color: colors.textMuted }]}>
                          {milestone.xp} XP
                        </Text>
                        <View style={styles.milestoneBar}>
                          <ThinBar percent={Math.min(100, (xp / milestone.xp) * 100)} />
                        </View>
                      </View>
                    );
                  })}
                </View>

                <Text style={[styles.subLabel, { color: colors.textMuted }]}>STREAK BADGES</Text>
                <View style={styles.streakBadges}>
                  {STREAK_BADGES.map(badge => (
                    <View
                      key={badge.label}
                      style={[
                        styles.streakBadge,
                        { backgroundColor: badge.tint, borderColor: colors.border },
                      ]}>
                      <Text style={styles.streakBadgeEmoji}>🔥</Text>
                      <Text style={[styles.streakBadgeName, { color: colors.text }]}>
                        {badge.label}
                      </Text>
                      <Text style={[styles.streakBadgeDays, { color: colors.textMuted }]}>
                        {badge.days} d
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>

          {/* Leaderboard */}
          <Leaderboard year={shortYear} selfName={displayName} />

          {/* Weak-topic heatmap */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Weak-topic heatmap</Text>
              <View style={styles.grow} />
              <Text style={[styles.cardHint, { color: colors.textMuted }]}>weakest first</Text>
            </View>
            <View style={styles.heatGrid}>
              {weakest.map(subject => (
                <View
                  key={subject.key}
                  style={[
                    styles.heatTile,
                    {
                      backgroundColor: withAlpha(colors.danger, 0.14),
                      borderColor: withAlpha(colors.danger, 0.5),
                    },
                  ]}>
                  <Text style={[styles.heatName, { color: '#FCA5A5' }]}>{subject.name}</Text>
                  <Text style={[styles.heatPct, { color: '#FCA5A5' }]}>{subject.pct}%</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Subjects */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SUBJECTS</Text>
          {subjects.map(subject => (
            <View
              key={subject.key}
              style={[styles.subjectRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.flask, { borderColor: colors.border }]}>
                <GradientFill
                  from={withAlpha(colors.fuchsia, 0.35)}
                  to={withAlpha('#FB923C', 0.2)}
                  borderRadius={10}
                />
                <FlaskConical size={20} color={colors.text} />
              </View>
              <View style={styles.subjectBody}>
                <View style={styles.subjectTop}>
                  <Text style={[styles.subjectName, { color: colors.text }]}>{subject.name}</Text>
                  <Text style={[styles.subjectPct, { color: colors.fuchsia }]}>
                    {subject.pct}%
                  </Text>
                </View>
                <View style={styles.subjectBar}>
                  <ThinBar percent={subject.pct} />
                </View>
                <Text style={[styles.subjectCount, { color: colors.textMuted }]}>
                  {subject.done} / {subject.total} questions
                </Text>
              </View>
            </View>
          ))}

          {/* Appearance */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              {preference === 'light' ? (
                <Sun size={18} color={colors.text} />
              ) : (
                <Moon size={18} color={colors.text} />
              )}
              <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance</Text>
            </View>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map(option => {
                const active = option.key === preference;
                return (
                  <Touchable
                    key={option.key}
                    onPress={() => setPreference(option.key)}
                    role="radio"
                    label={`${option.label} theme`}
                    state={{ checked: active }}
                    scaleTo={0.95}
                    style={[
                      styles.themeChip,
                      {
                        backgroundColor: active ? colors.primary : colors.cardElevated,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.themeText,
                        { color: active ? colors.primaryText : colors.textMuted },
                      ]}>
                      {option.label}
                    </Text>
                  </Touchable>
                );
              })}
            </View>
          </View>
        </>
      )}
      <ProfileSheet
        visible={editOpen || (!profile && tab === 'stats')}
        profile={profile}
        onClose={() => setEditOpen(false)}
        onSave={save}
        dismissable={!!profile}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  name: typeScale.title1,
  year: {
    fontSize: 14,
    marginTop: 2,
  },
  authError: {
    fontSize: 13,
    marginBottom: 10,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 11,
    marginBottom: 16,
  },
  syncRowText: {
    fontSize: 13,
    fontWeight: '600',
  },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 16,
  },
  syncIcon: {
    height: 34,
    width: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBody: {
    flex: 1,
  },
  syncLabel: {
    fontSize: 12,
  },
  syncValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  placeholder: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 32,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
  },
  ringCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 22,
    alignItems: 'center',
    marginBottom: 14,
  },
  ringKicker: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
  },
  ringWrap: {
    marginTop: 16,
  },
  ringPct: {
    fontSize: 38,
    fontWeight: '800',
  },
  ringLabel: {
    fontSize: 14,
  },
  ringStats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 20,
  },
  ringStat: {
    flex: 1,
    alignItems: 'center',
  },
  ringStatValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  ringStatLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 2,
  },
  streakCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  streakTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakText: {
    ...typeScale.title3,
    fontSize: 18,
    fontWeight: '800',
  },
  freeze: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  freezeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  streakRight: {
    alignItems: 'flex-end',
  },
  levelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lifetime: {
    fontSize: 11,
    marginTop: 2,
  },
  streakBar: {
    marginTop: 14,
  },
  streakHint: {
    fontSize: 12,
    marginTop: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  miniBadge: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  miniBadgeText: {
    fontSize: 11,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardCount: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardHint: {
    fontSize: 12,
  },
  grow: {
    flex: 1,
  },
  flip: {
    transform: [{ rotate: '180deg' }],
  },
  subLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 10,
  },
  milestoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  milestone: {
    width: '31.5%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    alignItems: 'center',
  },
  lock: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  milestoneMedal: {
    fontSize: 22,
  },
  milestoneName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  milestoneXp: {
    fontSize: 10,
    marginTop: 1,
  },
  milestoneBar: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
  streakBadges: {
    flexDirection: 'row',
    gap: 7,
  },
  streakBadge: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    alignItems: 'center',
  },
  streakBadgeEmoji: {
    fontSize: 20,
  },
  streakBadgeName: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  streakBadgeDays: {
    fontSize: 10,
    marginTop: 1,
  },
  heatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  heatTile: {
    width: '48%',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  heatName: {
    fontSize: 14,
    fontWeight: '600',
  },
  heatPct: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: '600',
    marginBottom: 10,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  flask: {
    height: 48,
    width: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  subjectBody: {
    flex: 1,
  },
  subjectTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectName: {
    fontSize: 17,
    fontWeight: '700',
  },
  subjectPct: {
    fontSize: 14,
    fontWeight: '700',
  },
  subjectBar: {
    marginTop: 8,
  },
  subjectCount: {
    fontSize: 13,
    marginTop: 8,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  themeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
