import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { BASE_URL } from '@/config/apiConfig';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  // 🟢 Kiểm tra thanh toán thành công khi app được mở lại (global check)
  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null;
    let hasNavigated = false;

    const checkPaymentSuccess = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) return;

        // Kiểm tra flag pending
        const pendingFlag = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
        if (!pendingFlag) {
          // Nếu không còn pending, dừng interval
          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }
          return;
        }

        const pendingData = JSON.parse(pendingFlag);
        const timeSincePayment = Date.now() - pendingData.timestamp;
        
        // Chỉ kiểm tra nếu thanh toán trong vòng 5 phút
        if (timeSincePayment < 5 * 60 * 1000) {
          try {
            const response = await fetch(`${BASE_URL}/orders/user/${user._id}/list`);
            if (response.ok) {
              const json = await response.json();
              const orders = Array.isArray(json) ? json : json.data || [];
              
              // Tìm đơn hàng ZaloPay mới nhất có trạng thái "Đã xác nhận"
              const zalopayOrder = orders.find((o: any) => {
                if (o.payment !== 'zalopay') return false;
                const status = o.status?.toLowerCase() || '';
                return status.includes('xác nhận') || status.includes('đã xác nhận');
              });

              if (zalopayOrder && !hasNavigated) {
                const orderTime = zalopayOrder.createdAt ? new Date(zalopayOrder.createdAt).getTime() : 0;
                const timeDiff = Date.now() - orderTime;
                
                // Nếu đơn hàng được tạo trong vòng 3 phút gần đây
                if (timeDiff < 3 * 60 * 1000) {
                  // Đánh dấu thành công
                  await AsyncStorage.setItem(`zalopay_success_${user._id}`, 'true');
                  await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
                  
                  // Navigate về checkout ngay lập tức
                  hasNavigated = true;
                  console.log('Navigating to checkout after payment success');
                  router.replace('/checkout?payment=success');
                  
                  // Dừng interval
                  if (checkInterval) {
                    clearInterval(checkInterval);
                    checkInterval = null;
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error checking payment success:', error);
          }
        } else {
          // Xóa flag cũ
          await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }
        }
      } catch (error) {
        console.error('Error in global payment check:', error);
      }
    };

    // Kiểm tra khi app được mở lại
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        hasNavigated = false;
        // Kiểm tra ngay lập tức
        checkPaymentSuccess();
        
        // Bắt đầu interval kiểm tra mỗi 2 giây
        if (!checkInterval) {
          checkInterval = setInterval(() => {
            checkPaymentSuccess();
          }, 2000);
        }
      } else {
        // Dừng interval khi app không active
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
      }
    });

    // Kiểm tra ngay khi mount
    checkPaymentSuccess();

    // Bắt đầu interval kiểm tra mỗi 2 giây
    checkInterval = setInterval(() => {
      checkPaymentSuccess();
    }, 2000);

    return () => {
      subscription.remove();
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [router]);

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
