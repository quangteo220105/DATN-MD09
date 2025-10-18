import React, { useState, useMemo, useEffect, useRef } from "react";
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

const { width } = Dimensions.get("window");
const ITEM_MARGIN = 8; // khoảng cách giữa 2 cột
const ITEM_PADDING = 20; // khoảng cách từ mép màn hình (tăng từ 16 lên 20)
const ITEM_WIDTH = (width - ITEM_PADDING * 2 - ITEM_MARGIN) / 2; // width mỗi item

type BannerType = { _id: string; image: string };

export default function HomeScreen() {
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
    const bannerRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

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
        await Promise.all([fetchBanners(), fetchProducts()]);
        setRefreshing(false);
    };

    // Auto slide banner
    useEffect(() => {
        if (banners.length === 0) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                const next = (prev + 1) % banners.length;
                bannerRef.current?.scrollToOffset({
                    offset: next * width,
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
            // Lọc theo danh mục
            if (brand !== "Tất cả" && selectedCategory && selectedCategory.id !== "all") {
                if (p.categoryId !== selectedCategory.id) return false;
            }

            // Lọc theo tìm kiếm
            if (!q) return true;
            return p.name.toLowerCase().includes(q);
        });
    }, [query, brand, products, categories]);

    const toggleFav = (id: string) => {
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const renderProduct = ({ item, index }: any) => {
        const mainVariant = item.variants[0];
        const totalStock = item.variants.reduce((sum: number, v: any) => sum + v.stock, 0);

        return (
            <View style={styles.card}>
                <View style={styles.imageWrap}>
                    <Image
                        source={{ uri: `${BASE_URL.replace("/api", "")}${mainVariant.image}` }}
                        style={styles.productImage}
                        resizeMode="cover"
                    />
                </View>
                <View style={styles.productInfo}>
                    <Text numberOfLines={2} style={styles.productName}>{item.name}</Text>
                    <Text style={styles.soldText}>Số lượng còn {totalStock}</Text>
                    <Text style={styles.price}>{mainVariant.currentPrice.toLocaleString('vi-VN')} VND</Text>
                </View>
            </View>
        );
    };


    const renderBanner = () => (
        <View>
            <FlatList
                ref={bannerRef}
                data={banners}
                horizontal
                pagingEnabled
                snapToAlignment="center"
                snapToInterval={width}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => item._id ? item._id : index.toString()}
                onScroll={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
                renderItem={({ item }) => (
                    <View style={{ width }}>
                        <Image
                            source={{ uri: item.image }}
                            style={{ width: "100%", height: width * 0.5, borderRadius: 12 }}
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
                        {/* Header + Search */}
                        <View style={styles.headerRow}>
                            <View style={styles.headerLeft}>
                                <Image source={require("../../assets/images/logo.png.png")} style={styles.avatar} />
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

                        {/* Banner */}
                        {loadingBanner ? (
                            <ActivityIndicator size="small" color="#000" style={{ marginVertical: 10 }} />
                        ) : (
                            renderBanner()
                        )}

                        {/* Categories */}
                        {loading ? (
                            <ActivityIndicator size="small" color="#000" style={{ marginBottom: 10 }} />
                        ) : (
                            <View style={styles.brandsRow}>
                                {categories.map((category, i) => (
                                    <TouchableOpacity
                                        key={`${category.id}-${i}`} // unique key tránh lỗi
                                        style={[styles.brandChip, brand === category.name && styles.brandChipActive]}
                                        onPress={() => setBrand(category.name)}
                                    >
                                        <Text style={[styles.brandText, brand === category.name && styles.brandTextActive]}>{category.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
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
        paddingTop: 10,
        paddingBottom: 100
    },
    row: {
        justifyContent: "space-between",
        marginBottom: ITEM_MARGIN
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        marginTop: 10
    },
    headerLeft: { flexDirection: "row", alignItems: "center" },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    greetSmall: { fontSize: 14, color: "#555" },
    greetName: { fontSize: 16, fontWeight: "bold" },
    bellBtn: { padding: 6 },
    searchRow: { flexDirection: "row", marginHorizontal: 16, marginTop: 10 },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f1f1f1",
        borderRadius: 8,
        paddingHorizontal: 8
    },
    searchInput: { flex: 1, height: 36 },
    filterBtn: { marginLeft: 10, backgroundColor: "#222", padding: 8, borderRadius: 8 },
    bannerWrap: { borderRadius: 12, overflow: "hidden", marginHorizontal: 16 },
    bannerImage: { width: "100%", height: width * 0.5 },
    indicatorWrap: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 8,
        position: "absolute",
        bottom: 10,
        width: "100%"
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#fff",
        marginHorizontal: 4
    },
    brandsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: 16,
        marginTop: 10
    },
    brandChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#eee",
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8
    },
    brandChipActive: { backgroundColor: "#222" },
    brandText: { color: "#555" },
    brandTextActive: { color: "#fff" },
    card: {
        width: ITEM_WIDTH,
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
        marginBottom: 8,
    },
    imageWrap: {
        width: "100%",
        aspectRatio: 1, // ảnh vuông
    },
    productImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    productInfo: {
        padding: 8,
    },
    productName: {
        fontWeight: "bold",
        fontSize: 14,
        marginBottom: 4,
        lineHeight: 18
    },
    soldText: {
        color: "#555",
        fontSize: 12,
        marginBottom: 4
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
