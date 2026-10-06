import Constants from 'expo-constants';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Companion } from '../../features/gamification/Companion';
import { useProgress } from '../../features/gamification/useProgress';
import { type LanguagePref, type ThemePref, useHabitStore } from '../../features/habits/store';
import { confirm } from '../../lib/confirm';
import { haptics } from '../../lib/haptics';
import { Card } from '../../ui/Card';
import { ListGroup, ListRow } from '../../ui/List';
import { Screen, ScreenHeader } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';
import { Text } from '../../ui/Text';
import { useTheme } from '../../ui/theme';
import { radius, space } from '../../ui/tokens';

export default function ProfileScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const p = useProgress();
  const settings = useHabitStore((s) => s.settings);
  const setSettings = useHabitStore((s) => s.setSettings);
  const companionName = useHabitStore((s) => s.companionName);
  const [name, setName] = useState(companionName);

  const exportData = async () => {
    const { habits, logs, frozenDates, settings: st } = useHabitStore.getState();
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), habits, logs, frozenDates, settings: st }, null, 2);
    await Share.share({ message: payload, title: tr('profile.exportTitle') }).catch(() => {});
  };

  const reset = async () => {
    const ok = await confirm(tr('profile.resetTitle'), tr('profile.resetBody'), tr('profile.resetConfirm'), tr('common.cancel'));
    if (ok) {
      haptics.warning();
      useHabitStore.getState().resetAll();
    }
  };

  return (
    <Screen>
      <ScreenHeader title={tr('profile.title')} />

      <Card style={styles.hero}>
        <Companion stage={p.stage} happy size={88} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="caption" tone="secondary" style={styles.upper}>
            {tr('profile.companion')}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={() => useHabitStore.getState().setCompanionName(name)}
            maxLength={16}
            accessibilityLabel={tr('profile.companion')}
            style={[styles.nameInput, { color: t.text, backgroundColor: t.fill }]}
            returnKeyType="done"
          />
          <Text variant="footnote" tone="secondary" tabular>
            {tr('level.short', { level: p.level.level })} · {p.xp} XP · 🪙 {p.coins}
          </Text>
        </View>
      </Card>

      <ListGroup title={tr('profile.appearance')}>
        <ListRow icon="contrast" iconColor="#5856D6" label={tr('profile.theme')}>
          <Segmented<ThemePref>
            value={settings.theme}
            onChange={(theme) => setSettings({ theme })}
            options={[
              { value: 'system', label: tr('profile.system') },
              { value: 'light', label: tr('profile.light') },
              { value: 'dark', label: tr('profile.dark') },
            ]}
          />
        </ListRow>
        <ListRow icon="language" iconColor="#007AFF" label={tr('profile.language')}>
          <Segmented<LanguagePref>
            value={settings.language}
            onChange={(language) => setSettings({ language })}
            options={[
              { value: 'system', label: tr('profile.system') },
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Español' },
            ]}
          />
        </ListRow>
        <ListRow icon="calendar" iconColor="#FF9500" label={tr('profile.weekStart')}>
          <Segmented<'0' | '1'>
            value={String(settings.weekStartsOn) as '0' | '1'}
            onChange={(v) => setSettings({ weekStartsOn: v === '0' ? 0 : 1 })}
            options={[
              { value: '1', label: tr('weekday.long.1') },
              { value: '0', label: tr('weekday.long.0') },
            ]}
          />
        </ListRow>
        <ListRow
          icon="pulse"
          iconColor="#FF2D55"
          label={tr('profile.haptics')}
          right={
            <Switch
              value={settings.haptics}
              onValueChange={(haptics) => setSettings({ haptics })}
              trackColor={{ true: t.success, false: t.fillStrong }}
              thumbColor="#FFFFFF"
              accessibilityLabel={tr('profile.haptics')}
            />
          }
        />
      </ListGroup>

      <ListGroup title={tr('profile.data')} footer={tr('profile.dataFooter')}>
        <ListRow icon="share-outline" iconColor="#34C759" label={tr('profile.export')} onPress={exportData} />
        <ListRow icon="trash-outline" iconColor="#FF3B30" label={tr('profile.reset')} destructive onPress={reset} />
      </ListGroup>

      <ListGroup title={tr('profile.about')}>
        <ListRow icon="sparkles" iconColor="#AF52DE" label={tr('profile.pro')} value={tr('profile.soon')} />
        <ListRow
          icon="information-circle"
          iconColor="#8E8E93"
          label={tr('profile.version')}
          value={Constants.expoConfig?.version ?? '1.0.0'}
        />
      </ListGroup>

      <Text variant="footnote" tone="tertiary" align="center">
        {tr('profile.madeWith')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  upper: { textTransform: 'uppercase', letterSpacing: 0.6 },
  nameInput: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: space.md,
    height: 44,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
});
