import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

type NotificationType = 'voucher' | 'chat';

interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    createdAt: string;
    read?: boolean;
}

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const loadUserId = async () => {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const parsed = JSON.parse(u);
                const id = parsed?._id || parsed?.id || null;
                setUserId(id);
                return id;
            }
        } catch { }
        setUserId(null);
        return null;
    };

    const fetchVoucherNotifications = async (): Promise<AppNotification[]> => {
        try {
            const res = await axios.get(`${BASE_URL}/vouchers`);
            const list = Array.isArray(res.data) ? res.data : [];
            const now = new Date();
            // Chỉ lấy voucher đang hoạt động và còn hạn
            const active = list.filter((v: any) => {
                const startOk = v.startDate ? new Date(v.startDate) <= now : true;
                const endOk = v.endDate ? new Date(v.endDate) >= now : true;
                const quantityOk = typeof v.quantity === 'number' && typeof v.usedCount === 'number' ? v.usedCount < v.quantity : true;
                const isActive = v.isActive !== false;
                return startOk && endOk && quantityOk && isActive;
            });
            // Map thành notifications, ưu tiên voucher mới (7 ngày gần đây)
            const sevenDaysMs = 7 * 24 * 3600 * 1000;
            const mapped: AppNotification[] = active.map((v: any) => ({
                id: `voucher_${v._id}`,
                type: 'voucher',
                title: v.name || `Voucher ${v.code}`,
                message: v.description || (v.discountType === 'percent' ? `Giảm ${v.discountValue}% cho đơn hàng đủ điều kiện` : `Giảm ${Number(v.discountValue).toLocaleString('vi-VN')}đ cho đơn hàng đủ điều kiện`),
                createdAt: v.createdAt || v.startDate || new Date().toISOString(),
                read: !(v.createdAt && (new Date().getTime() - new Date(v.createdAt).getTime() < sevenDaysMs))
            }));
            return mapped;
        } catch (e) {
            return [];
        }
    };

    const fetchChatNotifications = async (uid: string | null): Promise<AppNotification[]> => {
        if (!uid) return [];
        try {
            const res = await axios.get(`${BASE_URL}/messages/unread/${uid}`);
            const count = res?.data?.count || 0;
            const latestAt = res?.data?.latestAt || null;
            if (count > 0) {
                return [{
                    id: `chat_unread_${uid}`,
                    type: 'chat',
                    title: 'Tin nhắn mới từ Admin',
                    message: `Bạn có ${count} tin nhắn chưa đọc`,
                    createdAt: latestAt ? new Date(latestAt).toISOString() : new Date().toISOString(),
                    read: false
                }];
            }
            return [];
        } catch (e) {
            return [];
        }
    };

    const refresh = async () => {
        setRefreshing(true);
        const uid = userId || await loadUserId();
        const [voucherNotis, chatNotis] = await Promise.all([
            fetchVoucherNotifications(),
            fetchChatNotifications(uid)
        ]);
        const merged = [...voucherNotis, ...chatNotis].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(merged);
        setRefreshing(false);
    };

    useEffect(() => {
        (async () => {
            await loadUserId();
            await refresh();
        })();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            (async () => {
                // Cập nhật mốc đã xem thông báo để tính voucher mới
                try { await AsyncStorage.setItem('notifications_last_seen', new Date().toISOString()); } catch { }
                await refresh();
            })();
        }, [userId])
    );

    const onPressNotification = async (item: AppNotification) => {
        if (item.type === 'chat') {
            try {
                const uid = userId || await loadUserId();
                if (uid) {
                    await axios.put(`${BASE_URL}/messages/read-all/${uid}`);
                }
            } catch { }
            router.push('/chat');
            return;
        }
    };

    const renderItem = ({ item }: { item: AppNotification }) => {
        return (
            <TouchableOpacity onPress={() => onPressNotification(item)} activeOpacity={0.8} style={[styles.card, !item.read && styles.cardUnread]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    {item.type === 'chat' ? (
                        <Ionicons name={item.read ? 'chatbubbles-outline' : 'chatbubbles'} size={20} color={item.read ? '#666' : '#0ea5e9'} />
                    ) : (
                        <Ionicons name={item.read ? 'pricetags-outline' : 'pricetags'} size={20} color={item.read ? '#666' : '#22c55e'} />
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.message}>{item.message}</Text>
                        <Text style={styles.time}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <View style={{ padding: 16 }}>
                {notifications.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="notifications-off-outline" size={42} color="#bbb" />
                        <Text style={styles.emptyText}>Chưa có thông báo</Text>
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingVertical: 4 }}
                        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 12 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#eee'
    },
    cardUnread: {
        borderColor: '#bae6fd',
        backgroundColor: '#f0f9ff'
    },
    title: { fontSize: 15, fontWeight: '700', color: '#111' },
    message: { marginTop: 6, color: '#444' },
    time: { marginTop: 8, fontSize: 12, color: '#777' },
    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { color: '#999' }
});


