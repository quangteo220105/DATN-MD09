import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Image, ScrollView, Platform, TextInput, Modal, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DOMAIN } from '../config/apiConfig';

const PAYMENT_METHODS = [
  { key: 'cod', label: 'Thanh toán khi nhận hàng (COD)' },
  { key: 'momo', label: 'Momo' },
  { key: 'vnpay', label: 'VNPay' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [addressObj, setAddressObj] = useState({ name: '', phone: '', address: '' });
  const [payment, setPayment] = useState('cod');
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [input, setInput] = useState({ name: '', phone: '', address: '' });
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) {
        router.push('/(tabs)/login');
        return;
      }
      setUserId(user._id);
      // Lấy address riêng từng user
      const addressString = await AsyncStorage.getItem(`address_${user._id}`);
      let addr = addressString ? JSON.parse(addressString) : null;
      if (!addr) {
        addr = { name: user.name || '', phone: '', address: '' };
      }
      setAddressObj(addr);
      setInput(addr);
      // Lấy cart
      const cartKey = `cart_${user._id}`;
      const cartString = await AsyncStorage.getItem(cartKey);
      let items = cartString ? JSON.parse(cartString) : [];
      items = Array.isArray(items) ? items.filter((item) => item.checked) : [];
      setCart(items);
      setTotal(items.reduce((sum, i) => sum + i.qty * i.price, 0));
    };
    fetchData();
  }, []);

  const openAddressModal = () => {
    setInput(addressObj);
    setShowModal(true);
  };
  const saveAddress = async () => {
    setShowModal(false);
    setAddressObj(input);
    if (userId)
      await AsyncStorage.setItem(`address_${userId}`, JSON.stringify(input));
  };

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
    const newOrder = {
      id: Date.now(),
      items: cart,
      total,
      address: `${addressObj.name} - ${addressObj.phone}\n${addressObj.address}`,
      payment,
      status: 'Đang xử lý',
      createdAt: new Date().toISOString()
    };
    history.unshift(newOrder);
    await AsyncStorage.setItem(historyKey, JSON.stringify(history));
    await AsyncStorage.setItem(`cart_${user._id}`, '[]');
    Alert.alert('Thành công', 'Đơn hàng đã được đặt!', [
      {
        text: 'Xem lịch sử',
        onPress: () => router.replace('/history'),
      },
      {
        text: 'Quay về Home',
        onPress: () => router.replace('/(tabs)/home'),
        style: 'cancel',
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <Image source={{ uri: `${DOMAIN}${item.image}` }} style={styles.productImage} />
      <View style={{ flex: 1 }}>
        <Text>{item.name} ({item.size}, {item.color}) x{item.qty}</Text>
        <Text style={{ fontWeight: 'bold', color: '#222' }}>{(item.price * item.qty).toLocaleString('vi-VN')} VND</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
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
                  <Text style={{ fontWeight: 'bold', color: '#222' }}>{(item.price * item.qty).toLocaleString('vi-VN')} VND</Text>
                </View>
              </View>
            ))
          )}
        </View>
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
        <View style={styles.section}>
          <Text style={styles.heading}>Tổng cộng</Text>
          <Text style={styles.totalTxt}>{total.toLocaleString('vi-VN')} VND</Text>
        </View>
      </ScrollView>
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
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.18)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '87%', backgroundColor: '#fff', borderRadius: 12, padding: 18, elevation: 8 },
  input: { borderColor: '#eee', borderWidth: 1, borderRadius: 7, marginBottom: 11, padding: 10, fontSize: 15, backgroundColor: '#fafaff' }
});
