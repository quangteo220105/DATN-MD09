import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { BASE_URL, DOMAIN } from '../config/apiConfig';
import { Ionicons } from '@expo/vector-icons';

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('favorites');
      const arr = saved ? JSON.parse(saved) : [];
      setFavorites(new Set(Array.isArray(arr) ? arr : []));
    } catch { }
  };

  const loadProducts = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/products`);
      const list = Array.isArray(res.data) ? res.data : [];
      setProducts(list);
    } catch { }
  };

  useEffect(() => {
    loadFavorites();
    loadProducts();
  }, []);

  // ✅ Reload favorites mỗi khi màn hình được focus (để đồng bộ với home.tsx)
  useFocusEffect(
    React.useCallback(() => {
      loadFavorites();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFavorites(), loadProducts()]);
    setRefreshing(false);
  };

  const data = useMemo(() => products.filter(p => favorites.has(p._id)), [products, favorites]);

  const removeFromFavorites = async (id: string) => {
    const next = new Set(favorites);
    next.delete(id);
    setFavorites(next);
    await AsyncStorage.setItem('favorites', JSON.stringify(Array.from(next)));
  };

  const renderItem = ({ item }: any) => {
    const mainVariant = item.variants?.[0];
    const img = mainVariant?.image ? `${DOMAIN}${mainVariant.image}` : '';
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/product/${item._id}` as any)}>
        <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
        <View style={styles.info}>
          <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
          {!!mainVariant?.currentPrice && (
            <Text style={styles.price}>{Number(mainVariant.currentPrice).toLocaleString('vi-VN')} VND</Text>
          )}
        </View>
        <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromFavorites(item._id)}>
          <Ionicons name="heart-dislike" size={20} color="#ff4757" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push('/(tabs)/home')}
        >
          <Ionicons name="arrow-back" size={22} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yêu thích</Text>
        <Text style={styles.headerCount}>{data.length} sản phẩm</Text>
      </View>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={data}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có sản phẩm yêu thích.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  headerCount: { marginTop: 0, color: '#666' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#eee' },
  image: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#f2f2f2' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#222' },
  price: { marginTop: 6, color: '#0ea5e9', fontWeight: '700' },
  removeBtn: { padding: 8 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 }
});
