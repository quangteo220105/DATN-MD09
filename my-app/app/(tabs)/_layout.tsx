import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="splash" // ✅ Splash hiển thị đầu tiên
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      {/* --- Màn hình Splash --- */}
      <Tabs.Screen
        name="splash"
        options={{
          title: 'Splash',
          // ✅ Ẩn thanh tab khi ở Splash
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="sparkles" color={color} />
          ),
        }}
      />

      {/* --- Màn hình Home --- */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />


      {/* --- Màn hình Explore --- */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
        }}
      />
      {/* --- Màn hình Checkout --- */}
      <Tabs.Screen
        name="checkout"
        options={{
          title: 'Thanh toán',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="creditcard" color={color} />
          ),
        }}
      />
      {/* --- Màn hình Lịch sử đơn hàng --- */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Lịch sử',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="clock.arrow.circlepath" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
