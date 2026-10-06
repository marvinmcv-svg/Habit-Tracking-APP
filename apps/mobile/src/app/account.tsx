import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { deleteAccount, sendSignInCode, signOut, syncNow, useSyncStatus, verifySignInCode } from '../features/sync/engine';
import { confirm } from '../lib/confirm';
import { haptics } from '../lib/haptics';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ListGroup, ListRow } from '../ui/List';
import { NavBar } from '../ui/NavBar';
import { Screen } from '../ui/Screen';
import { Text } from '../ui/Text';
import { useTheme } from '../ui/theme';
import { radius, space } from '../ui/tokens';

export default function AccountScreen() {
  const th = useTheme();
  const { t, i18n } = useTranslation();
  const status = useSyncStatus();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      haptics.warning();
    } finally {
      setBusy(false);
    }
  };

  if (status.phase === 'disabled') {
    return (
      <View style={{ flex: 1, backgroundColor: th.bg }}>
        <NavBar title={t('account.title')} />
        <Screen tabs={false}>
          <Card style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={th.textSecondary} />
            <Text variant="headline" align="center">
              {t('account.disabledTitle')}
            </Text>
            <Text variant="subhead" tone="secondary" align="center">
              {t('account.disabledBody')}
            </Text>
          </Card>
        </Screen>
      </View>
    );
  }

  if (status.phase === 'signedOut') {
    const validEmail = /\S+@\S+\.\S+/.test(email.trim());
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: th.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <NavBar title={t('account.title')} />
        <Screen tabs={false} keyboardShouldPersistTaps="handled">
          <Card style={styles.center}>
            <Ionicons name="cloud-upload-outline" size={40} color={th.accent} />
            <Text variant="title3" align="center">
              {t('account.signInTitle')}
            </Text>
            <Text variant="subhead" tone="secondary" align="center">
              {step === 'email' ? t('account.signInBody') : t('account.codeSent', { email: email.trim() })}
            </Text>
          </Card>
          {step === 'email' ? (
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('account.emailPlaceholder')}
              placeholderTextColor={th.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              accessibilityLabel={t('account.email')}
              style={[styles.input, { color: th.text, backgroundColor: th.card }]}
            />
          ) : (
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={th.textTertiary}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              accessibilityLabel={t('account.code')}
              style={[styles.input, styles.code, { color: th.text, backgroundColor: th.card }]}
            />
          )}
          {error ? (
            <Text variant="footnote" color={th.danger} align="center">
              {error}
            </Text>
          ) : null}
          {step === 'email' ? (
            <Button
              label={t('account.sendCode')}
              icon="mail"
              loading={busy}
              disabled={!validEmail}
              onPress={() =>
                attempt(async () => {
                  await sendSignInCode(email.trim());
                  setStep('code');
                })
              }
            />
          ) : (
            <>
              <Button
                label={t('account.verify')}
                icon="checkmark"
                loading={busy}
                disabled={code.length !== 6}
                onPress={() =>
                  attempt(async () => {
                    await verifySignInCode(email.trim(), code);
                    haptics.success();
                  })
                }
              />
              <Button
                label={t('account.changeEmail')}
                variant="plain"
                size="md"
                onPress={() => {
                  setStep('email');
                  setCode('');
                }}
              />
            </>
          )}
          <Text variant="footnote" tone="secondary" align="center">
            {t('account.privacy')}
          </Text>
        </Screen>
      </KeyboardAvoidingView>
    );
  }

  const last = status.lastSyncedAt
    ? new Intl.DateTimeFormat(i18n.language, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }).format(
        new Date(status.lastSyncedAt),
      )
    : t('account.never');

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <NavBar title={t('account.title')} />
      <Screen tabs={false}>
        <ListGroup title={t('account.signedInAs')}>
          <ListRow icon="person" iconColor="#007AFF" label={status.email ?? '—'} />
          <ListRow
            icon={status.phase === 'error' ? 'warning' : 'cloud-done'}
            iconColor={status.phase === 'error' ? '#FF9500' : '#34C759'}
            label={
              status.phase === 'syncing'
                ? t('account.syncing')
                : status.phase === 'error'
                  ? t('account.syncError')
                  : t('account.lastSynced')
            }
            value={status.phase === 'idle' ? last : undefined}
          />
          <ListRow icon="refresh" iconColor="#5856D6" label={t('account.syncNow')} onPress={() => void syncNow()} />
        </ListGroup>
        {status.phase === 'error' && status.error ? (
          <Text variant="footnote" tone="secondary">
            {status.error}
          </Text>
        ) : null}
        <ListGroup footer={t('account.deleteFooter')}>
          <ListRow icon="log-out-outline" iconColor="#8E8E93" label={t('account.signOut')} onPress={() => void signOut()} />
          <ListRow
            icon="trash"
            iconColor="#FF3B30"
            label={t('account.delete')}
            destructive
            onPress={async () => {
              const ok = await confirm(t('account.deleteTitle'), t('account.deleteBody'), t('common.delete'), t('common.cancel'));
              if (!ok) return;
              await attempt(async () => {
                await deleteAccount();
                router.back();
              });
            }}
          />
        </ListGroup>
        {error ? (
          <Text variant="footnote" color={th.danger} align="center">
            {error}
          </Text>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  input: { height: 56, borderRadius: radius.lg, borderCurve: 'continuous', paddingHorizontal: space.lg, fontSize: 17 },
  code: { textAlign: 'center', fontSize: 28, fontWeight: '700', letterSpacing: 8 },
});
