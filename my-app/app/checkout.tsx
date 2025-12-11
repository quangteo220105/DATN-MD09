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
  AppState,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { DOMAIN, BASE_URL } from '../config/apiConfig';

const PAYMENT_METHODS = [
  { key: 'cod', label: 'Thanh toán tiền mặt' },
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
  const [showPaymentLoading, setShowPaymentLoading] = useState(false);
  const hasCheckedPaymentRef = useRef(false); // Tránh check nhiều lần trong cùng một session
  const hasOpenedZaloPayRef = useRef(false); // Đánh dấu đã mở ZaloPay
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
      // ✅ Reset ZaloPay flag khi hiển thị dialog
      hasOpenedZaloPayRef.current = false;
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
        const remaining = fullCart.filter((i: any) => !i?.checked);
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



      // Hiển thị dialog thành công với delay nhỏ để đảm bảo state update
      console.log('🎉🎉🎉 SETTING showSuccessDialog to TRUE 🎉🎉🎉');
      setTimeout(() => {
        setShowSuccessDialog(true);
        // ✅ Reset ZaloPay flag khi hiển thị dialog
        hasOpenedZaloPayRef.current = false;
        console.log('🎉 Dialog state updated! Current value should be TRUE');
      }, 100);
    } catch (error) {
      console.error('[Checkout] Error handling payment success:', error);
    }
  }, []);

  // 🟢 Hàm kiểm tra có nên check payment không - ĐƠN GIẢN HÓA TRIỆT ĐỂ
  const shouldCheckPayment = React.useCallback(async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) return false;

      // ✅ CHỈ check khi có payment=success param HOẶC có pending flag
      const pendingFlagStr = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
      const hasPaymentParam = params.payment === 'success';

      const shouldCheck = !!(pendingFlagStr || hasPaymentParam);

      console.log('[shouldCheckPayment] SIMPLIFIED CHECK:', {
        userId: user._id,
        hasPendingFlag: !!pendingFlagStr,
        hasPaymentParam,
        RESULT: shouldCheck
      });

      return shouldCheck;
    } catch {
      return false;
    }
  }, [params.payment]);

  // 🟢 Hàm kiểm tra thanh toán thành công - ĐƠN GIẢN HÓA TRIỆT ĐỂ
  const checkPaymentSuccess = React.useCallback(async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) return false;

      console.log('[Checkout] 🔍 SIMPLIFIED CHECK - Checking payment success for user:', user._id);

      // ✅ SIMPLIFIED: Chỉ kiểm tra pending flag và backend
      const pendingFlagStr = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
      console.log('[Checkout] 🔍 SIMPLIFIED - PENDING FLAG:', { hasPendingFlag: !!pendingFlagStr });

      if (!pendingFlagStr && !params.payment) {
        console.log('[Checkout] ✅ SIMPLIFIED - NO PENDING FLAG AND NO PAYMENT PARAM - SKIP');
        return false;
      }

      // Lấy danh sách đơn hàng từ backend
      const response = await fetch(`${BASE_URL}/orders/user/${user._id}/list`);
      if (!response.ok) {
        console.log('[Checkout] ❌ SIMPLIFIED - BACKEND REQUEST FAILED:', response.status);
        return false;
      }

      const json = await response.json();
      const orders = Array.isArray(json) ? json : json.data || [];
      console.log('[Checkout] 📊 SIMPLIFIED - TOTAL ORDERS:', orders.length);

      let targetOrder = null;

      // ✅ CASE 1: Có pending flag → Tìm đơn theo orderId
      if (pendingFlagStr) {
        try {
          const pendingData = JSON.parse(pendingFlagStr);
          console.log('[Checkout] 📋 SIMPLIFIED - PENDING DATA:', {
            orderId: pendingData.orderId,
            isRetryPayment: pendingData.isRetryPayment,
            minutesAgo: Math.round((Date.now() - pendingData.timestamp) / (1000 * 60))
          });

          // Tìm đơn theo orderId
          targetOrder = orders.find((o: any) => {
            const orderId = String(o._id || o.id || '');
            return orderId === String(pendingData.orderId) && o.payment === 'zalopay';
          });

          console.log('[Checkout] 🎯 SIMPLIFIED - ORDER FROM PENDING FLAG:', !!targetOrder);
        } catch (e) {
          console.log('[Checkout] ❌ SIMPLIFIED - ERROR PARSING PENDING FLAG:', e);
        }
      }

      // ✅ CASE 2: Không có pending flag hoặc không tìm thấy đơn → Tìm đơn ZaloPay mới nhất
      if (!targetOrder && params.payment === 'success') {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const recentZaloPayOrders = orders.filter((o: any) => {
          if (o.payment !== 'zalopay') return false;
          const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : 0;
          return orderTime > oneHourAgo;
        });

        if (recentZaloPayOrders.length > 0) {
          targetOrder = recentZaloPayOrders.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          console.log('[Checkout] 🎯 SIMPLIFIED - LATEST ZALOPAY ORDER:', !!targetOrder);
        }
      }

      // ✅ KIỂM TRA TRẠNG THÁI VÀ HIỂN THỊ DIALOG
      if (targetOrder) {
        const orderStatus = (targetOrder.status || '').toLowerCase().trim();
        console.log('[Checkout] 🎯 SIMPLIFIED - TARGET ORDER:', {
          orderId: targetOrder._id || targetOrder.id,
          status: targetOrder.status,
          statusLower: orderStatus
        });

        // Xóa pending flag
        if (pendingFlagStr) {
          await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
          console.log('[Checkout] 🧹 SIMPLIFIED - PENDING FLAG CLEARED');
        }

        if (orderStatus === 'chờ thanh toán') {
          console.log('[Checkout] ❌ SIMPLIFIED - PAYMENT FAILED');
          await handlePaymentFailure();
          return true;
        } else if (orderStatus === 'đã xác nhận' || orderStatus.includes('xác nhận')) {
          console.log('[Checkout] 🎉 SIMPLIFIED - PAYMENT SUCCESS');
          await handlePaymentSuccess();
          return true;
        } else {
          console.log('[Checkout] ⚠️ SIMPLIFIED - UNEXPECTED STATUS, ASSUMING SUCCESS:', orderStatus);
          await handlePaymentSuccess();
          return true;
        }
      } else {
        console.log('[Checkout] ❌ SIMPLIFIED - NO TARGET ORDER FOUND');
        // Xóa pending flag nếu có
        if (pendingFlagStr) {
          await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
          console.log('[Checkout] 🧹 SIMPLIFIED - CLEARED ORPHANED PENDING FLAG');
        }
      }

      return false;
    } catch (error) {
      console.error('[Checkout] ❌ SIMPLIFIED - ERROR:', error);
      return false;
    }
  }, [params.payment, handlePaymentSuccess, handlePaymentFailure]);

  const checkPaymentWithSpinner = React.useCallback(async () => {
    const MIN_SPINNER_TIME = 2000;
    const MAX_SPINNER_TIME = 3000;
    const start = Date.now();
    setShowPaymentLoading(true);
    try {
      return await checkPaymentSuccess();
    } finally {
      const elapsed = Date.now() - start;
      const intended = Math.max(MIN_SPINNER_TIME, Math.min(MAX_SPINNER_TIME, elapsed + 500));
      const remaining = Math.max(0, intended - elapsed);
      setTimeout(() => setShowPaymentLoading(false), remaining);
    }
  }, [checkPaymentSuccess]);

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

      setUserId(user._id);

      // ✅ CHỈ xóa pending flag CŨ (KHÔNG PHẢI retry payment) nếu đây là mua ngay bình thường
      console.log('[Checkout] 🔍 CHECKING PARAMS:', { orderId: params.orderId, payment: params.payment });
      if (!params.orderId && !params.payment) {
        try {
          const pendingFlagStr = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
          console.log('[Checkout] 🔍 PENDING FLAG CHECK:', { hasPendingFlag: !!pendingFlagStr });
          if (pendingFlagStr) {
            try {
              const pendingData = JSON.parse(pendingFlagStr);
              console.log('[Checkout] 📋 PENDING FLAG DATA:', pendingData);

              // ✅ CHỈ xóa nếu KHÔNG PHẢI retry payment HOẶC đã quá 10 phút
              const timeSincePending = Date.now() - (pendingData.timestamp || 0);
              const isExpired = timeSincePending > 10 * 60 * 1000; // 10 phút

              if (!pendingData.isRetryPayment || isExpired) {
                console.log('[Checkout] 🧹 CLEARING OLD/EXPIRED PENDING FLAG:', {
                  isRetryPayment: pendingData.isRetryPayment,
                  isExpired,
                  minutesAgo: Math.round(timeSincePending / (1000 * 60))
                });
                await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
                console.log('[Checkout] ✅ OLD PENDING FLAG CLEARED');
              } else {
                console.log('[Checkout] 🔄 KEEPING RETRY PAYMENT FLAG (still fresh):', {
                  minutesAgo: Math.round(timeSincePending / (1000 * 60))
                });
              }
            } catch (parseError) {
              console.log('[Checkout] ❌ ERROR PARSING PENDING FLAG, CLEARING IT:', parseError);
              await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
            }
          } else {
            console.log('[Checkout] ✅ NO OLD PENDING FLAG TO CLEAR');
          }
        } catch (e) {
          console.log('[Checkout] ❌ ERROR CHECKING PENDING FLAG:', e);
        }
      } else {
        console.log('[Checkout] 🔄 NOT NORMAL PURCHASE - KEEPING PENDING FLAG (orderId or payment param exists)');
      }

      // 🟢 Kiểm tra nếu có orderId trong params (thanh toán lại)
      if (params.orderId) {
        try {
          console.log('[Checkout] Loading order for retry payment:', params.orderId);
          const orderResponse = await fetch(`${BASE_URL}/orders/${params.orderId}`);
          if (orderResponse.ok) {
            const orderData = await orderResponse.json();

            // Kiểm tra đơn hàng có phải "Chờ thanh toán" không
            const orderStatus = (orderData.status || '').toLowerCase().trim();
            if (orderStatus === 'chờ thanh toán' || orderStatus === 'waiting payment' || orderStatus === 'pending payment') {
              // Load thông tin từ đơn hàng
              if (orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
                const items = orderData.items.map((item: any) => ({
                  id: item.productId || item._id || item.id,
                  _id: item.productId || item._id || item.id,
                  productId: item.productId || item._id || item.id,
                  name: item.name,
                  size: item.size,
                  color: item.color,
                  qty: item.qty,
                  price: item.price,
                  image: item.image,
                  discountAmount: item.discountAmount || 0,
                  checked: true
                }));

                // Kiểm tra sản phẩm dừng bán
                const hasStopped = await checkStoppedProducts(items);
                if (hasStopped) {
                  return;
                }

                setCart(items);

                // Tính tổng từ items
                const cartTotal = items.reduce((sum: number, i: any) => sum + i.qty * i.price, 0);
                setTotal(cartTotal);

                // Set payment method
                if (orderData.payment === 'zalopay') {
                  setPayment('zalopay');
                }

                // Load voucher nếu có - sử dụng discount từ orderData
                if (orderData.voucherCode) {
                  setVoucherCode(orderData.voucherCode);
                  // Sử dụng discount từ orderData (đã được validate khi tạo đơn)
                  const discount = orderData.discount || 0;
                  setVoucherDiscount(discount);

                  // Thử fetch thông tin voucher để hiển thị (optional)
                  try {
                    const categoryIds = Array.from(new Set(items.map((i: any) => i.categoryId).filter(Boolean)));
                    const voucherResponse = await fetch(`${BASE_URL}/vouchers/check`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        code: orderData.voucherCode,
                        orderAmount: cartTotal,
                        categoryIds
                      })
                    });
                    const voucherData = await voucherResponse.json();
                    if (voucherResponse.ok && voucherData.valid) {
                      setAppliedVoucher({
                        code: voucherData.voucher.code,
                        name: voucherData.voucher.name,
                        description: voucherData.voucher.description || '',
                        discountType: voucherData.voucher.discountType,
                        discountValue: voucherData.voucher.discountValue,
                        maxDiscountAmount: voucherData.voucher.maxDiscountAmount || 0
                      });
                    } else {
                      // Nếu không validate được, vẫn giữ discount từ orderData
                      setAppliedVoucher({
                        code: orderData.voucherCode,
                        name: orderData.voucherCode,
                        description: '',
                        discountType: 'fixed',
                        discountValue: discount,
                        maxDiscountAmount: 0
                      });
                    }
                  } catch (e) {
                    console.log('[Checkout] Error fetching voucher info:', e);
                    // Fallback: sử dụng discount từ orderData
                    setAppliedVoucher({
                      code: orderData.voucherCode,
                      name: orderData.voucherCode,
                      description: '',
                      discountType: 'fixed',
                      discountValue: discount,
                      maxDiscountAmount: 0
                    });
                  }
                }

                // Load address từ đơn hàng
                if (orderData.address) {
                  const addressParts = orderData.address.split('\n');
                  if (addressParts.length >= 2) {
                    const namePhone = addressParts[0].split(' - ');
                    const addr = {
                      name: namePhone[0] || user.name || '',
                      phone: namePhone[1] || '',
                      address: addressParts.slice(1).join('\n')
                    };
                    setAddressObj(addr);
                    setInput(addr);
                  }
                } else {
                  // Fallback: lấy từ AsyncStorage
                  const addressString = await AsyncStorage.getItem(`address_${user._id}`);
                  const addr = addressString ? JSON.parse(addressString) : { name: user.name || '', phone: '', address: '' };
                  setAddressObj(addr);
                  setInput(addr);
                }

                // Lấy voucher khả dụng
                if (cartTotal > 0 && cartTotal <= VOUCHER_MAX_ORDER_AMOUNT) {
                  fetchAvailableVouchers(cartTotal);
                } else {
                  setAvailableVouchers([]);
                }

                return; // Đã load xong từ đơn hàng, không cần load cart nữa
              }
            } else {
              Alert.alert('Thông báo', 'Đơn hàng này không còn ở trạng thái "Chờ thanh toán"');
              router.replace('/orders');
              return;
            }
          }
        } catch (e) {
          console.log('[Checkout] Error loading order:', e);
          Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
          router.replace('/orders');
          return;
        }
      }

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
  }, [checkStoppedProducts, params.orderId]);

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

  // 🟢 Xử lý payment=success param - ĐƠN GIẢN HÓA
  useEffect(() => {
    if (params.payment === 'success') {
      console.log('[Checkout] Payment success param detected, checking payment...');
      // Delay nhỏ để component mount xong
      setTimeout(() => {
        checkPaymentSuccess();
      }, 500);
    }
  }, [params.payment, checkPaymentSuccess]);

  // 🟢 Kiểm tra pending payment khi mount - ĐƠN GIẢN HÓA
  useEffect(() => {
    const checkPendingOnMount = async () => {
      try {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) return;

        // Không check nếu đang retry payment hoặc có payment param
        if (params.orderId || params.payment) return;

        // Chỉ check nếu có pending flag
        const pendingFlagStr = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
        if (pendingFlagStr) {
          console.log('[Checkout] Found pending payment on mount, checking...');
          checkPaymentWithSpinner();
        }
      } catch (error) {
        console.log('[Checkout] Error checking pending on mount:', error);
      }
    };

    checkPendingOnMount();
  }, [params.orderId, params.payment, checkPaymentWithSpinner]);

  // 🟢 Lắng nghe AppState - LUÔN CHECK PENDING FLAG KHI APP ACTIVE
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[Checkout] 🔄 APP BECAME ACTIVE - CHECKING FOR PENDING PAYMENTS');
        setTimeout(async () => {
          try {
            if (!userId) {
              console.log('[Checkout] ❌ No userId, skipping check');
              return;
            }

            // ✅ CHỈ skip nếu đang retry payment NHƯNG chưa mở ZaloPay
            if (params.orderId && !hasOpenedZaloPayRef.current) {
              console.log('[Checkout] 🔄 Retry payment in progress (not opened ZaloPay yet), skipping auto-check');
              return;
            }

            if (params.orderId && hasOpenedZaloPayRef.current) {
              console.log('[Checkout] 🎯 Retry payment + ZaloPay opened - CHECKING PAYMENT STATUS');
            }

            // ✅ LUÔN kiểm tra pending flag khi app active (không cần shouldCheckPayment)
            const pendingFlagStr = await AsyncStorage.getItem(`zalopay_pending_${userId}`);
            console.log('[Checkout] 🔍 APP ACTIVE - PENDING FLAG CHECK:', { hasPendingFlag: !!pendingFlagStr });

            if (pendingFlagStr) {
              console.log('[Checkout] 🎯 FOUND PENDING FLAG ON APP ACTIVE - CHECKING PAYMENT STATUS');
              checkPaymentWithSpinner();
            } else {
              console.log('[Checkout] ✅ NO PENDING FLAG - NO CHECK NEEDED');
            }
          } catch (error) {
            console.log('[Checkout] ❌ ERROR ON APP ACTIVE:', error);
          }
        }, 500);
      }
    });

    return () => subscription.remove();
  }, [userId, params.orderId, checkPaymentWithSpinner]);

  // 🟢 Kiểm tra khi focus - LUÔN CHECK PENDING FLAG
  useFocusEffect(
    React.useCallback(() => {
      const checkOnFocus = async () => {
        try {
          const userString = await AsyncStorage.getItem('user');
          const user = userString ? JSON.parse(userString) : null;
          if (!user || !user._id) {
            console.log('[Checkout] 🔍 FOCUS - No user found');
            return;
          }

          // ✅ CHỈ skip nếu đang retry payment NHƯNG chưa mở ZaloPay
          if (params.orderId && !hasOpenedZaloPayRef.current) {
            console.log('[Checkout] 🔍 FOCUS - Retry payment in progress (not opened ZaloPay yet), skipping auto-check');
            return;
          }

          if (params.orderId && hasOpenedZaloPayRef.current) {
            console.log('[Checkout] 🔍 FOCUS - Retry payment + ZaloPay opened - CHECKING PAYMENT STATUS');
          }

          // ✅ LUÔN kiểm tra pending flag khi focus (không cần shouldCheckPayment)
          const pendingFlagStr = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
          console.log('[Checkout] 🔍 FOCUS - PENDING FLAG CHECK:', { hasPendingFlag: !!pendingFlagStr });

          if (pendingFlagStr) {
            console.log('[Checkout] 🎯 FOUND PENDING FLAG ON FOCUS - CHECKING PAYMENT STATUS');
            checkPaymentWithSpinner();
          } else {
            console.log('[Checkout] ✅ NO PENDING FLAG ON FOCUS - NO CHECK NEEDED');
          }
        } catch (error) {
          console.log('[Checkout] ❌ ERROR ON FOCUS:', error);
        }
      };

      checkOnFocus();
    }, [params.orderId, checkPaymentWithSpinner])
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

    // 🟢 Kiểm tra nếu đang retry payment (có orderId trong params)
    let isRetryPayment = !!params.orderId;
    let backendOrderId = params.orderId || null;
    let backendOrderCode = null;

    if (isRetryPayment) {
      // Update đơn hàng cũ thay vì tạo mới
      try {
        const updateResponse = await fetch(`${BASE_URL}/orders/${params.orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
        if (updateResponse.ok) {
          const data = await updateResponse.json();
          backendOrderId = data?._id || data?.id || params.orderId;
          backendOrderCode = data?.code || null;
          console.log('[Checkout] Order updated for retry payment:', backendOrderId);
        } else {
          console.log('[Checkout] Failed to update order, creating new one');
          // Nếu update thất bại, tạo đơn mới
          isRetryPayment = false;
        }
      } catch (e) {
        console.log('[Checkout] Error updating order:', e);
        // Nếu có lỗi, tạo đơn mới
        isRetryPayment = false;
      }
    }

    // Tạo đơn mới nếu không phải retry hoặc retry thất bại
    if (!isRetryPayment) {
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
          backendOrderCode = data?.code || null;
        }
      } catch (e) {
        console.log('POST /orders failed', e);
      }
    }

    // 🟢 Xử lý AsyncStorage
    // Nếu là retry payment: update đơn hàng cũ trong AsyncStorage
    // Nếu không phải retry và không phải ZaloPay: tạo đơn mới
    // Với ZaloPay (không retry): chỉ lưu khi thanh toán thành công (xử lý trong orders.tsx)
    if (isRetryPayment && backendOrderId) {
      // Update đơn hàng cũ trong AsyncStorage
      const historyKey = `order_history_${user._id}`;
      const historyString = await AsyncStorage.getItem(historyKey);
      let history = historyString ? JSON.parse(historyString) : [];
      history = Array.isArray(history) ? history : [];

      // Tìm và update đơn hàng cũ
      const orderIdStr = String(backendOrderId);
      const orderIndex = history.findIndex((o: any) =>
        (o._id && String(o._id) === orderIdStr) ||
        (o.id && String(o.id) === orderIdStr)
      );

      const updatedOrder = {
        id: backendOrderId,
        _id: backendOrderId,
        items: cart,
        total: finalTotal,
        originalTotal: total,
        discount: voucherDiscount,
        voucherCode: appliedVoucher?.code,
        voucherAppliedAmount: voucherDiscount,
        address: `${addressObj.name} - ${addressObj.phone}\n${addressObj.address}`,
        payment,
        status: payment === 'zalopay' ? 'Chờ thanh toán' : 'Chờ xác nhận',
        createdAt: history[orderIndex]?.createdAt || new Date().toISOString(), // Giữ nguyên createdAt cũ
        shippingDate: history[orderIndex]?.shippingDate || null,
        deliveredDate: history[orderIndex]?.deliveredDate || null,
        cancelledDate: history[orderIndex]?.cancelledDate || null,
        voucher: appliedVoucher?.code ? { code: appliedVoucher.code } : undefined
      };

      if (orderIndex >= 0) {
        // Update đơn hàng cũ
        history[orderIndex] = updatedOrder;
      } else {
        // Nếu không tìm thấy, thêm vào đầu danh sách
        history.unshift(updatedOrder);
      }

      await AsyncStorage.setItem(historyKey, JSON.stringify(history));
    } else if (payment !== 'zalopay') {
      // COD: Nếu là retry payment, đã được xử lý ở trên
      // Nếu không phải retry, tạo đơn mới
      if (!isRetryPayment) {
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
      // Nếu là retry payment COD, đã được update ở trên với status 'Chờ xác nhận'
    }

    // Nếu là ZaloPay, mở trình duyệt thanh toán
    if (payment === 'zalopay') {
      // Lưu flag để kiểm tra khi quay lại
      try {
        const pendingFlagData = {
          orderId: backendOrderId || orderId,
          timestamp: Date.now(),
          isRetryPayment: isRetryPayment // ✅ Đánh dấu nếu là retry payment
        };
        console.log('[Checkout] 💾 CREATING PENDING FLAG:', pendingFlagData);
        await AsyncStorage.setItem(`zalopay_pending_${user._id}`, JSON.stringify(pendingFlagData));
        console.log('[Checkout] ✅ PENDING FLAG CREATED SUCCESSFULLY');
      } catch (e) {
        console.log('[Checkout] ❌ ERROR CREATING PENDING FLAG:', e);
      }

      // Sử dụng backendOrderId nếu có, nếu không dùng orderId local
      const paymentOrderId = String(backendOrderId || orderId);
      // Sử dụng code nếu có, nếu không dùng ID
      const displayOrderCode = String(backendOrderCode || paymentOrderId);
      const orderDescription = `Thanh toan don hang ${displayOrderCode}`;

      // ✅ Đánh dấu đã mở ZaloPay
      hasOpenedZaloPayRef.current = true;
      console.log('[Checkout] 🚀 MARKED AS OPENED ZALOPAY - Will check payment on return');

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
        const remaining = fullCart.filter((i: any) => !i?.checked);
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
  const renderItem = ({ item }: { item: any }) => (
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

                  // ✅ Xóa pending flag khi đóng dialog
                  try {
                    const userString = await AsyncStorage.getItem('user');
                    const user = userString ? JSON.parse(userString) : null;
                    if (user && user._id) {
                      await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
                      console.log('✅ Cleared pending flag on dialog close');
                    }
                  } catch (e) {
                    console.error('Error clearing pending flag:', e);
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

                  // ✅ Xóa pending flag khi đóng dialog
                  try {
                    const userString = await AsyncStorage.getItem('user');
                    const user = userString ? JSON.parse(userString) : null;
                    if (user && user._id) {
                      await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
                      console.log('✅ Cleared pending flag on dialog close');
                    }
                  } catch (e) {
                    console.error('Error clearing pending flag:', e);
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

      {showPaymentLoading && (
        <View style={styles.zaloLoadingOverlay}>
          <View style={styles.zaloLoadingCard}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.zaloLoadingText}>Đang xác minh thanh toán ZaloPay...</Text>
          </View>
        </View>
      )}
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
  successButtonText: { color: '#4084f4', fontWeight: 'bold', fontSize: 14 },
  zaloLoadingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  zaloLoadingCard: { backgroundColor: '#111827', borderRadius: 16, paddingVertical: 24, paddingHorizontal: 28, alignItems: 'center', width: '80%', maxWidth: 340 },
  zaloLoadingText: { color: '#fff', marginTop: 12, fontWeight: '600', textAlign: 'center' }
});
