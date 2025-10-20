import React, { useState, useMemo, useEffect, useRef, useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Image,
    FlatList,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BASE_URL } from "../../config/apiConfig";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get("window");
const ITEM_MARGIN = 8; // khoảng cách giữa 2 cột
const ITEM_PADDING = 20; // khoảng cách từ mép màn hình (tăng từ 16 lên 20)
const ITEM_WIDTH = (width - ITEM_PADDING * 2 - ITEM_MARGIN) / 2; // width mỗi item


type BannerType = { _id: string; image: string };

export const options = {
    tabBarStyle: { display: 'none' },
};

export default function HomeScreen() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [brand, setBrand] = useState("Tất cả");
    const [favorites, setFavorites] = useState(new Set<string>());
    const [categories, setCategories] = useState([{ name: "Tất cả", id: "all" }]);
    const [loading, setLoading] = useState(false);
    const [loadingBanner, setLoadingBanner] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [banners, setBanners] = useState<BannerType[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const bannerRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Lấy thông tin user từ AsyncStorage
    const fetchUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setUser(user);
                console.log('User loaded from AsyncStorage:', user);
            } else {
                console.log('No user data found in AsyncStorage');
            }
        } catch (error) {
            console.log("Lỗi lấy thông tin user từ AsyncStorage:", (error as Error).message);
        }
    };

    useEffect(() => {
        console.log('User changed:', user);
    }, [user]);

    // Tự động cập nhật user data mỗi khi Home screen được focus
    useFocusEffect(
        React.useCallback(() => {
            console.log('Home screen focused, fetching user data...');
            fetchUser();
        }, [])
    );



    // Load favorites từ AsyncStorage
    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const savedFavorites = await AsyncStorage.getItem('favorites');
                if (savedFavorites) {
                    const favoritesArray = JSON.parse(savedFavorites);
                    setFavorites(new Set(favoritesArray));
                }
            } catch (error) {
                console.log('Lỗi load favorites:', error);
            }
        };
        loadFavorites();
    }, []);

    // Lấy danh mục
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${BASE_URL}/categories`);
                const data = res.data.map((c: any, i: number) => ({ name: c.name, id: c._id }));
                setCategories([{ name: "Tất cả", id: "all" }, ...data]);
            } catch (error) {
                console.log("Lỗi lấy danh mục:", (error as Error).message);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
        fetchUser();
    }, []);

    // Lấy banner
    const fetchBanners = async () => {
        try {
            setLoadingBanner(true);
            const res = await axios.get(`${BASE_URL}/banners`);
            const formatted: BannerType[] = res.data.map((b: any) => ({
                _id: b._id,
                image: `${BASE_URL.replace("/api", "")}${b.image}`,
            }));
            setBanners(formatted);
        } catch (error) {
            console.log("Lỗi lấy banner:", (error as Error).message);
        } finally {
            setLoadingBanner(false);
        }
    };

    // Lấy sản phẩm
    const fetchProducts = async () => {
        try {
            setLoadingProducts(true);
            const res = await axios.get(`${BASE_URL}/products`);
            setProducts(res.data);
        } catch (error) {
            console.log("Lỗi lấy sản phẩm:", (error as Error).message);
        } finally {
            setLoadingProducts(false);
        }
    };

    useEffect(() => {
        fetchBanners();
        fetchProducts();
    }, []);

    // Pull to refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchBanners(), fetchProducts(), fetchUser()]);
        setRefreshing(false);
    };

    // Auto slide banner
    useEffect(() => {
        if (banners.length === 0) return;

        const bannerWidth = width - 40; // Trừ đi padding
        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                const next = (prev + 1) % banners.length;
                bannerRef.current?.scrollToOffset({
                    offset: next * bannerWidth,
                    animated: true,
                });
                return next;
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [banners]);

    // Lọc sản phẩm theo search & brand
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const selectedCategory = categories.find(c => c.name === brand);

        return products.filter((p) => {
            // ✅ Chỉ hiển thị sản phẩm đang bán (isActive = true)
            // Sản phẩm đã ngừng bán sẽ không xuất hiện ở Home
            if (!p.isActive) return false;

            // Lọc theo danh mục
            if (brand !== "Tất cả" && selectedCategory && selectedCategory.id !== "all") {
                if (p.categoryId !== selectedCategory.id) return false;
            }

            // Lọc theo tìm kiếm
            if (!q) return true;
            return p.name.toLowerCase().includes(q);
        });
    }, [query, brand, products, categories]);

    const toggleFav = async (id: string) => {
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            // Lưu favorites vào AsyncStorage
            AsyncStorage.setItem('favorites', JSON.stringify(Array.from(next)));

            return next;
        });
    };

    const renderProduct = ({ item, index }: any) => {
        const mainVariant = item.variants[0];
        const totalStock = item.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
        const isFavorite = favorites.has(item._id);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    console.log('Navigating to product:', item._id);
                    router.push(`/product/${item._id}` as any);
                }}
            >
                <View style={styles.imageWrap}>
                    <Image
                        source={{ uri: `http://192.168.1.9:3000${mainVariant.image}` }}
                        style={styles.productImage}
                        resizeMode="cover"
                        onError={(error) => {
                            console.log('Home image load error:', error);
                            console.log('Failed to load image:', `http://192.168.1.9:3000${mainVariant.image}`);
                        }}
                        onLoad={() => {
                            console.log('Home image loaded successfully:', `http://192.168.1.9:3000${mainVariant.image}`);
                        }}
                    />
                    {/* Favorite Button */}
                    <TouchableOpacity
                        style={styles.favoriteBtn}
                        onPress={(e) => {
                            e.stopPropagation();
                            toggleFav(item._id);
                        }}
                    >
                        <Ionicons
                            name={isFavorite ? "heart" : "heart-outline"}
                            size={20}
                            color={isFavorite ? "#ff4757" : "#666"}
                        />
                    </TouchableOpacity>
                </View>
                <View style={styles.productInfo}>
                    <Text numberOfLines={2} style={styles.productName}>{item.name}</Text>
                    <Text style={styles.soldText}>Số lượng còn {totalStock}</Text>
                    <Text style={styles.price}>{mainVariant.currentPrice.toLocaleString('vi-VN')} VND</Text>
                </View>
            </TouchableOpacity>
        );
    };


    const renderBanner = () => {
        const bannerWidth = width - 40; // Trừ đi padding (20px mỗi bên)
        const bannerHeight = 180; // Chiều cao cố định

        return (
            <View style={styles.bannerContainer}>
                <FlatList
                    ref={bannerRef}
                    data={banners}
                    horizontal
                    pagingEnabled
                    snapToAlignment="center"
                    snapToInterval={bannerWidth}
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item, index) => item._id ? item._id : index.toString()}
                    onScroll={(e) => {
                        const index = Math.round(e.nativeEvent.contentOffset.x / bannerWidth);
                        setCurrentIndex(index);
                    }}
                    renderItem={({ item }) => (
                        <View style={{ width: bannerWidth }}>
                            <Image
                                source={{ uri: item.image }}
                                style={[styles.bannerImage, { width: bannerWidth, height: bannerHeight }]}
                                resizeMode="cover"
                            />
                        </View>
                    )}
                />
                {/* Indicator */}
                <View style={styles.indicatorWrap}>
                    {banners.map((_, i) => (
                        <View key={i} style={[styles.indicator, { opacity: i === currentIndex ? 1 : 0.3 }]} />
                    ))}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={filtered}
                keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
                renderItem={renderProduct}
                numColumns={2}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListHeaderComponent={
                    <>
                        {/* User Info Section */}
                        <View style={styles.userInfoSection}>
                            <View style={styles.userInfoRow}>
                                <View style={styles.userInfoLeft}>
                                    {user?.avatar ? (
                                        <Image
                                            source={{ uri: `${BASE_URL.replace("/api", "")}${user.avatar}` }}
                                            style={styles.avatar}
                                        />
                                    ) : (
                                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                            <Ionicons name="person" size={20} color="#666" />
                                        </View>
                                    )}
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.greetSmall}>Chào 👋</Text>
                                        <Text style={styles.greetName}>{user?.name || "Guest"}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.bellBtn}>
                                    <Ionicons name="notifications-outline" size={22} color="#222" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Search Section */}
                        <View style={styles.searchSection}>
                            <View style={styles.searchRow}>
                                <View style={styles.searchBox}>
                                    <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
                                    <TextInput
                                        placeholder="Tìm kiếm sản phẩm..."
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
                        </View>

                        {/* Banner Section */}
                        <View style={styles.bannerSection}>
                            {loadingBanner ? (
                                <View style={styles.bannerLoading}>
                                    <ActivityIndicator size="small" color="#000" />
                                </View>
                            ) : (
                                renderBanner()
                            )}
                        </View>

                        {/* Categories Section */}
                        <View style={styles.categoriesSection}>
                            <Text style={styles.sectionTitle}>Danh mục sản phẩm</Text>
                            {loading ? (
                                <View style={styles.categoriesLoading}>
                                    <ActivityIndicator size="small" color="#000" />
                                </View>
                            ) : (
                                <View style={styles.brandsRow}>
                                    {categories.map((category, i) => (
                                        <TouchableOpacity
                                            key={`${category.id}-${i}`}
                                            style={[styles.brandChip, brand === category.name && styles.brandChipActive]}
                                            onPress={() => setBrand(category.name)}
                                        >
                                            <Text style={[styles.brandText, brand === category.name && styles.brandTextActive]}>{category.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Products Section */}
                        <View style={styles.productsSection}>
                            <View style={styles.productsHeader}>
                                <Text style={styles.sectionTitle}>Sản phẩm nổi bật</Text>
                                {favorites.size > 0 && (
                                    <View style={styles.favoriteCount}>
                                        <Ionicons name="heart" size={16} color="#ff4757" />
                                        <Text style={styles.favoriteCountText}>{favorites.size}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </>
                }
            />
            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <Ionicons name="home" size={22} color="black" />
                <Ionicons name="heart-outline" size={22} color="gray" />
                <Ionicons name="cart-outline" size={22} color="gray" />
                <Ionicons name="person-outline" size={22} color="gray" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    contentContainer: {
        paddingHorizontal: ITEM_PADDING,
        paddingTop: 0,
        paddingBottom: 100,
        backgroundColor: "#f8f9fa"
    },
    row: {
        justifyContent: "space-between",
        marginBottom: ITEM_MARGIN
    },
    userInfoSection: {
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
        backgroundColor: "#fff"
    },
    userInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    userInfoLeft: {
        flexDirection: "row",
        alignItems: "center"
    },
    avatar: { width: 45, height: 45, borderRadius: 22.5 },
    avatarPlaceholder: {
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center"
    },
    greetSmall: { fontSize: 14, color: "#666", marginBottom: 2 },
    greetName: { fontSize: 18, fontWeight: "bold", color: "#222" },
    bellBtn: {
        padding: 10,
        backgroundColor: "#f8f8f8",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    searchSection: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: "#fff"
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12
    },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    searchInput: {
        flex: 1,
        height: 20,
        fontSize: 16,
        color: "#333"
    },
    filterBtn: {
        backgroundColor: "#222",
        padding: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3
    },
    bannerSection: {
        paddingHorizontal: 20,
        paddingBottom: 25,
        backgroundColor: "#fff"
    },
    bannerLoading: {
        height: 200,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        marginHorizontal: 0
    },
    categoriesSection: {
        paddingHorizontal: 20,
        paddingBottom: 25,
        backgroundColor: "#fff"
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#222",
        marginBottom: 15,
        marginTop: 5
    },
    categoriesLoading: {
        height: 50,
        justifyContent: "center",
        alignItems: "center"
    },
    productsSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        backgroundColor: "#f8f9fa"
    },
    productsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5
    },
    favoriteCount: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ff4757"
    },
    favoriteCountText: {
        marginLeft: 4,
        fontSize: 12,
        fontWeight: "600",
        color: "#ff4757"
    },
    bannerContainer: {
        alignItems: "center",
        justifyContent: "center"
    },
    bannerImage: {
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6
    },
    indicatorWrap: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 15,
        position: "absolute",
        bottom: 20,
        width: "100%"
    },
    indicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#fff",
        marginHorizontal: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
        elevation: 3
    },
    brandsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: 0,
        marginTop: 0,
        gap: 8
    },
    brandChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#f8f9fa",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#e9ecef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    brandChipActive: {
        backgroundColor: "#222",
        borderColor: "#222",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3
    },
    brandText: {
        color: "#666",
        fontSize: 14,
        fontWeight: "500"
    },
    brandTextActive: {
        color: "#fff",
        fontWeight: "600"
    },
    card: {
        width: ITEM_WIDTH,
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#f0f0f0"
    },
    imageWrap: {
        width: "100%",
        aspectRatio: 1, // ảnh vuông
        position: "relative"
    },
    productImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    favoriteBtn: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 20,
        padding: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    productInfo: {
        padding: 12,
    },
    productName: {
        fontWeight: "600",
        fontSize: 15,
        marginBottom: 6,
        lineHeight: 20,
        color: "#222"
    },
    soldText: {
        color: "#666",
        fontSize: 12,
        marginBottom: 6,
        fontWeight: "500"
    },
    price: {
        fontWeight: "bold",
        fontSize: 16,
        color: "#222"
    },
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        height: 56,
        borderTopWidth: 1,
        borderTopColor: "#eee"
    },
});
