import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

type NotificationType = 'voucher' | 'chat' | 'order';

interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    createdAt: string;
    read?: boolean;
}

function normalizeStatus(raw?: string) {
    if (!raw) return 'Chờ xác nhận';
    const s = String(raw).trim();
    if (s === 'Đang xử lý' || s.toLowerCase() === 'pending') return 'Chờ xác nhận';
    if (s.toLowerCase() === 'confirmed') return 'Đã xác nhận';
    if (s.toLowerCase() === 'shipping' || s === 'Đang vận chuyển') return 'Đang giao hàng';
    if (s.toLowerCase() === 'delivered') return 'Đã giao hàng';
    if (s.toLowerCase() === 'cancelled' || s.toLowerCase() === 'canceled') return 'Đã hủy';
    // Bao quát thêm các biến thể có dấu/không dấu
    const lower = s.toLowerCase();
    if (lower.includes('giao')) return 'Đã giao hàng';
    return s;
}

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'chat' | 'voucher' | 'order'>('all');

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

    const fetchOrderNotifications = async (uid: string | null): Promise<AppNotification[]> => {
        if (!uid) return [];
        try {
            const res = await axios.get(`${BASE_URL}/orders/user/${uid}/list`);
            // Backend trả về { data: [...], total: ... }
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            let source = Array.isArray(list) ? list : [];

            // Fallback: nếu API trả rỗng, lấy từ lịch sử local
            if (source.length === 0) {
                try {
                    const historyKey = `order_history_${uid}`;
                    const historyStr = await AsyncStorage.getItem(historyKey);
                    const history = historyStr ? JSON.parse(historyStr) : [];
                    if (Array.isArray(history)) source = history;
                } catch { }
            }

            // Debug: log để kiểm tra
            console.log('[Notifications] Total orders:', source.length);

            // Lọc đơn hàng đã giao - kiểm tra kỹ hơn
            const delivered = source.filter((o: any) => {
                const rawStatus = String(o?.status || '').trim();
                const normalized = normalizeStatus(rawStatus);
                // Kiểm tra nhiều cách: normalized status, raw status, hoặc có chứa "giao hàng"
                const isDelivered = normalized === 'Đã giao hàng'
                    || rawStatus === 'Đã giao hàng'
                    || rawStatus.toLowerCase().includes('giao hàng')
                    || rawStatus.toLowerCase() === 'delivered';
                if (isDelivered) {
                    console.log('[Notifications] Found delivered order:', o._id || o.id, 'Status:', rawStatus, 'Normalized:', normalized);
                }
                return isDelivered;
            });

            console.log('[Notifications] Delivered orders count:', delivered.length);

            // Lấy danh sách đã thông báo (lưu dạng { orderId: lastNotifiedAt })
            const notifiedKey = `delivered_notified_ids_${uid}`;
            const existedStr = await AsyncStorage.getItem(notifiedKey);
            let notifiedMap: Record<string, string> = {};
            try {
                const parsed = existedStr ? JSON.parse(existedStr) : {};
                // Nếu là array cũ, chuyển sang object
                if (Array.isArray(parsed)) {
                    parsed.forEach((id: string) => {
                        // Đặt mốc rất cũ để không chặn thông báo hiện tại
                        notifiedMap[id] = '1970-01-01T00:00:00.000Z';
                    });
                } else if (typeof parsed === 'object') {
                    notifiedMap = parsed;
                }
            } catch { }

            console.log('[Notifications] Already notified IDs count:', Object.keys(notifiedMap).length);

            // Chỉ lấy đơn hàng chưa thông báo HOẶC được cập nhật gần đây (trong 7 ngày)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const newDelivered = delivered.filter((o: any) => {
                const orderId = String(o._id || o.id);
                const lastNotifiedAt = notifiedMap[orderId];
                const isNew = !lastNotifiedAt;

                // Nếu đã thông báo trước đó, kiểm tra xem đơn hàng có được cập nhật gần đây không
                let shouldNotify = isNew;
                if (!isNew && o.updatedAt) {
                    try {
                        const updatedDate = new Date(o.updatedAt);
                        const notifiedDate = new Date(lastNotifiedAt);
                        // Nếu đơn hàng được cập nhật SAU lần thông báo cuối, và trong 7 ngày gần đây
                        if (updatedDate > notifiedDate && updatedDate >= sevenDaysAgo) {
                            shouldNotify = true;
                            console.log('[Notifications] 🔄 Order updated after last notification:', orderId, 'Updated:', o.updatedAt, 'Last notified:', lastNotifiedAt);
                        }
                    } catch (e) {
                        console.error('[Notifications] Error parsing dates:', e);
                    }
                } else if (!isNew && !o.updatedAt) {
                    // Nếu không có updatedAt (một số bản ghi cũ), cho phép thông báo một lần
                    shouldNotify = true;
                }

                if (shouldNotify) {
                    console.log('[Notifications] ✅ Will notify order:', orderId, 'Status:', o.status, 'UpdatedAt:', o.updatedAt || 'N/A');
                } else {
                    console.log('[Notifications] ⏭️ Skip order (already notified):', orderId);
                }

                return shouldNotify;
            });

            console.log('[Notifications] New delivered orders to notify:', newDelivered.length);

            const newOrderNotis: AppNotification[] = newDelivered.map((o: any) => ({
                id: `order_${o._id || o.id}`,
                type: 'order',
                title: 'Đơn hàng đã giao thành công',
                message: `Đơn ${o.code || o._id || o.id} đã được giao. Cảm ơn bạn!`,
                createdAt: o.updatedAt || o.deliveredAt || o.createdAt || new Date().toISOString(),
                read: false,
            }));

            // Lấy cache thông báo đơn hàng để giữ lại qua các lần refresh
            const cacheKey = `order_notifications_cache_${uid}`;
            const cacheStr = await AsyncStorage.getItem(cacheKey);
            const cached: AppNotification[] = cacheStr ? JSON.parse(cacheStr) : [];

            // Gộp cache + thông báo mới, loại trùng theo id
            const byId: Record<string, AppNotification> = {};
            // Ưu tiên trạng thái đã đọc từ cache cũ
            cached.forEach(n => {
                byId[n.id] = n;
            });
            newOrderNotis.forEach(n => {
                const existing = byId[n.id];
                if (existing) {
                    byId[n.id] = {
                        ...n,
                        read: existing.read ?? n.read,
                        createdAt: n.createdAt || existing.createdAt,
                    };
                } else {
                    byId[n.id] = n;
                }
            });
            const mergedOrderNotis = Object.values(byId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // Lưu cache đã gộp để lần refresh sau vẫn còn
            await AsyncStorage.setItem(cacheKey, JSON.stringify(mergedOrderNotis));

            // Cập nhật danh sách đã thông báo (lưu thời gian thông báo)
            if (newDelivered.length > 0) {
                const now = new Date().toISOString();
                newDelivered.forEach((o: any) => {
                    const orderId = String(o._id || o.id);
                    notifiedMap[orderId] = now;
                });
                await AsyncStorage.setItem(notifiedKey, JSON.stringify(notifiedMap));
                console.log('[Notifications] Saved notified IDs with timestamps');
            }

            return mergedOrderNotis;
        } catch (e) {
            console.error('[Notifications] Error fetching order notifications:', e);
            return [];
        }
    };

    const fetchChatNotifications = async (uid: string | null): Promise<AppNotification[]> => {
        if (!uid) return [];
        try {
            const res = await axios.get(`${BASE_URL}/messages/unread/${uid}`);
            const count = res?.data?.count || 0;
            const latestAt = res?.data?.latestAt || null;
            console.log('[Notifications] Chat unread count:', count, 'latestAt:', latestAt);
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
            console.error('[Notifications] Error fetching chat notifications:', e);
            return [];
        }
    };

    const refresh = async () => {
        setRefreshing(true);
        const uid = userId || await loadUserId();
        const [voucherNotis, orderNotis, chatNotis] = await Promise.all([
            fetchVoucherNotifications(),
            fetchOrderNotifications(uid),
            fetchChatNotifications(uid)
        ]);
        const merged = [...voucherNotis, ...orderNotis, ...chatNotis].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(merged);
        setRefreshing(false);
    };

    useEffect(() => {
        (async () => {
            await loadUserId();
            await refresh();
        })();
        // Auto-poll mỗi 3s để bắt kịp thay đổi trạng thái đơn hàng từ Admin nhanh hơn
        const interval = setInterval(() => {
            refresh();
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            (async () => {
                // Cập nhật mốc đã xem thông báo để tính voucher mới
                const now = new Date().toISOString();
                try { await AsyncStorage.setItem('notifications_last_seen', now); } catch { }

                // Đánh dấu order notifications là đã đọc khi vào màn hình (nhưng KHÔNG đánh dấu chat)
                try {
                    const uid = userId || await loadUserId();
                    if (uid) {
                        // Đánh dấu order notifications là đã đọc
                        const cacheKey = `order_notifications_cache_${uid}`;
                        const cacheStr = await AsyncStorage.getItem(cacheKey);
                        const cached: AppNotification[] = cacheStr ? JSON.parse(cacheStr) : [];
                        if (Array.isArray(cached) && cached.length > 0) {
                            const updated = cached.map((n: any) => ({ ...n, read: true }));
                            await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
                        }

                        // KHÔNG đánh dấu tin nhắn chat là đã đọc ở đây - chỉ đánh dấu khi người dùng bấm vào thông báo chat
                    }
                } catch { }

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
        if (item.type === 'order') {
            try {
                const uid = userId || await loadUserId();
                if (uid) {
                    // cập nhật read=true trong cache để giữ thông báo nhưng đánh dấu đã đọc
                    const cacheKey = `order_notifications_cache_${uid}`;
                    const cacheStr = await AsyncStorage.getItem(cacheKey);
                    const cached: AppNotification[] = cacheStr ? JSON.parse(cacheStr) : [];
                    const updated = cached.map(n => n.id === item.id ? { ...n, read: true } : n);
                    await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
                    // đồng bộ state hiện tại
                    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
                }
            } catch { }
            router.push('/orders');
            return;
        }
    };

    const renderItem = ({ item }: { item: AppNotification }) => {
        return (
            <TouchableOpacity onPress={() => onPressNotification(item)} activeOpacity={0.8} style={[styles.card, !item.read && styles.cardUnread]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    {item.type === 'chat' ? (
                        <Ionicons name={item.read ? 'chatbubbles-outline' : 'chatbubbles'} size={20} color={item.read ? '#666' : '#0ea5e9'} />
                    ) : item.type === 'voucher' ? (
                        <Ionicons name={item.read ? 'pricetags-outline' : 'pricetags'} size={20} color={item.read ? '#666' : '#22c55e'} />
                    ) : (
                        <Ionicons name={item.read ? 'cube-outline' : 'cube'} size={20} color={item.read ? '#666' : '#16a34a'} />
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

    // Lọc thông báo theo tab
    const filteredNotifications = notifications.filter(item => {
        if (activeTab === 'all') return true;
        return item.type === activeTab;
    });

    // Đếm số lượng thông báo theo loại
    const counts = {
        all: notifications.length,
        chat: notifications.filter(n => n.type === 'chat').length,
        voucher: notifications.filter(n => n.type === 'voucher').length,
        order: notifications.filter(n => n.type === 'order').length,
    };

    const tabs = [
        { key: 'all', label: 'Tất cả', icon: 'notifications', count: counts.all },
        { key: 'chat', label: 'Tin nhắn', icon: 'chatbubbles', count: counts.chat },
        { key: 'voucher', label: 'Ưu đãi', icon: 'pricetags', count: counts.voucher },
        { key: 'order', label: 'Đơn hàng', icon: 'cube', count: counts.order },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            {/* Header với tabs */}
            <View style={styles.header}>
                <View style={styles.tabContainer}>
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tab,
                                activeTab === tab.key && styles.tabActive
                            ]}
                            onPress={() => setActiveTab(tab.key as any)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.tabContent}>
                                <View style={styles.tabIconContainer}>
                                    <Ionicons
                                        name={tab.icon as any}
                                        size={18}
                                        color={activeTab === tab.key ? '#fff' : '#666'}
                                    />
                                    {tab.count > 0 && (
                                        <View style={[
                                            styles.badge,
                                            activeTab === tab.key && styles.badgeActive
                                        ]}>
                                            <Text style={[
                                                styles.badgeText,
                                                activeTab === tab.key && styles.badgeTextActive
                                            ]}>
                                                {tab.count > 99 ? '99+' : tab.count}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[
                                    styles.tabText,
                                    activeTab === tab.key && styles.tabTextActive
                                ]}>
                                    {tab.label}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Nội dung thông báo */}
            <View style={{ flex: 1, padding: 16 }}>
                {filteredNotifications.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="notifications-off-outline" size={42} color="#bbb" />
                        <Text style={styles.emptyText}>
                            {activeTab === 'all' ? 'Chưa có thông báo' :
                                activeTab === 'chat' ? 'Chưa có tin nhắn mới' :
                                    activeTab === 'voucher' ? 'Chưa có ưu đãi mới' :
                                        'Chưa có thông báo đơn hàng'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredNotifications}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingVertical: 4 }}
                        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#fff',
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 20,
        textAlign: 'center'
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderRadius: 25,
        padding: 4,
        marginBottom: 8
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 20,
        backgroundColor: 'transparent',
        marginHorizontal: 2
    },
    tabActive: {
        backgroundColor: '#007bff',
        shadowColor: '#007bff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4
    },
    tabContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
    },
    tabIconContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center'
    },
    tabText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666',
        textAlign: 'center'
    },
    tabTextActive: {
        color: '#fff',
        fontWeight: '700'
    },
    badge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#ff4757',
        borderRadius: 10,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#fff'
    },
    badgeActive: {
        backgroundColor: '#fff',
        borderColor: '#007bff'
    },
    badgeText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#fff'
    },
    badgeTextActive: {
        color: '#ff4757'
    },
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
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111'
    },
    message: {
        marginTop: 6,
        color: '#444',
        lineHeight: 18
    },
    time: {
        marginTop: 8,
        fontSize: 12,
        color: '#777'
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
        textAlign: 'center'
    }
});


