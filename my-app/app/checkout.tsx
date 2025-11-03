import React, { useEffect, useState } from 'react';
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
  KeyboardAvoidingView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DOMAIN, BASE_URL } from '../config/apiConfig';

const PAYMENT_METHODS = [
  { key: 'cod', label: 'Thanh toán khi nhận hàng (COD)' },
  { key: 'momo', label: 'Momo' },
  { key: 'vnpay', label: 'VNPay' },
];

export default function CheckoutScreen() {
  const router = useRouter();

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

      // Lấy address
      const addressString = await AsyncStorage.getItem(`address_${user._id}`);
      let addr = addressString ? JSON.parse(addressString) : { name: user.name || '', phone: '', address: '' };
      setAddressObj(addr);
      setInput(addr);

      // Lấy cart đã chọn
      const cartKey = `cart_${user._id}`;
      const cartString = await AsyncStorage.getItem(cartKey);
      let items = cartString ? JSON.parse(cartString) : [];
      items = Array.isArray(items) ? items.filter(i => i.checked) : [];

      // ✅ Thêm discountAmount mặc định = 0
      items = items.map(i => ({ ...i, discountAmount: 0 }));

      setCart(items);

      const cartTotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
      setTotal(cartTotal);

      // Lấy voucher khả dụng
      if (cartTotal > 0) fetchAvailableVouchers(cartTotal);
    };
    fetchData();
  }, []);

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
    if (orderAmount <= 0) return;
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
    const cartTotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);
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

    const cartTotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);
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
    if (cartTotal > 0) fetchAvailableVouchers(cartTotal);
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

    const historyKey = `order_history_${user._id}`;
    const historyString = await AsyncStorage.getItem(historyKey);
    let history = historyString ? JSON.parse(historyString) : [];
    history = Array.isArray(history) ? history : [];

    const finalTotal = total - voucherDiscount;

    const newOrder = {
      id: Date.now(),
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

    // Tạo đơn lên backend
    try {
      await fetch(`${BASE_URL}/orders`, {
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
            image: i.image
          })),
          total: finalTotal,
          voucherCode: appliedVoucher?.code || null,
          discount: voucherDiscount,
          address: `${addressObj.name} - ${addressObj.phone}\n${addressObj.address}`,
          payment,
          status: 'Chờ xác nhận',
        })
      });
    } catch (e) {
      console.log('POST /orders failed, fallback local only', e);
    }

    // Xoá sản phẩm đã thanh toán khỏi giỏ
    try {
      const fullCartStr = await AsyncStorage.getItem(`cart_${user._id}`);
      let fullCart = fullCartStr ? JSON.parse(fullCartStr) : [];
      fullCart = Array.isArray(fullCart) ? fullCart : [];
      const remaining = fullCart.filter(i => !i?.checked);
      await AsyncStorage.setItem(`cart_${user._id}`, JSON.stringify(remaining));
    } catch { }

    // Reset voucher
    setAppliedVoucher(null);
    setVoucherDiscount(0);
    setVoucherCode('');

    Alert.alert('Thành công', 'Đơn hàng đã được đặt!', [
      { text: 'Xem trạng thái', onPress: () => router.replace('/orders') },
      { text: 'Quay về Home', onPress: () => router.replace('/(tabs)/home'), style: 'cancel' },
    ]);
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
            <TouchableOpacity onPress={openAddressModal}>
              <Text style={{ color: '#4084f4', fontWeight: 'bold' }}>Sửa</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Voucher */}
        <View style={styles.section}>
          <Text style={styles.heading}>Voucher / Mã giảm giá</Text>
          {appliedVoucher ? (
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
  voucherItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }
});
