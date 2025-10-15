import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    Image,
    FlatList,
    Dimensions,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BASE_URL } from '../../config/apiConfig';

const { width } = Dimensions.get('window');
const ITEM_MARGIN = 12;
const ITEM_WIDTH = (width - 32 - ITEM_MARGIN) / 2;

const PRODUCTS = [
    {
        id: '1',
        name: 'K-Swiss Vista Trainer',
        price: 85.0,
        rating: 4.5,
        sold: 8374,
        image: require('../../assets/images/logo.png.png'),
    },
    {
        id: '2',
        name: 'RS-X Women Sneaker',
        price: 110.0,
        rating: 4.7,
        sold: 7483,
        image: require('../../assets/images/logo.png.png'),
    },
    {
        id: '3',
        name: 'White Classic',
        price: 72.0,
        rating: 4.3,
        sold: 2291,
        image: require('../../assets/images/logo.png.png'),
    },
    {
        id: '4',
        name: 'Sport Runner',
        price: 99.0,
        rating: 4.6,
        sold: 4120,
        image: require('../../assets/images/logo.png.png'),
    },
];

export default function HomeScreen() {
    const [query, setQuery] = useState('');
    const [brand, setBrand] = useState('Tất cả');
    const [favorites, setFavorites] = useState(new Set());
    const [categories, setCategories] = useState<string[]>(['Tất cả']);
    const [loading, setLoading] = useState(false);

    // 🧩 Lấy danh mục
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${BASE_URL}/categories`);
                const data = res.data.map((c: any) => c.name);
                setCategories(['Tất cả', ...data]);
            } catch (error: any) {
                console.log('Lỗi lấy danh mục:', error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    // 🧩 Lấy banner từ MongoDB
    const [banners, setBanners] = useState<any[]>([]);
    const [loadingBanner, setLoadingBanner] = useState(false);
    const scrollRef = React.useRef<any>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                setLoadingBanner(true);
                const res = await axios.get(`${BASE_URL}/banners`);
                setBanners(res.data);
            } catch (error: any) {
                console.log('Lỗi lấy banner:', error.message);
            } finally {
                setLoadingBanner(false);
            }
        };
        fetchBanners();
    }, []);

    useEffect(() => {
        if (banners.length === 0) return;
        const interval = setInterval(() => {
            const nextIndex = (currentIndex + 1) % banners.length;
            setCurrentIndex(nextIndex);
            scrollRef.current?.scrollTo({
                x: nextIndex * (width - 32 + 10), // +10 = khoảng cách giữa banner
                animated: true,
            });
        }, 3000); // ⏱ đổi slide mỗi 3 giây

        return () => clearInterval(interval);
    }, [currentIndex, banners]);

    // 🔍 Lọc sản phẩm
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return PRODUCTS.filter((p) => {
            if (brand !== 'Tất cả' && !p.name.toLowerCase().includes(brand.toLowerCase()))
                return false;
            if (!q) return true;
            return p.name.toLowerCase().includes(q);
        });
    }, [query, brand]);

    const toggleFav = (id: string) => {
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const renderProduct = ({ item }: any) => (
        <View style={styles.card}>
            <View style={styles.imageWrap}>
                <Image source={item.image} style={styles.productImage} />
                <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => toggleFav(item.id)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={favorites.has(item.id) ? 'heart' : 'heart-outline'}
                        size={18}
                        color={favorites.has(item.id) ? '#ff4d4f' : '#222'}
                    />
                </TouchableOpacity>
            </View>

            <Text numberOfLines={1} style={styles.productName}>
                {item.name}
            </Text>

            <View style={styles.row}>
                <Ionicons name="star" size={14} color="#f2c94c" />
                <Text style={styles.ratingText}>{item.rating}</Text>
                <Text style={styles.soldText}> · {item.sold.toLocaleString()} sold</Text>
            </View>

            <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Image source={require('../../assets/images/logo.png.png')} style={styles.avatar} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.greetSmall}>Good Morning 👋</Text>
                            <Text style={styles.greetName}>Andrew Ainsley</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.bellBtn}>
                        <Ionicons name="notifications-outline" size={22} color="#222" />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
                        <TextInput
                            placeholder="Tìm kiếm"
                            value={query}
                            onChangeText={setQuery}
                            style={styles.searchInput}
                            placeholderTextColor="#999"
                        />
                        <Ionicons name="mic-outline" size={18} color="#888" style={{ marginLeft: 8 }} />
                    </View>
                    <TouchableOpacity style={styles.filterBtn}>
                        <Ionicons name="options" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* 🧩 Banner từ MongoDB */}
                {/* 🖼 Banner từ MongoDB (URL online) */}
                {/* 🧩 Banner slideshow từ MongoDB */}
                {loadingBanner ? (
                    <ActivityIndicator size="small" color="#000" style={{ marginVertical: 10 }} />
                ) : banners.length > 0 ? (
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onScroll={(e) => {
                            const x = e.nativeEvent.contentOffset.x;
                            const index = Math.round(x / (width - 32 + 10));
                            setCurrentIndex(index);
                        }}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    >
                        {banners.map((item) => (
                            <View key={item._id} style={[styles.bannerWrap, { marginRight: 10 }]}>
                                <Image
                                    source={{ uri: item.image }}
                                    style={styles.bannerImage}
                                    resizeMode="cover"
                                />
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <Text style={{ textAlign: "center", color: "#555", marginVertical: 10 }}>
                        Không có banner nào
                    </Text>
                )}


                {/* Danh mục */}
                {loading ? (
                    <ActivityIndicator size="small" color="#000" style={{ marginBottom: 10 }} />
                ) : (
                    <View style={styles.brandsRow}>
                        {categories.map((b) => (
                            <TouchableOpacity
                                key={b}
                                style={[styles.brandChip, brand === b && styles.brandChipActive]}
                                onPress={() => setBrand(b)}
                            >
                                <Text style={[styles.brandText, brand === b && styles.brandTextActive]}>{b}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Products grid */}
                <FlatList
                    contentContainerStyle={{ paddingBottom: 100 }}
                    data={filtered}
                    keyExtractor={(i) => i.id}
                    renderItem={renderProduct}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: ITEM_MARGIN }}
                    showsVerticalScrollIndicator={false}
                />

                {/* Bottom Nav */}
                <View style={styles.bottomNav}>
                    <Ionicons name="home" size={22} color="black" />
                    <Ionicons name="heart-outline" size={22} color="gray" />
                    <Ionicons name="cart-outline" size={22} color="gray" />
                    <Ionicons name="person-outline" size={22} color="gray" />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    greetSmall: { fontSize: 12, color: '#777' },
    greetName: { fontSize: 16, color: '#111', fontWeight: '700' },
    bellBtn: { backgroundColor: '#fff', padding: 8, borderRadius: 12, elevation: 2 },

    searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f7f7f7',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    searchInput: { flex: 1, fontSize: 15, color: '#222' },
    filterBtn: {
        width: 44,
        height: 44,
        backgroundColor: '#111',
        marginLeft: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    bannerWrap: {
        marginBottom: 14,
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
        width: width - 32,
        height: (width - 40) * 0.55,
    },
    bannerImage: { width: '100%', height: 120, resizeMode: 'cover' },
    bannerTextWrap: {
        position: 'absolute',
        left: 16,
        top: 18,
        right: 16,
    },
    bannerPct: { color: '#fff', fontSize: 28, fontWeight: '800' },
    bannerTitle: { color: '#fff', fontSize: 18, marginTop: 6, fontWeight: '700' },
    bannerSub: { color: '#fff', marginTop: 6, fontSize: 12, opacity: 0.95 },

    brandsRow: { flexDirection: 'row', marginBottom: 12 },
    brandChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#eee',
        marginRight: 8,
        backgroundColor: '#fff',
        elevation: 1,
    },
    brandChipActive: {
        backgroundColor: '#fff',
        borderColor: '#111',
    },
    brandText: { color: '#333' },
    brandTextActive: { color: '#111', fontWeight: '700' },

    card: {
        width: ITEM_WIDTH,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    imageWrap: {
        width: '100%',
        height: ITEM_WIDTH - 10,
        borderRadius: 10,
        backgroundColor: '#f8f8f8',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        position: 'relative',
    },
    productImage: {
        width: '90%',
        height: '90%',
        resizeMode: 'contain',
    },
    heartBtn: {
        position: 'absolute',
        right: 8,
        top: 8,
        backgroundColor: '#fff',
        padding: 6,
        borderRadius: 999,
        elevation: 2,
    },

    productName: { fontSize: 14, color: '#111', fontWeight: '700', marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center' },
    ratingText: { marginLeft: 6, color: '#444', fontWeight: '700' },
    soldText: { color: '#888', marginLeft: 4, fontSize: 12 },
    price: { marginTop: 8, fontSize: 16, fontWeight: '800', color: '#111' },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 12,
        borderTopWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#fff",
    },
});
