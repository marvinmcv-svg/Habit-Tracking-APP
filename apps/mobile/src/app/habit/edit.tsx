import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatTime } from '../../features/habits/format';
import { type HabitDraft, useHabitStore } from '../../features/habits/store';
import { EMOJIS, TEMPLATES } from '../../features/habits/templates';
import type { HabitType, Schedule, TimeOfDay } from '../../features/habits/types';
import { haptics } from '../../lib/haptics';
import { syncHabitReminders } from '../../lib/notifications';
import { Button } from '../../ui/Button';
import { CircleButton, NavBar } from '../../ui/NavBar';
import { PressableScale } from '../../ui/PressableScale';
import { Segmented } from '../../ui/Segmented';
import { Text } from '../../ui/Text';
import { useTheme } from '../../ui/theme';
import { HABIT_COLOR_KEYS, habitColor, radius, space, withAlpha } from '../../ui/tokens';

type ScheduleKind = Schedule['kind'];

const DEFAULT: HabitDraft = {
  name: '',
  emoji: '🌱',
  color: 'indigo',
  type: 'boolean',
  target: 1,
  unit: '',
  schedule: { kind: 'daily' },
  timeOfDay: 'anytime',
  reminderTime: null,
};

export default function EditHabit() {
  const th = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useHabitStore((s) => (id ? s.habits.find((h) => h.id === id) : undefined));
  const weekStartsOn = useHabitStore((s) => s.settings.weekStartsOn);
  const [draft, setDraft] = useState<HabitDraft>(() =>
    existing
      ? {
          name: existing.name,
          emoji: existing.emoji,
          color: existing.color,
          type: existing.type,
          target: existing.target,
          unit: existing.unit ?? '',
          schedule: existing.schedule,
          timeOfDay: existing.timeOfDay,
          reminderTime: existing.reminderTime,
        }
      : DEFAULT,
  );
  const color = habitColor(th, draft.color);
  const set = (patch: Partial<HabitDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const valid = draft.name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    const clean: HabitDraft = {
      ...draft,
      name: draft.name.trim(),
      target: draft.type === 'boolean' || draft.type === 'quit' ? 1 : Math.max(1, draft.target),
      unit: draft.type === 'count' ? draft.unit?.trim() : undefined,
    };
    const store = useHabitStore.getState();
    if (existing) {
      store.updateHabit(existing.id, clean);
      syncHabitReminders({ ...existing, ...clean });
    } else {
      const created = store.addHabit(clean);
      syncHabitReminders(created);
    }
    haptics.success();
    router.back();
  };

  const setScheduleKind = (kind: ScheduleKind) => {
    const map: Record<ScheduleKind, Schedule> = {
      daily: { kind: 'daily' },
      weekdays: { kind: 'weekdays', days: draft.schedule.kind === 'weekdays' ? draft.schedule.days : [1, 2, 3, 4, 5] },
      x_per_week: { kind: 'x_per_week', times: draft.schedule.kind === 'x_per_week' ? draft.schedule.times : 3 },
      every_n_days: { kind: 'every_n_days', n: draft.schedule.kind === 'every_n_days' ? draft.schedule.n : 2 },
    };
    set({ schedule: map[kind] });
  };

  const setType = (type: HabitType) => {
    const target =
      type === 'count'
        ? draft.type === 'count'
          ? draft.target
          : 8
        : type === 'duration'
          ? draft.type === 'duration'
            ? draft.target
            : 15
          : 1;
    set({ type, target });
  };

  const order = weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const [hh, mm] = (draft.reminderTime ?? '08:00').split(':').map(Number);
  const shiftTime = (minutes: number) => {
    const total = (hh * 60 + mm + minutes + 1440) % 1440;
    set({ reminderTime: `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: th.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <NavBar
        modal={Platform.OS === 'ios'}
        title={existing ? t('editor.editTitle') : t('editor.newTitle')}
        right={
          <PressableScale
            onPress={save}
            disabled={!valid}
            accessibilityLabel={t('common.save')}
            style={[styles.save, { backgroundColor: valid ? th.accent : th.fill }]}
          >
            <Text variant="subhead" weight="700" color={valid ? '#FFF' : th.textTertiary}>
              {t('common.save')}
            </Text>
          </PressableScale>
        }
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {!existing ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templates}
              style={{ marginHorizontal: -space.lg }}
            >
              {TEMPLATES.map((tpl) => (
                <PressableScale
                  key={tpl.key}
                  onPress={() => {
                    haptics.selection();
                    setDraft({ ...tpl.draft, name: t(`templates.${tpl.key}`) });
                  }}
                  accessibilityLabel={t(`templates.${tpl.key}`)}
                  style={[styles.template, { backgroundColor: th.card }]}
                >
                  <Text style={{ fontSize: 18 }}>{tpl.draft.emoji}</Text>
                  <Text variant="subhead" weight="600">
                    {t(`templates.${tpl.key}`)}
                  </Text>
                </PressableScale>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.identity}>
            <View style={[styles.preview, { backgroundColor: withAlpha(color, th.scheme === 'dark' ? 0.24 : 0.15) }]}>
              <Text style={{ fontSize: 40, lineHeight: 50 }}>{draft.emoji}</Text>
            </View>
            <TextInput
              value={draft.name}
              onChangeText={(name) => set({ name })}
              placeholder={t('editor.namePlaceholder')}
              placeholderTextColor={th.textTertiary}
              maxLength={40}
              autoFocus={!existing}
              returnKeyType="done"
              accessibilityLabel={t('editor.name')}
              style={[styles.nameInput, { color: th.text, backgroundColor: th.card }]}
            />
          </View>

          <Section title={t('editor.icon')}>
            <View style={styles.emojiGrid}>
              {EMOJIS.map((e) => (
                <PressableScale
                  key={e}
                  scaleTo={0.88}
                  onPress={() => {
                    haptics.selection();
                    set({ emoji: e });
                  }}
                  accessibilityLabel={e}
                  accessibilityState={{ selected: draft.emoji === e }}
                  style={[styles.emojiCell, draft.emoji === e && { backgroundColor: withAlpha(color, 0.2), borderColor: color }]}
                >
                  <Text style={{ fontSize: 22, lineHeight: 28 }}>{e}</Text>
                </PressableScale>
              ))}
            </View>
            <View style={styles.colors}>
              {HABIT_COLOR_KEYS.map((c) => {
                const hex = habitColor(th, c);
                const selected = draft.color === c;
                return (
                  <PressableScale
                    key={c}
                    scaleTo={0.88}
                    onPress={() => {
                      haptics.selection();
                      set({ color: c });
                    }}
                    accessibilityLabel={t(`colors.${c}`)}
                    accessibilityState={{ selected }}
                    style={[styles.swatch, { backgroundColor: hex }, selected && { borderColor: th.text }]}
                  >
                    {selected ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
                  </PressableScale>
                );
              })}
            </View>
          </Section>

          <Section title={t('editor.goal')}>
            <Segmented<HabitType>
              value={draft.type}
              onChange={setType}
              options={[
                { value: 'boolean', label: t('habitType.boolean') },
                { value: 'count', label: t('habitType.count') },
                { value: 'duration', label: t('habitType.duration') },
                { value: 'quit', label: t('habitType.quit') },
              ]}
            />
            <Text variant="footnote" tone="secondary">
              {t(`habitType.help.${draft.type}`)}
            </Text>
            {draft.type === 'count' || draft.type === 'duration' ? (
              <View style={styles.stepRow}>
                <CircleButton
                  icon="remove"
                  label={t('a11y.decrease')}
                  color={color}
                  onPress={() =>
                    set({ target: Math.max(1, draft.target - (draft.type === 'duration' ? 5 : draft.target > 100 ? 500 : 1)) })
                  }
                />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text variant="title2" tabular>
                    {draft.target}
                  </Text>
                  <Text variant="footnote" tone="secondary">
                    {draft.type === 'duration' ? t('units.minutesPerDay') : t('units.perDay')}
                  </Text>
                </View>
                <CircleButton
                  icon="add"
                  label={t('a11y.increase')}
                  color={color}
                  onPress={() => set({ target: draft.target + (draft.type === 'duration' ? 5 : draft.target >= 100 ? 500 : 1) })}
                />
              </View>
            ) : null}
            {draft.type === 'count' ? (
              <TextInput
                value={draft.unit}
                onChangeText={(unit) => set({ unit })}
                placeholder={t('editor.unitPlaceholder')}
                placeholderTextColor={th.textTertiary}
                maxLength={16}
                accessibilityLabel={t('editor.unit')}
                style={[styles.input, { color: th.text, backgroundColor: th.fill }]}
              />
            ) : null}
          </Section>

          <Section title={t('editor.schedule')}>
            <Segmented<ScheduleKind>
              value={draft.schedule.kind}
              onChange={setScheduleKind}
              options={[
                { value: 'daily', label: t('schedule.kind.daily') },
                { value: 'weekdays', label: t('schedule.kind.weekdays') },
                { value: 'x_per_week', label: t('schedule.kind.x_per_week') },
                { value: 'every_n_days', label: t('schedule.kind.every_n_days') },
              ]}
            />
            {draft.schedule.kind === 'weekdays' ? (
              <View style={styles.days}>
                {order.map((d) => {
                  const days = draft.schedule.kind === 'weekdays' ? draft.schedule.days : [];
                  const on = days.includes(d);
                  return (
                    <PressableScale
                      key={d}
                      scaleTo={0.9}
                      onPress={() => {
                        const next = on ? days.filter((x) => x !== d) : [...days, d];
                        if (next.length === 0) return;
                        haptics.selection();
                        set({ schedule: { kind: 'weekdays', days: next } });
                      }}
                      accessibilityLabel={t(`weekday.long.${d}`)}
                      accessibilityState={{ selected: on }}
                      style={[styles.dayChip, { backgroundColor: on ? color : th.fill }]}
                    >
                      <Text variant="footnote" weight="700" color={on ? '#FFF' : th.textSecondary}>
                        {t(`weekday.min.${d}`)}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            ) : null}
            {draft.schedule.kind === 'x_per_week' || draft.schedule.kind === 'every_n_days' ? (
              <View style={styles.stepRow}>
                <CircleButton
                  icon="remove"
                  label={t('a11y.decrease')}
                  color={color}
                  onPress={() =>
                    set({
                      schedule:
                        draft.schedule.kind === 'x_per_week'
                          ? { kind: 'x_per_week', times: Math.max(1, draft.schedule.times - 1) }
                          : { kind: 'every_n_days', n: Math.max(2, (draft.schedule as { n: number }).n - 1) },
                    })
                  }
                />
                <Text variant="headline" align="center" style={{ flex: 1 }}>
                  {draft.schedule.kind === 'x_per_week'
                    ? t('schedule.perWeek', { count: draft.schedule.times })
                    : t('schedule.everyN', { count: draft.schedule.n })}
                </Text>
                <CircleButton
                  icon="add"
                  label={t('a11y.increase')}
                  color={color}
                  onPress={() =>
                    set({
                      schedule:
                        draft.schedule.kind === 'x_per_week'
                          ? { kind: 'x_per_week', times: Math.min(6, draft.schedule.times + 1) }
                          : { kind: 'every_n_days', n: Math.min(30, (draft.schedule as { n: number }).n + 1) },
                    })
                  }
                />
              </View>
            ) : null}
          </Section>

          <Section title={t('editor.timeOfDay')}>
            <Segmented<TimeOfDay>
              value={draft.timeOfDay}
              onChange={(timeOfDay) => set({ timeOfDay })}
              options={(['morning', 'afternoon', 'evening', 'anytime'] as const).map((v) => ({ value: v, label: t(`timeOfDay.${v}`) }))}
            />
            <View style={styles.reminderRow}>
              <Ionicons name="notifications-outline" size={20} color={th.textSecondary} />
              <Text variant="body" style={{ flex: 1 }}>
                {t('editor.reminder')}
              </Text>
              <Switch
                value={draft.reminderTime !== null}
                onValueChange={(on) => set({ reminderTime: on ? '08:00' : null })}
                trackColor={{ true: th.success, false: th.fillStrong }}
                thumbColor="#FFFFFF"
                accessibilityLabel={t('editor.reminder')}
              />
            </View>
            {draft.reminderTime ? (
              <View style={styles.stepRow}>
                <CircleButton icon="remove" label={t('a11y.earlier')} color={color} onPress={() => shiftTime(-15)} />
                <Text variant="title2" align="center" style={{ flex: 1 }} tabular>
                  {formatTime(draft.reminderTime, i18n.language)}
                </Text>
                <CircleButton icon="add" label={t('a11y.later')} color={color} onPress={() => shiftTime(15)} />
              </View>
            ) : null}
          </Section>

          <Button
            label={existing ? t('common.save') : t('editor.create')}
            onPress={save}
            disabled={!valid}
            color={color}
            icon="checkmark"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const th = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="footnote" tone="secondary" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={[styles.section, { backgroundColor: th.card }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 560, gap: space.xl },
  save: { paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  templates: { paddingHorizontal: space.lg, gap: space.sm },
  template: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: 20 },
  identity: { alignItems: 'center', gap: space.md },
  preview: { width: 84, height: 84, borderRadius: 26, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  nameInput: {
    alignSelf: 'stretch',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    height: 56,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: space.lg,
  },
  sectionTitle: { paddingHorizontal: space.lg, textTransform: 'uppercase', letterSpacing: 0.3 },
  section: { borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg, gap: space.md },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  emojiCell: {
    width: '12%',
    aspectRatio: 1,
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colors: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  input: { height: 44, borderRadius: radius.sm, paddingHorizontal: space.md, fontSize: 16 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayChip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs },
});
