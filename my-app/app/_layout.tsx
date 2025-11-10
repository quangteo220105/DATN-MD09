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
        <Stack.Screen name="product/[id]" options={{ title: 'Chi tiết sản phẩm' }} />
        <Stack.Screen name="checkout" options={{ title: 'Thanh toán' }} />
        <Stack.Screen name="history" options={{ title: 'Lịch sử mua hàng' }} />
        <Stack.Screen name="orders" options={{ title: 'Đơn hàng của tôi' }} />
        <Stack.Screen name="order/[id]" options={{ title: 'Chi tiết đơn hàng' }} />
        <Stack.Screen name="review/[id]" options={{ title: 'Đánh giá đơn hàng' }} />
        <Stack.Screen name="settings" options={{ title: 'Cài đặt' }} />
        <Stack.Screen name="profile" options={{ title: 'Thông tin cá nhân' }} />
        <Stack.Screen name="chat" options={{ title: 'Hỗ trợ tư vấn' }} />
        <Stack.Screen name="chatAI" options={{ title: 'Tư vấn mua hàng (AI)' }} />
        <Stack.Screen name="favorites" options={{ title: 'Yêu thích' }} />
        <Stack.Screen name="changePassword" options={{ title: 'Đổi mật khẩu' }} />
        <Stack.Screen name="notifications" options={{ title: 'Thông báo' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
