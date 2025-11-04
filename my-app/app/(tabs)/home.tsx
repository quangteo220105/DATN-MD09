import React, { useState, useMemo, useEffect, useRef, useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Image,
    FlatList,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BASE_URL, DOMAIN } from "../../config/apiConfig";
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
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [favorites, setFavorites] = useState(new Set<string>());
    const [categories, setCategories] = useState([{ name: "Tất cả", id: "all" }]);
    const [loading, setLoading] = useState(false);
    const [loadingBanner, setLoadingBanner] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [banners, setBanners] = useState<BannerType[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [productRatings, setProductRatings] = useState<{ [key: string]: { averageRating: number; totalReviews: number } }>({});
    const [loadingRatings, setLoadingRatings] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
    const bannerRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showOutOfStockDialog, setShowOutOfStockDialog] = useState(false);
    const searchInputRef = useRef<any>(null);

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

    // Đăng xuất và chuyển về login
    const forceLogout = async () => {
        try {
            await AsyncStorage.removeItem('user');
        } catch {}
        router.replace('/(tabs)/login');
    };

    // Tự động cập nhật user data mỗi khi Home screen được focus
    useFocusEffect(
        React.useCallback(() => {
            console.log('Home screen focused, fetching user data...');
            fetchUser();
            // Dọn dẹp trạng thái buy now (nếu còn) khi quay về Home
            (async () => {
                try {
                    const userStr = await AsyncStorage.getItem('user');
                    const u = userStr ? JSON.parse(userStr) : null;
                    if (u && u._id) {
                        await AsyncStorage.removeItem(`buy_now_${u._id}`);
                    }
                } catch {}
            })();
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

    useEffect(() => {
        fetchCategories();
        fetchUser();
    }, []);

    // Kiểm tra tài khoản còn tồn tại không; nếu bị xoá -> đăng xuất ngay
    useEffect(() => {
        if (!user?._id) return;
        let stop = false;
        const check = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/users/${user._id}`);
                if (!res?.data?._id) throw new Error('User missing');
            } catch (err: any) {
                if (err?.response?.status === 404) {
                    console.log('Tài khoản đã bị xoá trên server. Thoát ra login...');
                    forceLogout();
                }
            }
        };
        // kiểm tra ngay và đặt interval
        check();
        const intervalId = setInterval(() => {
            if (!stop) check();
        }, 5000);
        return () => {
            stop = true;
            clearInterval(intervalId);
        };
    }, [user?._id]);

    // Debounce query input for smarter searching
    useEffect(() => {
        const handle = setTimeout(() => {
            setDebouncedQuery(query);
            setShowSuggestions(!!query.trim());
        }, 250);
        return () => clearTimeout(handle);
    }, [query]);

    // ✅ Refresh categories mỗi khi Home screen được focus
    useFocusEffect(
        React.useCallback(() => {
            console.log('Home screen focused, refreshing categories...');
            fetchCategories();
        }, [])
    );

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

    // Lấy ratings cho tất cả sản phẩm
    const fetchProductRatings = async (productList: any[]) => {
        try {
            setLoadingRatings(true);
            const ratingsMap: { [key: string]: { averageRating: number; totalReviews: number } } = {};
            
            // Fetch ratings song song cho tất cả sản phẩm
            const ratingPromises = productList.map(async (product) => {
                try {
                    const response = await fetch(`${BASE_URL}/reviews/product/${product._id}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.totalReviews > 0) {
                            ratingsMap[product._id] = {
                                averageRating: data.averageRating || 0,
                                totalReviews: data.totalReviews || 0
                            };
                        }
                    }
                } catch (error) {
                    console.log(`Error fetching rating for product ${product._id}:`, error);
                }
            });
            
            await Promise.all(ratingPromises);
            setProductRatings(ratingsMap);
        } catch (error) {
            console.log("Lỗi lấy ratings:", (error as Error).message);
        } finally {
            setLoadingRatings(false);
        }
    };

    // Fetch ratings khi products thay đổi
    useEffect(() => {
        if (products.length > 0) {
            fetchProductRatings(products);
        }
    }, [products]);

    useEffect(() => {
        fetchBanners();
        fetchProducts();
    }, []);

    // Pull to refresh
    const onRefresh = async () => {
        setRefreshing(true);
    await Promise.all([fetchBanners(), fetchProducts(), fetchUser(), fetchCategories(), refreshNotifCount()]);
        // Ratings sẽ tự động fetch khi products thay đổi (useEffect)
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

    // Utility: remove Vietnamese diacritics and lowercase
    const normalizeText = (text: string) =>
        (text || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}+/gu, "");

    // Lọc sản phẩm theo search & brand (thông minh, bỏ dấu)
    const filtered = useMemo(() => {
        const q = normalizeText(debouncedQuery.trim());
        const selectedCategory = categories.find(c => c.name === brand);

        return products.filter((p) => {
            // ✅ Chỉ hiển thị sản phẩm đang bán (isActive = true)
            // Sản phẩm đã ngừng bán sẽ không xuất hiện ở Home
            if (!p.isActive) return false;

            // Lọc theo danh mục
            if (brand !== "Tất cả" && selectedCategory && selectedCategory.id !== "all") {
                if (p.categoryId !== selectedCategory.id) return false;
            }

            // Lọc theo tìm kiếm nâng cao
            if (!q) return true;

            const name = normalizeText(p.name);
            const brandName = normalizeText(p.brand || "");
            const categoryName = normalizeText(categories.find(c => c.id === p.categoryId)?.name || "");
            const variantsText = normalizeText(
                (p.variants || [])
                    .map((v: any) => `${v.color || ""} ${v.size || ""}`)
                    .join(" ")
            );

            return (
                name.includes(q) ||
                brandName.includes(q) ||
                categoryName.includes(q) ||
                variantsText.includes(q)
            );
        });
    }, [debouncedQuery, brand, products, categories]);

    // Gợi ý nhanh dưới thanh tìm kiếm
    const suggestions = useMemo(() => {
        const q = normalizeText(debouncedQuery.trim());
        if (!q) return [] as any[];
        // Ưu tiên tên sản phẩm khớp đầu, sau đó chứa
        const scored = products
            .filter(p => p.isActive)
            .map(p => {
                const name = normalizeText(p.name);
                let score = 0;
                if (name.startsWith(q)) score += 2;
                if (name.includes(q)) score += 1;
                return { p, score };
            })
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(x => x.p);
        return scored;
    }, [debouncedQuery, products]);

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
        const isOutOfStock = totalStock === 0;
        const rating = productRatings[item._id];
        const hasRating = rating && rating.totalReviews > 0;

        return (
            <TouchableOpacity
                style={[styles.card, isOutOfStock && styles.outOfStockCard]}
                onPress={() => {
                    if (isOutOfStock) {
                        setShowOutOfStockDialog(true);
                    } else {
                        console.log('Navigating to product:', item._id);
                        router.push(`/product/${item._id}` as any);
                    }
                }}
            >
                <View style={styles.imageWrap}>
                    <Image
                        source={{ uri: `${DOMAIN}${mainVariant.image}` }}
                        style={styles.productImage}
                        resizeMode="cover"
                        onError={(error) => {
                            console.log('Home image load error:', error);
                            console.log('Failed to load image:', `${DOMAIN}${mainVariant.image}`);
                        }}
                        onLoad={() => {
                            console.log('Home image loaded successfully:', `${DOMAIN}${mainVariant.image}`);
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
                    {isOutOfStock ? (
                        <Text style={styles.outOfStockText}>Hết hàng</Text>
                    ) : (
                        <Text style={styles.soldText}>Số lượng còn {totalStock}</Text>
                    )}
                    <Text style={styles.price}>{mainVariant.currentPrice.toLocaleString('vi-VN')} VND</Text>
                    {hasRating && (
                        <View style={styles.ratingContainer}>
                            <Text style={styles.ratingText}>
                                {rating.averageRating.toFixed(1)}
                            </Text>
                            <Ionicons name="star" size={14} color="#f59e0b" />
                        </View>
                    )}
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

  // ===== Notifications (badge on bell) =====
  const sevenDaysMs = 7 * 24 * 3600 * 1000;
  const fetchVoucherNewCount = async (): Promise<number> => {
    try {
      // lấy mốc đã xem thông báo gần nhất
      let lastSeenMs = 0;
      try {
        const lastSeen = await AsyncStorage.getItem('notifications_last_seen');
        if (lastSeen) lastSeenMs = new Date(lastSeen).getTime();
      } catch {}
      const res = await axios.get(`${BASE_URL}/vouchers`);
      const list = Array.isArray(res.data) ? res.data : [];
      const now = Date.now();
      // Count voucher đang hoạt động và mới hơn mốc đã xem
      const count = list.filter((v: any) => {
        const startOk = v.startDate ? new Date(v.startDate).getTime() <= now : true;
        const endOk = v.endDate ? new Date(v.endDate).getTime() >= now : true;
        const quantityOk = typeof v.quantity === 'number' && typeof v.usedCount === 'number' ? v.usedCount < v.quantity : true;
        const isActive = v.isActive !== false;
        const createdAtMs = v.createdAt ? new Date(v.createdAt).getTime() : 0;
        const isNew = createdAtMs && createdAtMs > (lastSeenMs || (now - sevenDaysMs));
        return startOk && endOk && quantityOk && isActive && isNew;
      }).length;
      return count;
    } catch {
      return 0;
    }
  };

  const fetchChatUnreadCount = async (): Promise<number> => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const u = userStr ? JSON.parse(userStr) : null;
      const uid = u?._id || u?.id;
      if (!uid) return 0;
      const res = await axios.get(`${BASE_URL}/messages/unread/${uid}`);
      return res?.data?.count || 0;
    } catch {
      return 0;
    }
  };

  const refreshNotifCount = async () => {
    const [vCount, cCount] = await Promise.all([fetchVoucherNewCount(), fetchChatUnreadCount()]);
    setNotifCount(vCount + cCount);
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshNotifCount();
    }, [])
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
                ListEmptyComponent={() => (
                    loadingProducts ? null : (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="search" size={42} color="#999" />
                            <Text style={styles.emptyTitle}>Không tìm thấy sản phẩm</Text>
                            <Text style={styles.emptyHint}>Thử điều chỉnh từ khóa hoặc bộ lọc</Text>
                        </View>
                    )
                )}
                ListHeaderComponent={
                    <>
                        {/* User Info Section */}
                        <View style={styles.userInfoSection}>
                            <View style={styles.userInfoRow}>
                                <View style={styles.userInfoLeft}>
                                    {user?.avatar ? (
                                        <Image
                                            source={{ uri: `${DOMAIN}${user.avatar}` }}
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
                                <TouchableOpacity
                                    style={styles.bellBtn}
                                    onPress={async () => {
                                        try { await AsyncStorage.setItem('notifications_last_seen', new Date().toISOString()); } catch {}
                                        setNotifCount(0);
                                        router.push('/notifications');
                                    }}
                                >
                                    <Ionicons name="notifications-outline" size={22} color="#222" />
                                    {notifCount > 0 && (
                                        <View style={styles.bellBadge}>
                                            <Text style={styles.bellBadgeText}>{notifCount > 99 ? '99+' : notifCount}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Search Section */}
                        <View style={styles.searchSection}>
                            <View style={styles.searchRow}>
                                <View
                                    style={styles.searchBox}
                                    onStartShouldSetResponder={() => true}
                                    onResponderRelease={() => searchInputRef.current?.focus()}
                                >
                                    <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
                                    <TextInput
                                        placeholder="Tìm kiếm sản phẩm..."
                                        value={query}
                                        onChangeText={setQuery}
                                        style={styles.searchInput}
                                        placeholderTextColor="#999"
                                        onFocus={() => setShowSuggestions(!!query.trim())}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                        returnKeyType="search"
                                        ref={searchInputRef}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        underlineColorAndroid="transparent"
                                        numberOfLines={1}
                                    />
                                    {query.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setQuery("");
                                                setShowSuggestions(false);
                                            }}
                                            style={styles.clearBtn}
                                            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                        >
                                            <Ionicons name="close-circle" size={18} color="#999" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                            {showSuggestions && suggestions.length > 0 && (
                                <View style={styles.suggestionsPanel}>
                                    {suggestions.map((s: any) => (
                                        <TouchableOpacity
                                            key={s._id}
                                            style={styles.suggestionItem}
                                            onPress={() => {
                                                setShowSuggestions(false);
                                                setQuery(s.name);
                                                // Điều hướng tới chi tiết sản phẩm khi chọn gợi ý
                                                router.push(`/product/${s._id}` as any);
                                            }}
                                        >
                                            <Text numberOfLines={1} style={styles.suggestionText}>{s.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
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
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.categoriesScrollView}
                                    contentContainerStyle={styles.categoriesScrollContent}
                                >
                                    {categories.map((category, i) => (
                                        <TouchableOpacity
                                            key={`${category.id}-${i}`}
                                            style={[styles.brandChip, brand === category.name && styles.brandChipActive]}
                                            onPress={() => setBrand(category.name)}
                                        >
                                            <Text style={[styles.brandText, brand === category.name && styles.brandTextActive]}>{category.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
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
                <TouchableOpacity>
                    <Ionicons name="home" size={22} color="black" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Ionicons name="heart-outline" size={22} color="gray" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(tabs)/cart')}>
                    <Ionicons name="cart-outline" size={22} color="gray" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/settings')}>
                    <Ionicons name="person-outline" size={22} color="gray" />
                </TouchableOpacity>
            </View>

            {/* Out of Stock Dialog */}
            {showOutOfStockDialog && (
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialogContainer}>
                        <View style={styles.dialogIcon}>
                            <Ionicons name="warning" size={48} color="#ff4757" />
                        </View>
                        <Text style={styles.dialogTitle}>Sản phẩm đã hết hàng</Text>
                        <Text style={styles.dialogMessage}>
                            Xin lỗi, sản phẩm này hiện tại đã hết hàng. Vui lòng chọn sản phẩm khác hoặc quay lại sau.
                        </Text>
                        <TouchableOpacity
                            style={styles.dialogButton}
                            onPress={() => setShowOutOfStockDialog(false)}
                        >
                            <Text style={styles.dialogButtonText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
    emptyWrap: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        gap: 8
    },
    emptyTitle: {
        marginTop: 8,
        fontSize: 16,
        fontWeight: "600",
        color: "#444"
    },
    emptyHint: {
        fontSize: 13,
        color: "#888"
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
        elevation: 2,
        position: 'relative'
    },
    bellBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 3,
        borderRadius: 8,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#fff'
    },
    bellBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700'
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
        paddingHorizontal: 16,
        paddingVertical: 14, // tăng vùng chạm
        borderWidth: 1,
        borderColor: "#e9ecef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    clearBtn: {
        marginLeft: 8,
    },
    searchInput: {
        flex: 1,
        minHeight: 22, // tránh text bị cắt/ẩn trên Android emulator
        fontSize: 16,
        color: "#111",
        includeFontPadding: false, // Android: tránh khoảng trắng thừa
        paddingVertical: 0 // giữ text hiển thị gọn
    },
    suggestionsPanel: {
        marginTop: 8,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ececec",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        paddingVertical: 4,
        overflow: "hidden",
        maxHeight: 220
    },
    suggestionItem: {
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    suggestionText: {
        fontSize: 14,
        color: "#333"
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
    categoriesScrollView: {
        marginTop: 0,
    },
    categoriesScrollContent: {
        flexDirection: "row",
        paddingHorizontal: 0,
        gap: 8,
        alignItems: "center"
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
        elevation: 1,
        flexShrink: 0, // ✅ Không cho phép co lại
        minWidth: 80, // ✅ Chiều rộng tối thiểu
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
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        gap: 4
    },
    ratingText: {
        fontSize: 12,
        color: "#666",
        fontWeight: "500"
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
    // Out of Stock Styles
    outOfStockCard: {
        opacity: 0.6,
        backgroundColor: "#f8f9fa"
    },
    outOfStockText: {
        fontSize: 12,
        color: "#ff4757",
        fontWeight: "600",
        marginBottom: 4
    },
    // Dialog Styles
    dialogOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    },
    dialogContainer: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 20,
        maxWidth: 320,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8
    },
    dialogIcon: {
        marginBottom: 16
    },
    dialogTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 12,
        textAlign: "center"
    },
    dialogMessage: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 24
    },
    dialogButton: {
        backgroundColor: "#ff4757",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 100
    },
    dialogButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center"
    }
});
