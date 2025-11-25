import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
  ScrollView,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Linking,
  AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { DOMAIN, BASE_URL } from '../config/apiConfig';

const PAYMENT_METHODS = [
  { key: 'cod', label: 'Thanh toán khi nhận hàng (COD)' },
  { key: 'zalopay', label: 'ZaloPay' },
];
const VOUCHER_MAX_ORDER_AMOUNT = 500000;

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [cart, setCart] = useState<any[]>([]);
  const [addressObj, setAddressObj] = useState({ name: '', phone: '', address: '' });
  const [payment, setPayment] = useState('cod');
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [input, setInput] = useState({ name: '', phone: '', address: '' });
  const [userId, setUserId] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [showVoucherList, setShowVoucherList] = useState(false);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const hasCheckedPaymentRef = useRef(false); // Tránh check nhiều lần trong cùng một session
  const voucherEligible = total <= VOUCHER_MAX_ORDER_AMOUNT;

  useEffect(() => {
    if (!voucherEligible) {
      if (appliedVoucher || voucherDiscount > 0) {
        setAppliedVoucher(null);
        setVoucherDiscount(0);
        setVoucherCode('');
      }
      if (showVoucherList) {
        setShowVoucherList(false);
      }
    }
  }, [voucherEligible, appliedVoucher, voucherDiscount, showVoucherList]);

  // � Hàmm xử lý thanh toán thất bại
  const handlePaymentFailure = React.useCallback(async () => {
    console.log('❌❌❌ handlePaymentFailure CALLED! ❌❌❌');
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) {
        console.log('❌ No user found, returning...');
        return;
      }

      console.log('✅ User found:', user._id);

      // Hiển thị dialog thất bại
      console.log('❌❌❌ SETTING showFailureDialog to TRUE ❌❌❌');
      setShowFailureDialog(true);
      console.log('❌ Failure dialog state updated!');
    } catch (error) {
      console.error('[Checkout] Error handling payment failure:', error);
    }
  }, []);

  // 🟢 Hàm xử lý thanh toán thành công
  const handlePaymentSuccess = React.useCallback(async () => {
    console.log('🎉🎉🎉 handlePaymentSuccess CALLED! 🎉🎉🎉');
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) {
        console.log('❌ No user found, returning...');
        return;
      }

      console.log('✅ User found:', user._id);

      // Xóa sản phẩm đã thanh toán khỏi giỏ hàng
      try {
        const fullCartStr = await AsyncStorage.getItem(`cart_${user._id}`);
        let fullCart = fullCartStr ? JSON.parse(fullCartStr) : [];
        fullCart = Array.isArray(fullCart) ? fullCart : [];
        const remaining = fullCart.filter(i => !i?.checked);
        await AsyncStorage.setItem(`cart_${user._id}`, JSON.stringify(remaining));
        console.log('🎉 Cart cleared');
      } catch { }

      // Xóa buy now nếu có
      try {
        await AsyncStorage.removeItem(`buy_now_${user._id}`);
      } catch { }

      // Reset cart và voucher
      setCart([]);
      setAppliedVoucher(null);
      setVoucherDiscount(0);
      setVoucherCode('');
      console.log('🎉 States reset');

      // Xóa pending flag
      try {
        await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
      } catch { }

      // ⚠️ KHÔNG xóa success flag ở đây - chỉ xóa khi user nhấn nút đóng dialog
      // Điều này đảm bảo dialog sẽ hiển thị lại nếu user thoát app trước khi đóng dialog

      // Hiển thị dialog thành công
      console.log('🎉🎉🎉 SETTING showSuccessDialog to TRUE 🎉🎉🎉');
      setShowSuccessDialog(true);
      console.log('🎉 Dialog state updated! Current value should be TRUE');
    } catch (error) {
      console.error('[Checkout] Error handling payment success:', error);
    }
  }, []);

  // 🟢 Hàm kiểm tra thanh toán thành công (dùng chung)
  const checkPaymentSuccess = React.useCallback(async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;

      console.log('[Checkout] Checking payment success for user:', user ? user._id : 'NO USER');

      if (!user || !user._id) {
        console.log('[Checkout] ❌ No user found, cannot check payment');
        return false;
      }

      // Xóa flag cũ (legacy cleanup)
      try {
        const oldProcessedFlag = await AsyncStorage.getItem(`zalopay_processed_${user._id}`);
        if (oldProcessedFlag) {
          console.log('[Checkout] Removing old processed flag...');
          await AsyncStorage.removeItem(`zalopay_processed_${user._id}`);
        }
        // Xóa luôn success flag cũ (không dùng nữa)
        const oldSuccessFlag = await AsyncStorage.getItem(`zalopay_success_${user._id}`);
        if (oldSuccessFlag) {
          console.log('[Checkout] Removing old success flag...');
          await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
        }
      } catch { }

      // ✅ LUÔN kiểm tra backend để tìm đơn ZaloPay chưa được processed
      // Điều này đảm bảo dialog hiển thị ngay cả khi restart app hoặc đăng xuất/đăng nhập
      try {
        console.log('[Checkout] Checking backend for unprocessed ZaloPay orders...');
        const response = await fetch(`${BASE_URL}/orders/user/${user._id}/list`);
        console.log('[Checkout] Backend response status:', response.status);

        if (response.ok) {
          const json = await response.json();
          const orders = Array.isArray(json) ? json : json.data || [];
          console.log('[Checkout] Total orders:', orders.length);

          // ✅ GIẢI PHÁP CUỐI CÙNG: Dùng timestamp thay vì flag processed
          // Lấy timestamp lần cuối user đóng dialog ZaloPay
          const lastDismissedStr = await AsyncStorage.getItem(`zalopay_last_dismissed_${user._id}`);
          const lastDismissedTime = lastDismissedStr ? parseInt(lastDismissedStr) : 0;

          console.log('[Checkout] Checking for user:', user._id);
          console.log('[Checkout] Last dismissed time:', lastDismissedTime ? new Date(lastDismissedTime).toISOString() : 'Never');

          // Tìm TẤT CẢ đơn ZaloPay (không giới hạn thời gian)
          const allZaloPayOrders = orders.filter((o: any) => o.payment === 'zalopay');
          console.log('[Checkout] All ZaloPay orders:', allZaloPayOrders.length);

          // Tìm đơn mới nhất được tạo SAU khi user đóng dialog lần cuối
          // VÀ trong vòng 24 giờ gần đây (để tránh hiển thị đơn cũ khi reset app)
          const now = Date.now();
          const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

          let newestUnseenOrder = null;
          for (const order of allZaloPayOrders) {
            const orderTime = order.createdAt ? new Date(order.createdAt).getTime() : 0;

            // Chỉ xét đơn được tạo SAU khi user đóng dialog VÀ trong vòng 24 giờ
            if (orderTime > lastDismissedTime && orderTime > twentyFourHoursAgo) {
              if (!newestUnseenOrder || orderTime > new Date(newestUnseenOrder.createdAt).getTime()) {
                newestUnseenOrder = order;
              }
            }
          }

          if (newestUnseenOrder) {
            const orderId = newestUnseenOrder._id || newestUnseenOrder.id;
            const orderTime = new Date(newestUnseenOrder.createdAt).getTime();
            const hoursAgo = Math.round((Date.now() - orderTime) / (1000 * 60 * 60));

            const orderStatus = (newestUnseenOrder.status || '').toLowerCase().trim();

            console.log('✅✅✅ NEW ZALOPAY ORDER FOUND! ✅✅✅', {
              orderId: orderId,
              status: newestUnseenOrder.status,
              statusLower: orderStatus,
              createdAt: newestUnseenOrder.createdAt,
              hoursAgo: hoursAgo,
              orderTime: new Date(orderTime).toISOString(),
              lastDismissed: lastDismissedTime ? new Date(lastDismissedTime).toISOString() : 'Never'
            });

            // Kiểm tra trạng thái đơn hàng
            console.log('[Checkout] Checking order status:', {
              original: newestUnseenOrder.status,
              lowercase: orderStatus,
              isWaitingPayment: orderStatus === 'chờ thanh toán',
              isConfirmed: orderStatus === 'đã xác nhận' || orderStatus.includes('xác nhận')
            });

            if (orderStatus === 'chờ thanh toán') {
              // Thanh toán thất bại - đơn vẫn ở trạng thái chờ thanh toán
              console.log('❌❌❌ Payment FAILED - Order status: Chờ thanh toán');
              await handlePaymentFailure();
              return true;
            } else if (orderStatus === 'đã xác nhận' || orderStatus.includes('xác nhận') || orderStatus === 'confirmed') {
              // Thanh toán thành công - đơn đã được xác nhận (MỚI thanh toán xong)
              console.log('🚀 Payment SUCCESS - Order confirmed');
              await handlePaymentSuccess();
              console.log('✅ handlePaymentSuccess completed!');
              return true;
            } else {
              // ⚠️ Trạng thái khác (Đang giao hàng, Đã giao hàng) - KHÔNG hiển thị dialog
              // Vì đây là đơn cũ đã được xử lý rồi, chỉ là chưa dismiss
              console.log('[Checkout] Order already processed (status:', newestUnseenOrder.status, '), skipping dialog');

              // Tự động cập nhật dismissed timestamp để không check lại đơn này
              try {
                const userString = await AsyncStorage.getItem('user');
                const user = userString ? JSON.parse(userString) : null;
                if (user && user._id) {
                  await AsyncStorage.setItem(`zalopay_last_dismissed_${user._id}`, Date.now().toString());
                  console.log('[Checkout] Auto-updated dismissed timestamp for old order');
                }
              } catch (e) {
                console.error('[Checkout] Error auto-updating timestamp:', e);
              }

              return false;
            }
          } else {
            console.log('[Checkout] No new ZaloPay orders since last dismissal');
          }

          console.log('[Checkout] All recent ZaloPay orders have been processed');
        } else {
          console.error('[Checkout] Backend response not OK:', response.status);
        }
      } catch (error) {
        console.error('[Checkout] Error checking backend for unprocessed orders:', error);
      }

      // Kiểm tra đơn hàng ZaloPay mới nhất từ backend (fallback - legacy support)
      const pendingFlag = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
      if (pendingFlag) {
        const pendingData = JSON.parse(pendingFlag);
        const timeSincePayment = Date.now() - pendingData.timestamp;

        // Chỉ kiểm tra nếu thanh toán trong vòng 10 phút
        if (timeSincePayment < 10 * 60 * 1000) {
          try {
            console.log('[Checkout] [Legacy] Checking backend for payment success...', {
              orderId: pendingData.orderId,
              timeSincePayment: Math.round(timeSincePayment / 1000) + 's'
            });

            const response = await fetch(`${BASE_URL}/orders/user/${user._id}/list`);
            if (response.ok) {
              const json = await response.json();
              const orders = Array.isArray(json) ? json : json.data || [];

              // Tìm đơn hàng theo orderId trong pendingFlag
              let zalopayOrder = null;
              if (pendingData.orderId) {
                console.log('[Checkout] Looking for order with ID:', pendingData.orderId);
                zalopayOrder = orders.find((o: any) => {
                  const orderId = String(o._id || o.id || '');
                  const matches = orderId === String(pendingData.orderId) && o.payment === 'zalopay';
                  if (orderId === String(pendingData.orderId)) {
                    console.log('[Checkout] Found matching order:', {
                      orderId: orderId,
                      payment: o.payment,
                      status: o.status,
                      matches: matches
                    });
                  }
                  return matches;
                });
              }

              // ✅ Nếu tìm thấy đơn theo ID → Kiểm tra status
              if (zalopayOrder) {
                const orderStatus = (zalopayOrder.status || '').toLowerCase().trim();

                console.log('✅✅✅ ZALOPAY ORDER FOUND! ✅✅✅', {
                  orderId: zalopayOrder._id || zalopayOrder.id,
                  status: zalopayOrder.status,
                  statusLower: orderStatus,
                  payment: zalopayOrder.payment
                });

                await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);

                // Kiểm tra trạng thái
                if (orderStatus === 'chờ thanh toán') {
                  // Thanh toán thất bại
                  console.log('❌❌❌ [Legacy] Payment FAILED - Order status: Chờ thanh toán');
                  await handlePaymentFailure();
                  return true;
                } else {
                  // Thanh toán thành công
                  console.log('🚀 [Legacy] About to call handlePaymentSuccess...');
                  await handlePaymentSuccess();
                  console.log('✅ [Legacy] handlePaymentSuccess completed!');
                  return true;
                }
              }

              // Nếu không tìm thấy theo orderId, tìm đơn ZaloPay mới nhất trong 5 phút
              console.log('[Checkout] Order not found by ID, searching for recent ZaloPay order...');
              const recentZaloPayOrders = orders.filter((o: any) => {
                if (o.payment !== 'zalopay') return false;
                const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                const timeDiff = Date.now() - orderTime;
                return timeDiff < 5 * 60 * 1000; // 5 phút
              });

              console.log('[Checkout] Recent ZaloPay orders (last 5 min):', recentZaloPayOrders.length);

              if (recentZaloPayOrders.length > 0) {
                zalopayOrder = recentZaloPayOrders[0];
                const orderStatus = (zalopayOrder.status || '').toLowerCase().trim();

                console.log('✅✅✅ RECENT ZALOPAY ORDER FOUND! ✅✅✅', {
                  orderId: zalopayOrder._id || zalopayOrder.id,
                  status: zalopayOrder.status,
                  statusLower: orderStatus,
                  createdAt: zalopayOrder.createdAt
                });

                await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);

                // Kiểm tra trạng thái
                if (orderStatus === 'chờ thanh toán') {
                  // Thanh toán thất bại
                  console.log('❌❌❌ [Legacy] Payment FAILED - Recent order status: Chờ thanh toán');
                  await handlePaymentFailure();
                  return true;
                } else {
                  // Thanh toán thành công
                  console.log('🚀 [Legacy] About to call handlePaymentSuccess (recent order)...');
                  await handlePaymentSuccess();
                  console.log('✅ [Legacy] handlePaymentSuccess completed!');
                  return true;
                }
              } else {
                console.log('[Checkout] No recent ZaloPay order found, will retry...');
              }
            }
          } catch (error) {
            console.error('[Checkout] Error checking backend order:', error);
          }
        } else {
          // Xóa flag cũ nếu quá thời gian
          console.log('[Checkout] Pending flag expired, removing...');
          await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
        }
      }
      return false;
    } catch (error) {
      console.error('[Checkout] Error checking payment success flag:', error);
      return false;
    }
  }, [handlePaymentSuccess]);

  // 🟢 Kiểm tra sản phẩm dừng bán
  const checkStoppedProducts = React.useCallback(async (items: any[]) => {
    if (items.length === 0) return false;

    try {
      // Kiểm tra từng sản phẩm trong giỏ
      const checkPromises = items.map(async (item) => {
        try {
          const productId = item.id || item._id || item.productId;
          console.log('[Checkout] Checking product:', productId, item.name);

          const response = await fetch(`${BASE_URL}/products/${productId}`);
          if (!response.ok) return null;
          const productData = await response.json();

          console.log('[Checkout] Product isActive:', productData.name, productData.isActive);

          if (productData.isActive === false) {
            console.log('[Checkout] 🚨 STOPPED PRODUCT FOUND:', productData.name);
            return {
              id: productId,
              name: item.name || productData.name,
              isStopped: true
            };
          }
          return null;
        } catch (error) {
          console.error('Error checking product:', error);
          return null;
        }
      });

      const stoppedProducts = (await Promise.all(checkPromises)).filter(p => p !== null);

      if (stoppedProducts.length > 0) {
        const productNames = stoppedProducts.map(p => p.name).join(', ');
        console.log('[Checkout] 🚨 SHOWING ALERT for:', productNames);
        Alert.alert(
          'Sản phẩm dừng bán',
          `Các sản phẩm sau đã dừng bán: ${productNames}`,
          [
            {
              text: 'Xác nhận',
              onPress: () => router.replace('/(tabs)/home')
            }
          ],
          { cancelable: false }
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking stopped products:', error);
      return false;
    }
  }, [router]);

  // 🟢 Load cart, address, user info
  useEffect(() => {
    const fetchData = async () => {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) {
        router.push('/(tabs)/login');
        return;
      }

      // ✅ Xóa pending flag của user hiện tại nếu không phải từ thanh toán ZaloPay
      // (tránh hiển thị dialog khi vào checkout bình thường)
      try {
        const pendingFlagStr = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
        if (pendingFlagStr && !params.payment) {
          const pendingData = JSON.parse(pendingFlagStr);
          const timeSincePending = Date.now() - (pendingData.timestamp || 0);

          // Nếu pending flag quá 5 phút và không có payment param, xóa nó
          if (timeSincePending > 5 * 60 * 1000) {
            console.log('[Checkout] Removing old pending flag on mount');
            await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
          }
        }
      } catch (e) {
        console.log('[Checkout] Error checking pending flag:', e);
      }
      setUserId(user._id);

      // Lấy address
      const addressString = await AsyncStorage.getItem(`address_${user._id}`);
      let addr = addressString ? JSON.parse(addressString) : { name: user.name || '', phone: '', address: '' };
      setAddressObj(addr);
      setInput(addr);

      // Lấy cart đã chọn hoặc Buy Now (ưu tiên buy now nếu có)
      const cartKey = `cart_${user._id}`;
      const cartString = await AsyncStorage.getItem(cartKey);
      const buyNowString = await AsyncStorage.getItem(`buy_now_${user._id}`);
      let items = [] as any[];
      if (buyNowString) {
        const single = JSON.parse(buyNowString);
        items = single ? [single] : [];
      } else {
        const parsed = cartString ? JSON.parse(cartString) : [];
        items = Array.isArray(parsed) ? parsed.filter(i => i.checked) : [];
      }

      // ✅ Thêm discountAmount mặc định = 0
      items = items.map(i => ({ ...i, discountAmount: 0 }));

      // ✅ Kiểm tra sản phẩm dừng bán
      const hasStopped = await checkStoppedProducts(items);
      if (hasStopped) {
        return; // Dừng lại nếu có sản phẩm dừng bán
      }

      setCart(items);

      const cartTotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
      setTotal(cartTotal);

      // Lấy voucher khả dụng
      if (cartTotal > 0 && cartTotal <= VOUCHER_MAX_ORDER_AMOUNT) {
        fetchAvailableVouchers(cartTotal);
      } else {
        setAvailableVouchers([]);
      }
    };
    fetchData();
  }, [checkStoppedProducts]);

  // 🔄 Reload khi quay lại màn hình (đảm bảo tên từ profile cập nhật, hoặc địa chỉ vừa chọn)
  useFocusEffect(
    React.useCallback(() => {
      const reload = async () => {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) return;

        setUserId(user._id);
        const addressString = await AsyncStorage.getItem(`address_${user._id}`);
        const addr = addressString ? JSON.parse(addressString) : { name: user.name || '', phone: '', address: '' };
        setAddressObj(addr);

        // ✅ Kiểm tra sản phẩm dừng bán khi focus
        if (cart.length > 0) {
          console.log('[Checkout] 🔍 Initial check for stopped products');
          await checkStoppedProducts(cart);
        }

        // ✅ CHỈ reload address, KHÔNG reload cart để giữ nguyên buy_now
        // Cart đã được load trong useEffect ban đầu
      };
      reload();

      // ✅ Auto-check sản phẩm dừng bán mỗi 5 giây
      const interval = setInterval(async () => {
        if (cart.length > 0) {
          const now = new Date().toLocaleTimeString();
          console.log(`[Checkout] 🔄 [${now}] Auto-checking stopped products...`);
          await checkStoppedProducts(cart);
        }
      }, 5000); // 5 giây

      return () => {
        console.log('[Checkout] 🛑 Clearing interval');
        clearInterval(interval);
      };

      // ❌ KHÔNG xóa buy_now ở đây vì sẽ bị xóa khi chuyển sang address-book
      // buy_now sẽ được xóa trong confirmOrder sau khi thanh toán thành công
    }, [cart, checkStoppedProducts])
  );

  // 🟢 Xử lý deep link khi thanh toán ZaloPay thành công
  useEffect(() => {
    // Kiểm tra params từ URL (Expo Router)
    if (params.payment === 'success') {
      console.log('Payment success detected from URL params');
      handlePaymentSuccess();
    }

    // Lắng nghe deep link khi app đang mở
    const subscription = Linking.addEventListener('url', (event) => {
      const { url } = event;
      console.log('Deep link received in checkout:', url);

      // Kiểm tra nếu có query param payment=success
      if (url.includes('payment=success') || url.includes('checkout?payment=success')) {
        handlePaymentSuccess();
      }
    });

    // Kiểm tra deep link khi app mở từ trạng thái đóng
    Linking.getInitialURL().then((url) => {
      if (url && (url.includes('payment=success') || url.includes('checkout?payment=success'))) {
        handlePaymentSuccess();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [params.payment]);

  // 🟢 Kiểm tra khi component mount (CHỈ khi có pending flag - tức là đang chờ kết quả thanh toán)
  useEffect(() => {
    const checkIfPendingPayment = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) return;

        // CHỈ check nếu có pending flag (đang chờ kết quả thanh toán ZaloPay)
        const pendingFlagStr = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
        if (!pendingFlagStr) {
          console.log('[Checkout] No pending payment, skipping check');
          return;
        }

        // Kiểm tra thời gian của pending flag - chỉ check nếu trong vòng 15 phút
        try {
          const pendingData = JSON.parse(pendingFlagStr);
          const timeSincePending = Date.now() - (pendingData.timestamp || 0);
          const minutesAgo = Math.round(timeSincePending / (1000 * 60));

          console.log('[Checkout] Pending payment age:', minutesAgo, 'minutes');

          // Nếu pending flag quá 15 phút, xóa nó đi và không check
          if (timeSincePending > 15 * 60 * 1000) {
            console.log('[Checkout] Pending flag too old, removing...');
            await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
            return;
          }
        } catch (e) {
          // Nếu không parse được, xóa flag
          console.log('[Checkout] Invalid pending flag, removing...');
          await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
          return;
        }

        console.log('[Checkout] Valid pending payment detected, checking payment success...');
        // Kiểm tra ngay khi mount
        checkPaymentSuccess();

        // Kiểm tra lại sau các khoảng thời gian để đảm bảo backend đã cập nhật
        const timeouts = [
          setTimeout(() => {
            console.log('[Checkout] Retry check after 1s...');
            checkPaymentSuccess();
          }, 1000),
          setTimeout(() => {
            console.log('[Checkout] Retry check after 2s...');
            checkPaymentSuccess();
          }, 2000),
          setTimeout(() => {
            console.log('[Checkout] Retry check after 5s...');
            checkPaymentSuccess();
          }, 5000),
          setTimeout(() => {
            console.log('[Checkout] Retry check after 8s...');
            checkPaymentSuccess();
          }, 8000)
        ];

        return () => {
          timeouts.forEach(timeout => clearTimeout(timeout));
        };
      } catch (error) {
        console.log('[Checkout] Error checking pending payment:', error);
      }
    };

    checkIfPendingPayment();
  }, [checkPaymentSuccess]);

  // 🟢 Lắng nghe AppState để detect khi app được active lại từ background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[Checkout] App became active, checking payment success...');
        // Đợi một chút để đảm bảo app đã sẵn sàng
        setTimeout(() => {
          checkPaymentSuccess();
        }, 500);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkPaymentSuccess]);

  // 🟢 Kiểm tra flag từ AsyncStorage khi màn hình được focus (CHỈ khi có pending flag)
  useFocusEffect(
    React.useCallback(() => {
      const checkOnFocus = async () => {
        try {
          const userString = await AsyncStorage.getItem('user');
          const user = userString ? JSON.parse(userString) : null;
          if (!user || !user._id) return;

          // CHỈ check nếu có pending flag hoặc payment param
          const pendingFlagStr = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
          const hasPaymentParam = params.payment === 'success';

          if (!pendingFlagStr && !hasPaymentParam) {
            console.log('[Checkout] Screen focused - No pending payment or payment param, skipping check');
            return;
          }

          console.log('[Checkout] Screen focused - Pending payment detected, checking...');
          // Kiểm tra ngay khi focus
          checkPaymentSuccess();

          // Kiểm tra lại sau các khoảng thời gian
          const timeouts = [
            setTimeout(() => {
              checkPaymentSuccess();
            }, 1000),
            setTimeout(() => {
              checkPaymentSuccess();
            }, 2000),
            setTimeout(() => {
              checkPaymentSuccess();
            }, 5000)
          ];

          return () => {
            timeouts.forEach(timeout => clearTimeout(timeout));
          };
        } catch (error) {
          console.log('[Checkout] Error checking on focus:', error);
        }
      };

      checkOnFocus();
    }, [checkPaymentSuccess, params.payment])
  );

  // 🟢 Lấy danh sách categoryId trong cart
  const getCartCategoryIds = () => {
    const categoryIds = new Set<string>();
    cart.forEach(item => {
      if (item.categoryId) categoryIds.add(String(item.categoryId));
    });
    return Array.from(categoryIds);
  };

  // 🟢 Fetch voucher khả dụng
  const fetchAvailableVouchers = async (orderAmount: number) => {
    if (orderAmount <= 0 || orderAmount > VOUCHER_MAX_ORDER_AMOUNT) {
      setAvailableVouchers([]);
      setLoadingVouchers(false);
      return;
    }
    try {
      setLoadingVouchers(true);
      const categoryIds = getCartCategoryIds();
      const categoryParams = categoryIds.length > 0 ? `?categoryIds=${categoryIds.join(',')}` : '';
      const response = await fetch(`${BASE_URL}/vouchers/available/${orderAmount}${categoryParams}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableVouchers(data);
      }
    } catch (error) {
      console.error('Error fetching available vouchers:', error);
    } finally {
      setLoadingVouchers(false);
    }
  };

  // 🟢 Chọn voucher từ danh sách
  const selectVoucher = async (voucher: any) => {
    // Kiểm tra số lượng sản phẩm
    const totalProducts = cart.reduce((sum, i) => sum + i.qty, 0);
    if (totalProducts > 3) {
      Alert.alert('Thông báo', 'Voucher chỉ được áp dụng cho tối đa 3 sản phẩm. Hiện tại bạn có ' + totalProducts + ' sản phẩm trong giỏ hàng.');
      return;
    }

    const cartTotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);
    if (cartTotal > VOUCHER_MAX_ORDER_AMOUNT) {
      Alert.alert('Thông báo', 'Đơn hàng trên 500.000 đ không được áp dụng voucher.');
      return;
    }
    const categoryIds = getCartCategoryIds();
    try {
      const response = await fetch(`${BASE_URL}/vouchers/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucher.code, orderAmount: cartTotal, categoryIds })
      });
      const data = await response.json();
      if (!response.ok || !data.valid) {
        Alert.alert('Lỗi', data.message || 'Voucher không hợp lệ');
        fetchAvailableVouchers(cartTotal);
        return;
      }

      setAppliedVoucher({
        code: data.voucher.code,
        name: data.voucher.name,
        description: data.voucher.description || '',
        discountType: data.voucher.discountType,
        discountValue: data.voucher.discountValue,
        maxDiscountAmount: data.voucher.maxDiscountAmount || 0
      });

      setVoucherDiscount(data.discount);
      setShowVoucherList(false);
      Alert.alert('Thành công', `Đã áp dụng mã ${data.voucher.code}!`);
    } catch (error) {
      console.error('Error applying voucher:', error);
      Alert.alert('Lỗi', 'Không thể áp dụng voucher. Vui lòng thử lại!');
    }
  };

  const openAddressModal = () => {
    setInput(addressObj);
    setShowModal(true);
  };

  const saveAddress = async () => {
    setShowModal(false);
    setAddressObj(input);
    if (userId) await AsyncStorage.setItem(`address_${userId}`, JSON.stringify(input));
  };

  // 🟢 Áp dụng voucher nhập tay
  const applyVoucher = async () => {
    if (!voucherCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã voucher');
      return;
    }

    // Kiểm tra số lượng sản phẩm
    const totalProducts = cart.reduce((sum, i) => sum + i.qty, 0);
    if (totalProducts > 3) {
      Alert.alert('Thông báo', 'Voucher chỉ được áp dụng cho tối đa 3 sản phẩm. Hiện tại bạn có ' + totalProducts + ' sản phẩm trong giỏ hàng.');
      return;
    }

    const cartTotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);
    if (cartTotal > VOUCHER_MAX_ORDER_AMOUNT) {
      Alert.alert('Thông báo', 'Đơn hàng trên 500.000 đ không được áp dụng voucher.');
      return;
    }
    const categoryIds = getCartCategoryIds();

    try {
      const response = await fetch(`${BASE_URL}/vouchers/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherCode.trim(), orderAmount: cartTotal, categoryIds })
      });
      const data = await response.json();

      if (!response.ok || !data.valid) {
        Alert.alert('Lỗi', data.message || 'Voucher không hợp lệ');
        return;
      }

      setAppliedVoucher({
        code: data.voucher.code,
        name: data.voucher.name,
        description: data.voucher.description || '',
        discountType: data.voucher.discountType,
        discountValue: data.voucher.discountValue,
        maxDiscountAmount: data.voucher.maxDiscountAmount || 0
      });
      setVoucherDiscount(data.discount);
      Alert.alert('Thành công', `Đã áp dụng mã ${data.voucher.code}!`);
    } catch (error) {
      console.error('Error checking voucher:', error);
      Alert.alert('Lỗi', 'Không thể kiểm tra voucher. Vui lòng thử lại!');
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherDiscount(0);
    setVoucherCode('');
    const cartTotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);
    if (cartTotal > 0 && cartTotal <= VOUCHER_MAX_ORDER_AMOUNT) {
      fetchAvailableVouchers(cartTotal);
    } else {
      setAvailableVouchers([]);
    }
  };

  // 🟢 Mở ZaloPay sandbox để thanh toán
  const openZaloPay = async (orderId: string, amount: number, description: string) => {
    try {
      const ZALOPAY_APP_ID = '2554';
      // URL ZaloPay sandbox HTML (file trong public folder của backend)
      const ZALOPAY_SANDBOX_URL = `${BASE_URL.replace('/api', '')}/zalopay-sandbox.html`;

      // Tạo transaction ID unique
      const apptransid = `${Date.now()}_${orderId}`;
      const apptime = Date.now();
      const amountRounded = Math.round(amount);

      // Tạo URL với các tham số cần thiết cho ZaloPay sandbox
      const params = new URLSearchParams({
        appid: ZALOPAY_APP_ID,
        apptransid: apptransid,
        appuser: userId || 'user',
        apptime: apptime.toString(),
        amount: amountRounded.toString(),
        description: description || 'Thanh toan don hang',
        item: JSON.stringify(cart.map(i => ({
          itemid: String(i._id || i.id || ''),
          itemname: i.name || '',
          itemprice: Math.round(i.price || 0),
          itemquantity: i.qty || 1
        }))),
        embeddata: JSON.stringify({ orderId }),
        bankcode: 'zalopayapp'
      });

      const paymentUrl = `${ZALOPAY_SANDBOX_URL}?${params.toString()}`;

      console.log('Opening ZaloPay Sandbox URL:', paymentUrl);

      // Mở URL trong trình duyệt mặc định (Chrome trên Android, Safari trên iOS)
      const supported = await Linking.canOpenURL(paymentUrl);
      if (supported) {
        await Linking.openURL(paymentUrl);
      } else {
        // Fallback: thử mở trực tiếp
        await Linking.openURL(paymentUrl);
      }
    } catch (error) {
      console.error('Error opening ZaloPay:', error);
      Alert.alert('Lỗi', 'Không thể mở ZaloPay. Vui lòng thử lại!');
    }
  };

  // 🟢 Xác nhận đơn hàng
  const confirmOrder = async () => {
    if (cart.length === 0) return;
    const userString = await AsyncStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    if (!user || !user._id) {
      router.push('/(tabs)/login');
      return;
    }

    // Kiểm tra stock trước khi thanh toán
    try {
      const stockCheckPromises = cart.map(async (item) => {
        try {
          // Lấy thông tin sản phẩm từ API để kiểm tra stock hiện tại
          const productResponse = await fetch(`${BASE_URL}/products/${item.id}`);
          if (!productResponse.ok) return null;
          const productData = await productResponse.json();

          // Tìm variant tương ứng
          const variant = productData.variants?.find(
            (v: any) => v.color === item.color && v.size === item.size
          );

          if (variant && item.qty > variant.stock) {
            return {
              name: item.name,
              size: item.size,
              color: item.color,
              requestedQty: item.qty,
              availableStock: variant.stock
            };
          }
          return null;
        } catch (error) {
          console.error('Error checking stock for item:', error);
          return null;
        }
      });

      const stockIssues = (await Promise.all(stockCheckPromises)).filter(issue => issue !== null);

      if (stockIssues.length > 0) {
        const issueMessages = stockIssues.map(issue =>
          `${issue.name} (${issue.size}, ${issue.color}): Yêu cầu ${issue.requestedQty}, còn ${issue.availableStock}`
        ).join('\n');

        Alert.alert(
          'Thông báo',
          `Số lượng tồn kho không đủ:\n\n${issueMessages}\n\nVui lòng điều chỉnh số lượng và thử lại.`
        );
        return;
      }
    } catch (error) {
      console.error('Error validating stock:', error);
      // Nếu không kiểm tra được stock từ API, kiểm tra stock đã lưu trong cart
      const itemsExceedStock = cart.filter(item =>
        item.stock !== undefined && item.qty > item.stock
      );

      if (itemsExceedStock.length > 0) {
        const itemNames = itemsExceedStock.map(item =>
          `${item.name} (${item.size}, ${item.color}): Yêu cầu ${item.qty}, còn ${item.stock}`
        ).join('\n');
        Alert.alert(
          'Thông báo',
          `Số lượng tồn kho không đủ:\n\n${itemNames}\n\nVui lòng điều chỉnh số lượng và thử lại.`
        );
        return;
      }
    }

    const finalTotal = total - voucherDiscount;
    const orderId = Date.now().toString();

    // Tạo đơn lên backend trước
    let backendOrderId = null;
    try {
      const response = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          customerName: user.name || addressObj.name,
          customerPhone: addressObj.phone || user.phone,
          items: cart.map(i => ({
            productId: i._id || i.productId || i.id,
            name: i.name,
            size: i.size,
            color: i.color,
            qty: i.qty,
            price: i.price,
            image: i.image,
            discountAmount: i.discountAmount || 0
          })),
          total: finalTotal,
          voucherCode: appliedVoucher?.code || null,
          discount: voucherDiscount,
          address: `${addressObj.name} - ${addressObj.phone}\n${addressObj.address}`,
          payment,
          status: payment === 'zalopay' ? 'Chờ thanh toán' : 'Chờ xác nhận',
        })
      });
      if (response.ok) {
        const data = await response.json();
        backendOrderId = data?._id || data?.id || null;
      }
    } catch (e) {
      console.log('POST /orders failed', e);
    }

    // Chỉ lưu vào AsyncStorage nếu KHÔNG phải ZaloPay
    // Với ZaloPay, chỉ lưu khi thanh toán thành công (xử lý trong orders.tsx)
    if (payment !== 'zalopay') {
      const historyKey = `order_history_${user._id}`;
      const historyString = await AsyncStorage.getItem(historyKey);
      let history = historyString ? JSON.parse(historyString) : [];
      history = Array.isArray(history) ? history : [];

      const newOrder = {
        id: backendOrderId || orderId,
        _id: backendOrderId,
        items: cart,
        total: finalTotal,
        originalTotal: total,
        discount: voucherDiscount,
        voucherCode: appliedVoucher?.code,
        address: `${addressObj.name} - ${addressObj.phone}\n${addressObj.address}`,
        payment,
        status: 'Chờ xác nhận',
        createdAt: new Date().toISOString()
      };
      history.unshift(newOrder);
      await AsyncStorage.setItem(historyKey, JSON.stringify(history));
    }

    // Nếu là ZaloPay, mở trình duyệt thanh toán
    if (payment === 'zalopay') {
      // Lưu flag để kiểm tra khi quay lại (fallback cho LDPlayer)
      try {
        await AsyncStorage.setItem(`zalopay_pending_${user._id}`, JSON.stringify({
          orderId: backendOrderId || orderId,
          timestamp: Date.now()
        }));
      } catch { }

      // Sử dụng backendOrderId nếu có, nếu không dùng orderId local
      const paymentOrderId = backendOrderId || orderId;
      const orderDescription = `Thanh toan don hang ${paymentOrderId}`;
      await openZaloPay(paymentOrderId, finalTotal, orderDescription);

      Alert.alert(
        'Đang chuyển đến ZaloPay',
        'Vui lòng hoàn tất thanh toán trên trình duyệt. Sau khi thanh toán thành công, đơn hàng sẽ được cập nhật.',
        [
          {
            text: 'Xem đơn hàng',
            onPress: () => router.replace('/orders')
          },
          {
            text: 'Quay về Home',
            onPress: () => router.replace('/(tabs)/home'),
            style: 'cancel'
          },
        ]
      );
    } else {
      // Xoá sản phẩm đã thanh toán khỏi giỏ (chỉ khi COD)
      try {
        const fullCartStr = await AsyncStorage.getItem(`cart_${user._id}`);
        let fullCart = fullCartStr ? JSON.parse(fullCartStr) : [];
        fullCart = Array.isArray(fullCart) ? fullCart : [];
        const remaining = fullCart.filter(i => !i?.checked);
        await AsyncStorage.setItem(`cart_${user._id}`, JSON.stringify(remaining));
      } catch { }

      Alert.alert('Thành công', 'Đơn hàng đã được đặt!', [
        { text: 'Xem trạng thái', onPress: () => router.replace('/orders') },
        { text: 'Quay về Home', onPress: () => router.replace('/(tabs)/home'), style: 'cancel' },
      ]);
    }

    // Nếu là buy now, dọn dẹp key tạm để không ảnh hưởng lần sau
    try {
      await AsyncStorage.removeItem(`buy_now_${user._id}`);
    } catch { }

    // Reset voucher
    setAppliedVoucher(null);
    setVoucherDiscount(0);
    setVoucherCode('');
  };

  // 🟢 Render sản phẩm
  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <Image source={{ uri: `${DOMAIN}${item.image}` }} style={styles.productImage} />
      <View style={{ flex: 1 }}>
        <Text>{item.name} ({item.size}, {item.color}) x{item.qty}</Text>
        <Text style={{ fontWeight: 'bold', color: '#222' }}>
          {(item.price * item.qty).toLocaleString('vi-VN')} VND
        </Text>
      </View>
    </View>
  );

  // 🟢 Tính tổng giảm giá sản phẩm (nếu có)
  const productDiscount = cart.reduce((sum, i) => sum + (i.discountAmount ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Sản phẩm */}
        <View style={styles.section}>
          <Text style={styles.heading}>Sản phẩm</Text>
          {cart.length === 0 ? (
            <Text style={{ color: '#888' }}>Không có sản phẩm nào!</Text>
          ) : (
            cart.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Image source={{ uri: `${DOMAIN}${item.image}` }} style={styles.productImage} />
                <View style={{ flex: 1 }}>
                  <Text>{item.name} ({item.size}, {item.color}) x{item.qty}</Text>
                  <Text style={{ fontWeight: 'bold', color: '#222' }}>
                    {(item.price * item.qty).toLocaleString('vi-VN')} VND
                  </Text>
                  {item.discountAmount > 0 && (
                    <Text style={{ fontSize: 13, color: '#22c55e' }}>
                      Giảm: -{item.discountAmount.toLocaleString('vi-VN')} VND
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Địa chỉ */}
        <View style={styles.section}>
          <Text style={styles.heading}>Địa chỉ nhận hàng</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-sharp" size={20} color="#ff4757" style={{ marginRight: 6 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold' }}>{addressObj.name || '[Tên]'}</Text>
              <Text style={{ color: '#333' }}>{addressObj.phone || '[Số điện thoại]'}</Text>
              <Text>{addressObj.address || '[Địa chỉ]'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={openAddressModal}>
                <Text style={{ color: '#4084f4', fontWeight: 'bold' }}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/address-book')} style={{ marginTop: 6 }}>
                <Text style={{ color: '#ff4757', fontWeight: 'bold' }}>Chọn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Voucher */}
        <View style={styles.section}>
          <Text style={styles.heading}>Voucher / Mã giảm giá</Text>
          {voucherEligible ? (
            appliedVoucher ? (
              <View style={styles.voucherAppliedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', color: '#22c55e' }}>✓ {appliedVoucher.code}</Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>{appliedVoucher.description}</Text>
                  <Text style={{ fontSize: 13, color: '#ef233c', marginTop: 2 }}>
                    Giảm: {voucherDiscount.toLocaleString('vi-VN')} VND
                  </Text>
                </View>
                <TouchableOpacity onPress={removeVoucher}>
                  <Ionicons name="close-circle" size={24} color="#ef233c" />
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {availableVouchers.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setShowVoucherList(!showVoucherList)}
                    style={styles.selectVoucherBtn}
                  >
                    <Ionicons name="ticket-outline" size={20} color="#ff4757" />
                    <Text style={{ color: '#ff4757', fontWeight: 'bold', marginLeft: 8 }}>
                      Chọn voucher ({availableVouchers.length})
                    </Text>
                    <Ionicons
                      name={showVoucherList ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#ff4757"
                      style={{ marginLeft: 'auto' }}
                    />
                  </TouchableOpacity>
                )}

                {showVoucherList && availableVouchers.length > 0 && (
                  <View style={styles.voucherListContainer}>
                    {loadingVouchers ? (
                      <Text style={{ textAlign: 'center', padding: 10, color: '#888' }}>Đang tải...</Text>
                    ) : (
                      <ScrollView nestedScrollEnabled>
                        {availableVouchers.map((voucher, idx) => (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => selectVoucher(voucher)}
                            style={[styles.voucherItem, idx === availableVouchers.length - 1 && { borderBottomWidth: 0 }]}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15 }}>{voucher.code}</Text>
                                {voucher.discountType === 'percent' ? (
                                  <Text style={{ marginLeft: 8, color: '#22c55e', fontSize: 12 }}>-{voucher.discountValue}%</Text>
                                ) : (
                                  <Text style={{ marginLeft: 8, color: '#22c55e', fontSize: 12 }}>-{voucher.discountValue.toLocaleString('vi-VN')} đ</Text>
                                )}
                              </View>
                              <Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{voucher.name || voucher.description}</Text>
                              {voucher.minOrderAmount > 0 && (
                                <Text style={{ fontSize: 11, color: '#999' }}>Đơn từ {voucher.minOrderAmount.toLocaleString('vi-VN')} đ</Text>
                              )}
                              <Text style={{ fontSize: 11, color: '#ef233c', marginTop: 4 }}>Tiết kiệm: {voucher.discount.toLocaleString('vi-VN')} đ</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: availableVouchers.length > 0 ? 8 : 0 }}>
                  <TextInput
                    value={voucherCode}
                    onChangeText={setVoucherCode}
                    placeholder="Hoặc nhập mã giảm giá"
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    onPress={applyVoucher}
                    style={[styles.confirmBtn, { paddingVertical: 10, paddingHorizontal: 20, marginTop: 0 }]}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Áp dụng</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          ) : (
            <Text style={styles.voucherLimitNote}>
              Đơn hàng trên 500.000 đ không được áp dụng voucher. Vui lòng giảm giá trị đơn hoặc hoàn tất thanh toán không cần mã.
            </Text>
          )}
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.heading}>Phương thức thanh toán</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {PAYMENT_METHODS.map(method => (
              <TouchableOpacity
                key={method.key}
                style={[styles.paymentBtn, payment === method.key && styles.paymentBtnActive]}
                onPress={() => setPayment(method.key)}
              >
                <Text style={{ color: payment === method.key ? '#fff' : '#222' }}>{method.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tổng cộng */}
        <View style={styles.section}>
          <Text style={styles.heading}>Tổng cộng</Text>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: '#666', fontSize: 14 }}>Tạm tính: {total.toLocaleString('vi-VN')} VND</Text>
            {voucherDiscount > 0 && (
              <Text style={{ color: '#22c55e', fontSize: 14 }}>Giảm giá: -{voucherDiscount.toLocaleString('vi-VN')} VND</Text>
            )}
          </View>
          <Text style={styles.totalTxt}>{(total - voucherDiscount).toLocaleString('vi-VN')} VND</Text>
        </View>
      </ScrollView>

      {/* Modal Địa chỉ */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 11 }}>Thông tin nhận hàng</Text>
            <TextInput value={input.name} onChangeText={t => setInput(s => ({ ...s, name: t }))} placeholder="Tên người nhận" style={styles.input} />
            <TextInput value={input.phone} onChangeText={t => setInput(s => ({ ...s, phone: t }))} placeholder="Số điện thoại" style={styles.input} keyboardType="phone-pad" />
            <TextInput value={input.address} onChangeText={t => setInput(s => ({ ...s, address: t }))} placeholder="Địa chỉ nhận hàng" style={styles.input} multiline />
            <View style={{ flexDirection: "row", marginTop: 7 }}>
              <TouchableOpacity style={[styles.confirmBtn, { flex: 1, marginRight: 6, backgroundColor: '#eee' }]} onPress={() => setShowModal(false)}>
                <Text style={{ color: '#333', fontWeight: 'bold' }}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { flex: 1, backgroundColor: '#ff4757' }]} onPress={saveAddress}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Dialog */}
      <Modal visible={showSuccessDialog} animationType="fade" transparent>
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContainer}>
            <Text style={styles.successTitle}>Thành công</Text>
            <Text style={styles.successMessage}>Đơn hàng đã được đặt!</Text>
            <View style={styles.successButtonRow}>
              <TouchableOpacity
                style={[styles.successButton, styles.successButtonLeft]}
                onPress={async () => {
                  setShowSuccessDialog(false);

                  // ✅ Lưu timestamp khi user đóng dialog VÀ xóa pending flag
                  try {
                    const userString = await AsyncStorage.getItem('user');
                    const user = userString ? JSON.parse(userString) : null;
                    if (user && user._id) {
                      await AsyncStorage.setItem(`zalopay_last_dismissed_${user._id}`, Date.now().toString());
                      await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
                      console.log('✅ Saved dismissal timestamp and cleared pending flag:', new Date().toISOString());
                    }
                  } catch (e) {
                    console.error('Error saving timestamp:', e);
                  }

                  router.replace('/orders');
                }}
              >
                <Text style={styles.successButtonText}>XEM TRẠNG THÁI</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.successButton, styles.successButtonRight]}
                onPress={async () => {
                  setShowSuccessDialog(false);

                  // ✅ Lưu timestamp khi user đóng dialog VÀ xóa pending flag
                  try {
                    const userString = await AsyncStorage.getItem('user');
                    const user = userString ? JSON.parse(userString) : null;
                    if (user && user._id) {
                      await AsyncStorage.setItem(`zalopay_last_dismissed_${user._id}`, Date.now().toString());
                      await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
                      console.log('✅ Saved dismissal timestamp and cleared pending flag:', new Date().toISOString());
                    }
                  } catch (e) {
                    console.error('Error saving timestamp:', e);
                  }

                  router.replace('/(tabs)/home');
                }}
              >
                <Text style={styles.successButtonText}>QUAY VỀ HOME</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Failure Dialog */}
      <Modal visible={showFailureDialog} animationType="fade" transparent>
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContainer}>
            <Text style={[styles.successTitle, { color: '#ef4444' }]}>Thanh toán thất bại</Text>
            <Text style={styles.successMessage}>Giao dịch ZaloPay không thành công. Vui lòng thử lại!</Text>
            <View style={styles.successButtonRow}>
              <TouchableOpacity
                style={[styles.successButton, { flex: 1, backgroundColor: '#ff4757' }]}
                onPress={async () => {
                  setShowFailureDialog(false);

                  // ✅ Lưu timestamp khi user đóng dialog
                  try {
                    const userString = await AsyncStorage.getItem('user');
                    const user = userString ? JSON.parse(userString) : null;
                    if (user && user._id) {
                      await AsyncStorage.setItem(`zalopay_last_dismissed_${user._id}`, Date.now().toString());
                      console.log('✅ Saved failure dismissal timestamp:', new Date().toISOString());
                    }
                  } catch (e) {
                    console.error('Error saving timestamp:', e);
                  }

                  // Ở lại màn checkout để user thử lại
                }}
              >
                <Text style={[styles.successButtonText, { color: '#fff' }]}>XÁC NHẬN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fixed button */}
      <View style={styles.fixedBtnWrap}>
        <TouchableOpacity style={styles.confirmBtn} disabled={cart.length === 0} onPress={confirmOrder}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>Xác nhận và thanh toán</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f9' },
  section: { marginBottom: 22, paddingHorizontal: 16 },
  heading: { fontWeight: 'bold', fontSize: 16, marginBottom: 8, color: '#222' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 11, backgroundColor: '#fff', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 6 },
  productImage: { width: 54, height: 54, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  addressRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 7, marginBottom: 3 },
  paymentBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 7, backgroundColor: '#eee', marginRight: 12, marginBottom: 5 },
  paymentBtnActive: { backgroundColor: '#ff4757' },
  totalTxt: { fontSize: 18, color: '#ef233c', fontWeight: 'bold', marginTop: 6 },
  confirmBtn: { backgroundColor: '#ff4757', paddingVertical: 14, borderRadius: 7, alignItems: 'center', marginTop: 0 },
  fixedBtnWrap: { position: 'absolute', left: 0, right: 0, bottom: Platform.OS === 'ios' ? 15 : 0, padding: 12, backgroundColor: 'rgba(248,248,249,0.9)', borderTopWidth: 1, borderTopColor: '#eee' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.18)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '87%', backgroundColor: '#fff', borderRadius: 12, padding: 18, elevation: 8 },
  input: { borderColor: '#eee', borderWidth: 1, borderRadius: 7, marginBottom: 11, padding: 10, fontSize: 15, backgroundColor: '#fafaff' },
  voucherAppliedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 12, borderRadius: 7, borderWidth: 1, borderColor: '#22c55e', marginBottom: 3 },
  selectVoucherBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 7, borderWidth: 1, borderColor: '#ff4757', marginBottom: 8 },
  voucherListContainer: { backgroundColor: '#fff', borderRadius: 7, borderWidth: 1, borderColor: '#eee', marginBottom: 8, maxHeight: 300 },
  voucherItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  voucherLimitNote: { backgroundColor: '#fff1f2', borderRadius: 7, borderWidth: 1, borderColor: '#fecdd3', padding: 12, fontSize: 13, color: '#be123c', lineHeight: 18 },
  successModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  successModalContainer: { width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 12 },
  successMessage: { fontSize: 16, color: '#666', marginBottom: 24, textAlign: 'center' },
  successButtonRow: { flexDirection: 'row', width: '100%', gap: 12, justifyContent: 'space-between' },
  successButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: 'transparent' },
  successButtonLeft: {},
  successButtonRight: {},
  successButtonText: { color: '#4084f4', fontWeight: 'bold', fontSize: 14 }
});
