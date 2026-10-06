import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { TabBar } from '../../ui/TabBar';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, animation: 'none' }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.today') }} />
      <Tabs.Screen name="habits" options={{ title: t('tabs.habits') }} />
      <Tabs.Screen name="awards" options={{ title: t('tabs.awards') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
