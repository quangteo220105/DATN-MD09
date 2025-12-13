import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    ScrollView,
    Image,
    RefreshControl,
    Modal,
    TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { BASE_URL, DOMAIN } from '../config/apiConfig';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const STATUS_ORDER = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng'] as const;

const STATUS_INFO: Record<string, { emoji: string; color: string }> = {
    'Chờ xác nhận': { emoji: '🛒', color: '#0ea5e9' },
    'Thanh toán lại': { emoji: '💳', color: '#f59e0b' },
    'Đã xác nhận': { emoji: '📦', color: '#22c55e' },
    'Đang giao hàng': { emoji: '🚚', color: '#f59e0b' },
    'Đã giao hàng': { emoji: '✅', color: '#16a34a' },

    'Đã hủy': { emoji: '❌', color: '#ef4444' },
};

function normalizeStatus(raw?: string) {
    if (!raw) return 'Chờ xác nhận';
    const s = String(raw).trim();
    if (s === 'Đang xử lý' || s.toLowerCase() === 'pending') return 'Chờ xác nhận';
    // Map "Chờ thanh toán" từ backend thành "Thanh toán lại" để hiển thị
    if (s.toLowerCase() === 'chờ thanh toán' || s.toLowerCase() === 'waiting payment' || s.toLowerCase() === 'pending payment') return 'Thanh toán lại';
    if (s.toLowerCase() === 'confirmed') return 'Đã xác nhận';
    if (s.toLowerCase() === 'shipping' || s === 'Đang vận chuyển') return 'Đang giao hàng';
    if (s.toLowerCase() === 'delivered') return 'Đã giao hàng';
    if (s.toLowerCase() === 'cancelled' || s.toLowerCase() === 'canceled') return 'Đã hủy';
    return STATUS_INFO[s] ? s : 'Chờ xác nhận';
}

function mergeOrderData(localOrder: any, backendOrder: any) {
    if (!backendOrder) return localOrder;

    const mergedId = localOrder?.id || backendOrder?._id || backendOrder?.id;

    const merged = {
        ...localOrder,
        ...backendOrder,
        id: mergedId,
        _id: backendOrder?._id || localOrder?._id,
        items: Array.isArray(backendOrder?.items) && backendOrder.items.length > 0
            ? backendOrder.items
            : (localOrder?.items || []),
        // 🟢 Ưu tiên status từ backend để cập nhật đúng trạng thái mới nhất
        // Ví dụ: "Chờ thanh toán" -> "Đã xác nhận" khi thanh toán lại thành công
        status: backendOrder?.status !== undefined ? backendOrder.status : localOrder?.status,
        payment: backendOrder?.payment ?? localOrder?.payment,
        total: backendOrder?.total ?? localOrder?.total,
        discount: backendOrder?.discount ?? localOrder?.discount,
        voucherCode: backendOrder?.voucherCode ?? localOrder?.voucherCode,
        voucherAppliedAmount: backendOrder?.discount ?? localOrder?.voucherAppliedAmount,
        address: backendOrder?.address ?? localOrder?.address,
        // 🟢 Giữ nguyên createdAt từ local để không thay đổi thời gian đặt hàng gốc
        createdAt: localOrder?.createdAt ?? backendOrder?.createdAt,
        shippingDate: backendOrder?.shippingDate ?? localOrder?.shippingDate,
        deliveredDate: backendOrder?.deliveredDate ?? localOrder?.deliveredDate,
        cancelledDate: backendOrder?.cancelledDate ?? localOrder?.cancelledDate,
    };

    if (!merged.voucher && merged.voucherCode) {
        merged.voucher = { code: merged.voucherCode };
    }

    return merged;
}

