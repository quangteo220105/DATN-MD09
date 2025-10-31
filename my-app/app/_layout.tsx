import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ title: 'Thanh toán' }} />
        <Stack.Screen name="history" options={{ title: 'Lịch sử mua hàng' }} />
        <Stack.Screen name="orders" options={{ title: 'Đơn hàng của tôi' }} />
        <Stack.Screen name="order/[id]" options={{ title: 'Chi tiết đơn hàng' }} />
        <Stack.Screen name="settings" options={{ title: 'Cài đặt' }} />
        <Stack.Screen name="chat" options={{ title: 'Chat với AI' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
