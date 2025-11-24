import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

type Address = { id: string; name: string; phone: string; address: string };

export default function AddressBookScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Address>({ id: '', name: '', phone: '', address: '' });

  useEffect(() => {
    const load = async () => {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user || !user._id) {
        router.back();
        return;
      }
      setUserId(user._id);
      const listStr = await AsyncStorage.getItem(`addresses_${user._id}`);
      const list = listStr ? JSON.parse(listStr) : [];
      setAddresses(Array.isArray(list) ? list : []);
    };
    load();
  }, []);

  const openAdd = () => {
    setForm({ id: '', name: '', phone: '', address: '' });
    setShowModal(true);
  };

  const saveAddress = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ Tên, Số điện thoại, Địa chỉ');
      return;
    }
    const newItem: Address = { ...form, id: String(Date.now()) };
    const next = [newItem, ...addresses];
    setAddresses(next);
    await AsyncStorage.setItem(`addresses_${userId}`, JSON.stringify(next));
    setShowModal(false);
  };

  const remove = async (id: string) => {
    const next = addresses.filter(a => a.id !== id);
    setAddresses(next);
    await AsyncStorage.setItem(`addresses_${userId}`, JSON.stringify(next));
  };

  const select = async (addr: Address) => {
    await AsyncStorage.setItem(`address_${userId}`, JSON.stringify({ name: addr.name, phone: addr.phone, address: addr.address }));
    router.back();
  };

  const renderItem = ({ item }: { item: Address }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
        <Text style={styles.address}>{item.address}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'center', minWidth: 80 }}>
        <TouchableOpacity onPress={() => select(item)} style={[styles.btn, styles.primary, { width: '100%' }]}>
          <Text style={styles.btnTxt}>Chọn</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => remove(item.id)} style={[styles.btn, styles.danger, { marginTop: 6, width: '100%' }]}>
          <Text style={styles.btnTxt}>Xoá</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f7f9' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sổ địa chỉ</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888' }}>Chưa có địa chỉ nào</Text>}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Thêm địa chỉ</Text>
            <TextInput style={styles.input} placeholder="Tên người nhận" value={form.name} onChangeText={t => setForm(s => ({ ...s, name: t }))} />
            <TextInput style={styles.input} placeholder="Số điện thoại" value={form.phone} onChangeText={t => setForm(s => ({ ...s, phone: t }))} keyboardType="phone-pad" />
            <TextInput style={[styles.input, { height: 90 }]} multiline placeholder="Địa chỉ" value={form.address} onChangeText={t => setForm(s => ({ ...s, address: t }))} />
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#eee', marginRight: 8 }]} onPress={() => setShowModal(false)}>
                <Text style={{ color: '#333', fontWeight: 'bold' }}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ff4757' }]} onPress={saveAddress}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  addBtn: { backgroundColor: '#ff4757', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  name: { fontWeight: 'bold', color: '#222' },
  phone: { color: '#333', marginTop: 2 },
  address: { color: '#444', marginTop: 4 },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7 },
  primary: { backgroundColor: '#2563eb' },
  danger: { backgroundColor: '#ef4444' },
  btnTxt: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { width: '87%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fafaff' },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 8 }
});