export default function OrdersScreen() {
    const [orders, setOrders] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<string>('Tất cả');
    const [refreshing, setRefreshing] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelingOrder, setCancelingOrder] = useState<{ orderId: any; backendId?: any } | null>(null);
    const router = useRouter();

    // Fetch orders từ API hoặc AsyncStorage fallback
    const fetchOrders = React.useCallback(async () => {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) {
            router.replace('/(tabs)/login');
            return;
        }

        const historyKey = `order_history_${user._id}`;
        const historyString = await AsyncStorage.getItem(historyKey);
        let localHistory = historyString ? JSON.parse(historyString) : [];
        localHistory = Array.isArray(localHistory) ? localHistory : [];

        try {
            const res = await fetch(`${BASE_URL}/orders/user/${user._id}/list`);
            const json = await res.json();
            const backendList = Array.isArray(json) ? json : json.data || [];

            if (Array.isArray(backendList)) {
                // Lọc đơn hàng: 
                // - Với ZaloPay: lấy đơn hàng đã thanh toán thành công (trạng thái "Đã xác nhận" trở lên)
                //   hoặc đơn hàng "Chờ thanh toán" từ backend (sẽ hiển thị là "Thanh toán lại")
                //   hoặc đơn hàng đã có trong AsyncStorage (đã được thêm khi thanh toán thành công)
                // - Với COD: lấy tất cả
                const filteredBackendOrders = backendList.filter((order: any) => {
                    if (order.payment !== 'zalopay') {
                        // COD: lấy tất cả
                        return true;
                    }

                    // ZaloPay: lấy đơn hàng đã thanh toán thành công hoặc đang chờ thanh toán (Thanh toán lại)
                    const status = normalizeStatus(order.status);
                    const isPaid = status === 'Đã xác nhận' ||
                        status === 'Đang giao hàng' ||
                        status === 'Đã giao hàng';
                    const isWaitingPayment = status === 'Thanh toán lại';

                    // Hoặc đơn hàng đã có trong AsyncStorage (đã được thêm khi thanh toán thành công)
                    const orderId = order._id || order.id;
                    const existsInLocal = localHistory.some((o: any) =>
                        (o._id && String(o._id) === String(orderId)) ||
                        (o.id && String(o.id) === String(orderId))
                    );

                    return isPaid || isWaitingPayment || existsInLocal;
                });

                // Merge với local history (ưu tiên local vì có thể có thông tin chi tiết hơn)
                // Tạo Set với cả _id và id để đảm bảo match đúng
                const localOrderIds = new Set<string>();
                localHistory.forEach((o: any) => {
                    if (o._id) localOrderIds.add(String(o._id));
                    if (o.id) localOrderIds.add(String(o.id));
                });

                const backendOrderMap = new Map<string, any>();
                filteredBackendOrders.forEach((order: any) => {
                    const orderId = String(order._id || order.id);
                    // Lưu với cả _id và id làm key để đảm bảo match
                    backendOrderMap.set(orderId, order);
                    if (order._id && order.id && String(order._id) !== String(order.id)) {
                        backendOrderMap.set(String(order._id), order);
                        backendOrderMap.set(String(order.id), order);
                    }
                });

                const mergedLocalHistory = localHistory.map((localOrder: any) => {
                    // Tìm backend order bằng cả _id và id
                    const localId = localOrder._id ? String(localOrder._id) : null;
                    const localIdAlt = localOrder.id ? String(localOrder.id) : null;
                    const backendOrder = (localId && backendOrderMap.get(localId)) ||
                        (localIdAlt && backendOrderMap.get(localIdAlt)) ||
                        null;
                    return mergeOrderData(localOrder, backendOrder);
                });

                // 🟢 Tìm các đơn hàng từ backend chưa có trong local
                // Nhưng cần đảm bảo không tạo duplicate nếu đã được merge ở trên
                const backendOnlyOrders = filteredBackendOrders.filter((o: any) => {
                    const orderId = String(o._id || o.id);
                    const orderIdAlt = o._id && o.id && String(o._id) !== String(o.id) ? String(o._id === orderId ? o.id : o._id) : null;
                    // Chỉ lấy đơn hàng chưa có trong local (chưa được merge)
                    return !localOrderIds.has(orderId) && (!orderIdAlt || !localOrderIds.has(orderIdAlt));
                });

                // Kết hợp: local history đã merge trước, sau đó là backend orders chưa có trong local
                const mergedOrders = [...mergedLocalHistory, ...backendOnlyOrders];

                // Sắp xếp theo thời gian tạo (mới nhất trước)
                mergedOrders.sort((a: any, b: any) => {
                    const timeA = new Date(a.createdAt || 0).getTime();
                    const timeB = new Date(b.createdAt || 0).getTime();
                    return timeB - timeA;
                });

                // 🟢 Lưu mergedOrders (bao gồm cả backendOnlyOrders) vào AsyncStorage
                // Điều này đảm bảo các đơn hàng mới từ backend cũng được lưu
                await AsyncStorage.setItem(historyKey, JSON.stringify(mergedOrders));

                // 🟢 Xóa sản phẩm khỏi giỏ hàng nếu đơn hàng đã giao thành công
                const deliveredOrders = mergedOrders.filter((o: any) => normalizeStatus(o.status) === 'Đã giao hàng');
                if (deliveredOrders.length > 0) {
                    const cartKey = `cart_${user._id}`;
                    const cartString = await AsyncStorage.getItem(cartKey);
                    let cart = cartString ? JSON.parse(cartString) : [];
                    cart = Array.isArray(cart) ? cart : [];

                    // Lấy danh sách productId + size + color từ các đơn hàng đã giao
                    const deliveredItems = new Set<string>();
                    deliveredOrders.forEach((order: any) => {
                        if (Array.isArray(order.items)) {
                            order.items.forEach((item: any) => {
                                const key = `${item.productId || item._id || item.id}_${item.size}_${item.color}`;
                                deliveredItems.add(key);
                            });
                        }
                    });

                    // Lọc bỏ các sản phẩm đã giao khỏi giỏ hàng
                    const updatedCart = cart.filter((cartItem: any) => {
                        const key = `${cartItem.productId || cartItem._id || cartItem.id}_${cartItem.size}_${cartItem.color}`;
                        return !deliveredItems.has(key);
                    });

                    // Chỉ cập nhật nếu có thay đổi
                    if (updatedCart.length !== cart.length) {
                        await AsyncStorage.setItem(cartKey, JSON.stringify(updatedCart));
                    }
                }

                setOrders(mergedOrders);
                return;
            }
        } catch (e) {
            console.log('Fetch orders failed', e);
        }

        // Fallback: chỉ lấy từ AsyncStorage
        setOrders(localHistory);
    }, [router]);

    // Hàm xử lý pull-to-refresh
    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchOrders();
        setRefreshing(false);
    }, [fetchOrders]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useFocusEffect(React.useCallback(() => { fetchOrders(); }, [fetchOrders]));

    const handleRefresh = React.useCallback(async () => {
        try {
            setRefreshing(true);
            await fetchOrders();
        } finally {
            setRefreshing(false);
        }
    }, [fetchOrders]);

    // Xử lý deep linking khi nhận được từ ZaloPay
    useEffect(() => {
        // Hàm xử lý khi thanh toán thành công
        const handlePaymentSuccess = async () => {
            try {
                const userString = await AsyncStorage.getItem('user');
                const user = userString ? JSON.parse(userString) : null;
                if (!user || !user._id) return;

                // Lấy đơn hàng ZaloPay mới nhất có trạng thái "Đã xác nhận" từ backend
                // (đơn hàng vừa thanh toán thành công)
                try {
                    const res = await fetch(`${BASE_URL}/orders/user/${user._id}/list`);
                    const json = await res.json();
                    const list = Array.isArray(json) ? json : json.data || [];

                    // Tìm đơn hàng ZaloPay mới nhất có trạng thái "Đã xác nhận" hoặc "Chờ xác nhận"
                    // Bao gồm cả đơn hàng "Thanh toán lại" đã được thanh toán thành công
                    // Lấy đơn hàng được cập nhật trong vòng 30 phút gần đây để bao gồm cả đơn thanh toán lại
                    const now = Date.now();
                    const thirtyMinutesAgo = now - 30 * 60 * 1000;

                    const zalopayOrders = list.filter((o: any) => {
                        if (o.payment !== 'zalopay') return false;
                        const status = normalizeStatus(o.status);
                        // Lấy đơn hàng đã xác nhận hoặc đang chờ xác nhận (có thể là đơn thanh toán lại thành công)
                        if (status !== 'Đã xác nhận' && status !== 'Chờ xác nhận') return false;

                        // Kiểm tra thời gian tạo hoặc cập nhật (lấy đơn hàng trong vòng 30 phút)
                        const createdAt = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                        const updatedAt = o.updatedAt ? new Date(o.updatedAt).getTime() : 0;
                        const relevantTime = Math.max(createdAt, updatedAt);
                        return relevantTime >= thirtyMinutesAgo;
                    });

                    if (zalopayOrders.length > 0) {
                        // Sắp xếp theo thời gian cập nhật hoặc tạo, lấy đơn mới nhất
                        zalopayOrders.sort((a: any, b: any) => {
                            const timeA = Math.max(
                                new Date(a.updatedAt || 0).getTime(),
                                new Date(a.createdAt || 0).getTime()
                            );
                            const timeB = Math.max(
                                new Date(b.updatedAt || 0).getTime(),
                                new Date(b.createdAt || 0).getTime()
                            );
                            return timeB - timeA;
                        });

                        const latestOrder = zalopayOrders[0];

                        // Kiểm tra xem đơn hàng này đã có trong AsyncStorage chưa
                        const historyKey = `order_history_${user._id}`;
                        const historyString = await AsyncStorage.getItem(historyKey);
                        let history = historyString ? JSON.parse(historyString) : [];
                        history = Array.isArray(history) ? history : [];

                        // Kiểm tra xem đơn hàng đã tồn tại chưa (theo _id hoặc id)
                        const orderId = latestOrder._id || latestOrder.id;
                        const orderIdStr = String(orderId);
                        const orderIndex = history.findIndex((o: any) =>
                            (o._id && String(o._id) === orderIdStr) ||
                            (o.id && String(o.id) === orderIdStr)
                        );

                        // 🟢 Update đơn hàng cũ nếu đã tồn tại, hoặc thêm mới nếu chưa có
                        const orderData = {
                            id: latestOrder._id || latestOrder.id,
                            _id: latestOrder._id,
                            items: latestOrder.items || [],
                            total: latestOrder.total || 0,
                            originalTotal: latestOrder.total || 0,
                            discount: latestOrder.discount || 0,
                            voucherCode: latestOrder.voucherCode,
                            voucherAppliedAmount: latestOrder.discount || 0,
                            address: latestOrder.address || '',
                            payment: latestOrder.payment || 'zalopay',
                            status: latestOrder.status || 'Đã xác nhận',
                            createdAt: orderIndex >= 0 ? history[orderIndex].createdAt : (latestOrder.createdAt || new Date().toISOString()), // Giữ nguyên createdAt cũ nếu đã tồn tại
                            shippingDate: latestOrder.shippingDate || null,
                            deliveredDate: latestOrder.deliveredDate || null,
                            cancelledDate: latestOrder.cancelledDate || null,
                            voucher: latestOrder.voucherCode ? { code: latestOrder.voucherCode } : undefined
                        };

                        if (orderIndex >= 0) {
                            // Update đơn hàng cũ (thanh toán lại thành công)
                            history[orderIndex] = orderData;
                        } else {
                            // Thêm đơn hàng mới nếu chưa tồn tại
                            history.unshift(orderData);
                        }
                        await AsyncStorage.setItem(historyKey, JSON.stringify(history));
                    }
                } catch (e) {
                    console.log('Error fetching order after payment success:', e);
                }

                // Refresh orders để hiển thị đơn hàng mới
                setTimeout(() => {
                    fetchOrders();
                    Alert.alert('Thành công', 'Thanh toán đã được xử lý! Đơn hàng đã được cập nhật.');
                }, 500);
            } catch (e) {
                console.log('Error handling payment success:', e);
                // Vẫn refresh orders dù có lỗi
                setTimeout(() => {
                    fetchOrders();
                    Alert.alert('Thành công', 'Thanh toán đã được xử lý! Đơn hàng đã được cập nhật.');
                }, 500);
            }
        };

        // Lắng nghe deep link khi app đang mở
        const subscription = Linking.addEventListener('url', (event) => {
            const { url } = event;
            console.log('Deep link received:', url);

            // Kiểm tra nếu có query param payment=success
            if (url.includes('payment=success')) {
                handlePaymentSuccess();
            }
        });

        // Kiểm tra deep link khi app mở từ trạng thái đóng
        Linking.getInitialURL().then((url) => {
            if (url && url.includes('payment=success')) {
                handlePaymentSuccess();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [fetchOrders]);

    // Stepper hiển thị trạng thái
    const renderStepper = (statusRaw: string) => {
        const status = normalizeStatus(statusRaw);
        if (status === 'Đã hủy') {
            return (
                <View style={[styles.cancelWrap]}>
                    <Text style={[styles.cancelText]}>{STATUS_INFO['Đã hủy'].emoji} Đã hủy</Text>
                </View>
            );
        }
        if (status === 'Thanh toán lại') {
            return (
                <View style={[styles.cancelWrap, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
                    <Text style={[styles.cancelText, { color: '#f59e0b' }]}>{STATUS_INFO['Thanh toán lại'].emoji} Thanh toán lại</Text>
                </View>
            );
        }
        const currentIndex = Math.max(0, STATUS_ORDER.indexOf(status as any));
        return (
            <View style={styles.stepperWrap}>
                <View style={styles.stepRow}>
                    {STATUS_ORDER.map((step, i) => {
                        const active = i <= currentIndex;
                        const color = active ? STATUS_INFO[step].color : '#e5e7eb';
                        const isLast = i === STATUS_ORDER.length - 1;
                        return (
                            <React.Fragment key={step}>
                                <View style={[styles.stepCircle, { backgroundColor: color }]}>
                                    <Text style={styles.stepEmoji}>{STATUS_INFO[step].emoji}</Text>
                                </View>
                                {!isLast && <View style={[styles.stepLineFlex, { backgroundColor: color }]} />}
                            </React.Fragment>
                        );
                    })}
                </View>
                <View style={styles.stepLabelsRow}>
                    {STATUS_ORDER.map((step, i) => {
                        const active = i <= currentIndex;
                        return (
                            <Text key={step} style={[styles.stepLabelFlex, active ? { color: STATUS_INFO[step].color } : null]}>{step}</Text>
                        );
                    })}
                </View>
            </View>
        );
    };

    // Kiểm tra review đã tồn tại
    const checkReviewExists = async (orderId: any, orderBackendId?: any) => {
        try {
            const userString = await AsyncStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            if (!user || !user._id) return false;

            const checkId = orderBackendId || orderId;
            try {
                const res = await fetch(`${BASE_URL}/reviews/order/${checkId}`);
                if (res.ok) {
                    const data = await res.json();
                    const reviews = Array.isArray(data) ? data : [];
                    const userReview = reviews.find((r: any) => {
                        const reviewUserId = (typeof r.userId === 'object' && r.userId?._id) ? r.userId._id : (r.userId || null);
                        return String(reviewUserId) === String(user._id);
                    });
                    if (userReview) return true;
                }
            } catch { }

            const reviewKey = `review_${user._id}_${orderId}`;
            const reviewString = await AsyncStorage.getItem(reviewKey);
            if (reviewString) return true;
            return false;
        } catch { return false; }
    };

    // Mở dialog hủy đơn
    const openCancelDialog = (orderId: any, backendId?: any) => {
        setCancelingOrder({ orderId, backendId });
        setCancelReason('');
        setShowCancelDialog(true);
    };

    // Xác nhận hủy đơn với lý do
    const confirmCancel = async () => {
        if (!cancelReason.trim()) {
            Alert.alert('Thông báo', 'Vui lòng nhập lý do hủy đơn');
            return;
        }

        if (!cancelingOrder) return;

        const { orderId, backendId } = cancelingOrder;
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) return;

        if (backendId) {
            try {
                await fetch(`${BASE_URL}/orders/${backendId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'Đã hủy',
                        cancelReason: cancelReason.trim()
                    })
                });
            } catch (e) {
                console.log('PATCH /orders/:id/status failed', e);
            }
        }

        setOrders(prevOrders => {
            const newOrders = prevOrders.map(o =>
                (o.id === orderId || o._id === orderId) ? {
                    ...o,
                    status: 'Đã hủy',
                    cancelledDate: new Date().toISOString(),
                    cancelReason: cancelReason.trim()
                } : o
            );
            const historyKey = `order_history_${user._id}`;
            AsyncStorage.setItem(historyKey, JSON.stringify(newOrders));
            return newOrders;
        });

        // Đóng dialog và reset
        setShowCancelDialog(false);
        setCancelReason('');
        setCancelingOrder(null);
        Alert.alert('Thành công', 'Đơn hàng đã được hủy');
    };

    // Bấm review
    const handleReviewPress = async (item: any) => {
        const orderId = item.id || item._id;
        const hasReviewed = await checkReviewExists(orderId, item._id);
        if (hasReviewed) {
            Alert.alert('Thông báo', 'Bạn đã đánh giá đơn hàng này rồi');
            return;
        }
        router.push(`/review/${orderId}` as any);
    };

    // Tính tổng giảm và thanh toán
    const calculateOrderDiscount = (order: any) => {
        const items = Array.isArray(order.items) ? order.items : [];

        const lineSubtotal = items.reduce((sum: number, p: any) => {
            const price = Number(p.price ?? 0) || 0;
            const qty = Number(p.qty ?? 1) || 1;
            return sum + price * qty;
        }, 0);

        const productDiscount = items.reduce((sum: number, p: any) => {
            const disc = Number(p.discountAmount ?? p.discount ?? 0) || 0;
            return sum + disc;
        }, 0);

        const voucherDiscountCandidates = [
            order.voucherAppliedAmount,
            order.discount,
            order.voucher?.discountApplied,
        ];
        const voucherDiscount = voucherDiscountCandidates.reduce((acc: number, val: any) => {
            const num = Number(val);
            if (!Number.isFinite(num) || num <= 0) return acc;
            return Math.max(acc, num);
        }, 0);

        const referenceTotal = Number(order.originalTotal ?? 0) || lineSubtotal;
        const storedTotal = Number(order.total ?? 0) || 0;
        const computedTotal = Math.max(0, referenceTotal - productDiscount - voucherDiscount);

        const totalPayment = storedTotal > 0 && Math.abs(storedTotal - computedTotal) > 1
            ? storedTotal
            : computedTotal;

        return { productDiscount, voucherDiscount, totalPayment };
    };

    // Render từng đơn hàng
    const renderItem = ({ item }: { item: any }) => {
        const created = item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '';
        const shippingDate = item.shippingDate ? new Date(item.shippingDate).toLocaleString('vi-VN') : null;
        const deliveredDate = item.deliveredDate ? new Date(item.deliveredDate).toLocaleString('vi-VN') : null;
        const cancelledDate = item.cancelledDate ? new Date(item.cancelledDate).toLocaleString('vi-VN') : null;
        const status = normalizeStatus(item.status);
        const { productDiscount, voucherDiscount, totalPayment } = calculateOrderDiscount(item);

        return (
            <View style={styles.card}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.date, { fontWeight: 'bold', marginBottom: 4 }]}>Mã đơn: {String(item.code || item._id || item.id || 'N/A')}</Text>
                        <Text style={styles.date}>Đặt hàng: {created}</Text>
                        {shippingDate && (
                            <Text style={[styles.date, { color: '#f59e0b', fontSize: 12, marginTop: 4 }]}>
                                🚚 Bắt đầu giao: {shippingDate}
                            </Text>
                        )}
                        {deliveredDate && (
                            <Text style={[styles.date, { color: '#22c55e', fontSize: 12, marginTop: 4 }]}>
                                ✅ Hoàn thành: {deliveredDate}
                            </Text>
                        )}
                        {cancelledDate && (
                            <Text style={[styles.date, { color: '#ef4444', fontSize: 12, marginTop: 4 }]}>
                                ❌ Đã hủy: {cancelledDate}
                            </Text>
                        )}
                    </View>
                    {status !== 'Đã hủy' && (
                        <Text style={[styles.badge, { color: STATUS_INFO[status]?.color || '#111827' }]}>
                            {STATUS_INFO[status]?.emoji || ''} {status}
                        </Text>
                    )}
                </View>

                {/* Stepper - Ẩn khi đơn hàng đã hủy hoặc thanh toán lại */}
                {status !== 'Đã hủy' && status !== 'Thanh toán lại' && renderStepper(status)}

                {/* Danh sách sản phẩm */}
                <View style={{ marginTop: 8 }}>
                    {(item.items || []).slice(0, 3).map((p: any, idx: number) => {
                        const disc = Number(p.discountAmount ?? p.discount ?? 0) || 0;
                        const qty = Number(p.qty ?? 1) || 1;
                        const totalDisc = disc * qty;

                        return (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                {p.image ? (
                                    <Image source={{ uri: `${DOMAIN}${p.image}` }} style={styles.productImage} />
                                ) : (
                                    <View style={[styles.productImage, { backgroundColor: '#f0f0f0' }]} />
                                )}
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.productName}>{p.name}</Text>
                                    <Text style={styles.productMeta}>({p.size}, {p.color}) x{qty}</Text>
                                    {/* Hiển thị giảm giá từng sản phẩm nếu > 0 */}
                                </View>
                                <Text style={styles.productPrice}>
                                    {(Number(p.price ?? 0) * qty).toLocaleString('vi-VN')} VND
                                </Text>
                            </View>
                        );
                    })}
                    {Array.isArray(item.items) && item.items.length > 3 && (
                        <Text style={{ color: '#666', marginTop: 8, marginLeft: 60 }}>
                            + {item.items.length - 3} sản phẩm khác
                        </Text>
                    )}
                </View>

                {productDiscount > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={styles.discountLabel}>Tổng giảm từ sản phẩm</Text>
                        <Text style={{ color: '#16a34a', fontSize: 14 }}>
                            -{productDiscount.toLocaleString('vi-VN')} VND
                        </Text>
                    </View>
                )}

                {/* Tổng thanh toán */}
                <Text style={[styles.total, { marginTop: 4 }]}>
                    Tổng thanh toán: {totalPayment.toLocaleString('vi-VN')} VND
                </Text>

                {/* Địa chỉ & phương thức */}
                <Text style={styles.small}>Địa chỉ: {item.address}</Text>
                <Text style={styles.small}>Phương thức: {item.payment === 'cod' ? 'tiền mặt' : item.payment}</Text>

                {/* Nút hành động */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                    <TouchableOpacity
                        onPress={() => router.push(`/order/${item.id || item._id}` as any)}
                        style={[styles.actionBtn, { backgroundColor: '#111827' }]}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Xem chi tiết</Text>
                    </TouchableOpacity>

                    {status === 'Thanh toán lại' && (
                        <TouchableOpacity
                            onPress={() => router.push(`/checkout?orderId=${item._id || item.id}` as any)}
                            style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Thanh toán lại</Text>
                        </TouchableOpacity>
                    )}

                    {status === 'Đã giao hàng' && (
                        <TouchableOpacity
                            onPress={() => handleReviewPress(item)}
                            style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Đánh giá</Text>
                        </TouchableOpacity>
                    )}

                    {status !== 'Đã hủy' && status !== 'Đã giao hàng' && status !== 'Thanh toán lại' && (
                        <TouchableOpacity
                            onPress={() => openCancelDialog(item.id || item._id, item._id)}
                            style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Hủy đơn</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const tabs = useMemo(() => ['Tất cả', 'Thanh toán lại', ...STATUS_ORDER, 'Đã hủy'], []);

    const filteredOrders = useMemo(() => {
        let filtered = activeTab === 'Tất cả'
            ? [...orders]
            : orders.filter((o) => normalizeStatus(o.status) === activeTab);

        // Sắp xếp đơn hàng theo thời gian tương ứng với trạng thái
        filtered.sort((a, b) => {
            const statusA = normalizeStatus(a.status);
            const statusB = normalizeStatus(b.status);

            // Lấy thời gian tương ứng với trạng thái của từng đơn
            const getRelevantTime = (order: any, status: string) => {
                if (status === 'Đã giao hàng' && order.deliveredDate) {
                    return new Date(order.deliveredDate).getTime();
                }
                if (status === 'Đang giao hàng' && order.shippingDate) {
                    return new Date(order.shippingDate).getTime();
                }
                // Các trạng thái khác (Chờ xác nhận, Đã xác nhận, Thanh toán lại, Đã hủy) dùng createdAt
                return order.createdAt ? new Date(order.createdAt).getTime() : 0;
            };

            const timeA = getRelevantTime(a, statusA);
            const timeB = getRelevantTime(b, statusB);

            // Sắp xếp theo thời gian: mới nhất lên đầu
            return timeB - timeA;
        });

        return filtered;
    }, [orders, activeTab]);

    const emptyComponent = useMemo(() => (
        <Text style={{ color: '#888', textAlign: 'center', marginTop: 80 }}>Chưa có đơn hàng</Text>
    ), []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f9' }}>
            <View style={{ padding: 13 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row' }}>
                        {tabs.map((t) => {
                            const isActive = activeTab === t;
                            const info = STATUS_INFO[t] || { color: '#111827', emoji: '' };
                            return (
                                <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tabChip, isActive ? { backgroundColor: info.color } : null]}>
                                    <Text style={[styles.tabText, isActive ? { color: '#fff' } : null]}>
                                        {STATUS_INFO[t]?.emoji ? `${STATUS_INFO[t].emoji} ` : ''}{t}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => (item.id || item._id || Math.random()).toString()}
                    renderItem={renderItem}
                    ListEmptyComponent={emptyComponent}
                    contentContainerStyle={{ paddingBottom: 80 }}
                    ListFooterComponent={<View style={{ height: 12 }} />}
                    showsVerticalScrollIndicator={false}

                    refreshing={refreshing}
                    onRefresh={handleRefresh}

                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#111827']}
                            tintColor="#111827"
                        />
                    }
                />
            </View>

            {/* Dialog hủy đơn */}
            <Modal
                visible={showCancelDialog}
                animationType="fade"
                transparent
                onRequestClose={() => setShowCancelDialog(false)}
            >
                <View style={styles.cancelDialogOverlay}>
                    <View style={styles.cancelDialogContainer}>
                        <Text style={styles.cancelDialogTitle}>Lý do hủy đơn</Text>
                        <Text style={styles.cancelDialogSubtitle}>Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn hàng này</Text>

                        <TextInput
                            style={styles.cancelReasonInput}
                            placeholder="Nhập lý do hủy đơn..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            value={cancelReason}
                            onChangeText={setCancelReason}
                            textAlignVertical="top"
                        />

                        <View style={styles.cancelDialogActions}>
                            <TouchableOpacity
                                style={[styles.cancelDialogBtn, styles.cancelDialogBtnSecondary]}
                                onPress={() => {
                                    setShowCancelDialog(false);
                                    setCancelReason('');
                                    setCancelingOrder(null);
                                }}
                            >
                                <Text style={styles.cancelDialogBtnTextSecondary}>Đóng</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cancelDialogBtn, styles.cancelDialogBtnPrimary]}
                                onPress={confirmCancel}
                            >
                                <Text style={styles.cancelDialogBtnTextPrimary}>Xác nhận hủy</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    date: { color: '#555', fontWeight: 'bold' },
    badge: { fontWeight: 'bold' },
    total: { fontWeight: 'bold', color: '#ef233c', marginTop: 6 },
    small: { color: '#888', fontSize: 13, marginTop: 2 },
    actionBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginRight: 10, marginBottom: 8 },
    stepperWrap: { marginTop: 8, marginBottom: 4 },
    stepRow: { flexDirection: 'row', alignItems: 'center' },
    stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    stepEmoji: { fontSize: 13 },
    stepLineFlex: { height: 3, flex: 1, marginHorizontal: 8, borderRadius: 2 },
    stepLabelsRow: { flexDirection: 'row', marginTop: 6 },
    stepLabelFlex: { flex: 1, textAlign: 'center', fontSize: 12, color: '#666' },
    cancelWrap: { backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginTop: 6, marginBottom: 6 },
    cancelText: { color: '#ef4444', fontWeight: 'bold' },
    tabChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#f3f4f6', marginRight: 8 },
    tabText: { color: '#111827', fontWeight: '600' },
    productImage: { width: 50, height: 50, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
    productName: { fontSize: 14, fontWeight: '600', color: '#222' },
    productMeta: { fontSize: 12, color: '#666', marginTop: 2 },
    productPrice: { fontSize: 14, fontWeight: '600', color: '#222' },
    discountLabel: { fontSize: 14, fontWeight: '600', color: '#111', marginTop: 6 },
    // Dialog hủy đơn styles
    cancelDialogOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    cancelDialogContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    cancelDialogTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 8,
        textAlign: 'center',
    },
    cancelDialogSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 20,
    },
    cancelReasonInput: {
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#1a1a1a',
        backgroundColor: '#f9fafb',
        marginBottom: 20,
        minHeight: 100,
    },
    cancelDialogActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelDialogBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelDialogBtnSecondary: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    cancelDialogBtnPrimary: {
        backgroundColor: '#ef4444',
    },
    cancelDialogBtnTextSecondary: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
    },
    cancelDialogBtnTextPrimary: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});
