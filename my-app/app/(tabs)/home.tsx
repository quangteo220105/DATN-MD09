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
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BASE_URL, DOMAIN } from "../../config/apiConfig";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ProductFilter, { FilterState } from '../../components/ProductFilter';

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
    const [showLockedDialog, setShowLockedDialog] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>({
        selectedCategory: 'Tất cả',
        selectedBrand: 'Tất cả',
        priceRange: { min: 0, max: 10000000 },
        minRating: 0,
    });
    const searchInputRef = useRef<any>(null);
    const isSelectingSuggestionRef = useRef(false);
    const lockCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const normalizeText = (text: string) =>
        (text || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}+/gu, "");

    const brands = useMemo(() => {
        const brandSet = new Set<string>();
        products.forEach(p => {
            if (p.brand) brandSet.add(p.brand);
        });
        return Array.from(brandSet).sort();
    }, [products]);

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
        } catch { }
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
                } catch { }
            })();
        }, [])
    );



    // Load favorites từ AsyncStorage theo user ID
    const loadFavorites = async () => {
        try {
            // Lấy user hiện tại
            const userStr = await AsyncStorage.getItem('user');
            const currentUser = userStr ? JSON.parse(userStr) : null;
            const userId = currentUser?._id || currentUser?.id;

            // Nếu không có user, dùng key 'favorites_guest'
            const favoritesKey = userId ? `favorites_${userId}` : 'favorites_guest';
            const savedFavorites = await AsyncStorage.getItem(favoritesKey);
            if (savedFavorites) {
                const favoritesArray = JSON.parse(savedFavorites);
                setFavorites(new Set(favoritesArray));
            } else {
                setFavorites(new Set());
            }
        } catch (error) {
            console.log('Lỗi load favorites:', error);
        }
    };

    useEffect(() => {
        loadFavorites();
    }, []);

    // ✅ Reload favorites khi user thay đổi
    useEffect(() => {
        loadFavorites();
    }, [user?._id]);

    // ✅ Reload favorites mỗi khi Home screen được focus (để đồng bộ với favorites.tsx)
    useFocusEffect(
        React.useCallback(() => {
            loadFavorites();
        }, [])
    );

    // Lấy danh mục (chỉ lấy danh mục đang hiển thị - isActive = true)
    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${BASE_URL}/categories?active=true`);
            const data = res.data
                .filter((c: any) => c.isActive !== false) // Lọc thêm để đảm bảo chỉ lấy danh mục đang hiển thị
                .map((c: any, i: number) => ({ name: c.name, id: c._id }));
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
    // ✅ Chỉ chạy khi Home screen được focus để tránh ảnh hưởng đến các màn khác
    useFocusEffect(
        React.useCallback(() => {
            if (!user?._id) return;
            let stop = false;
            const check = async () => {
                // ✅ Luôn lấy user mới nhất từ AsyncStorage để tránh check user cũ
                try {
                    const userData = await AsyncStorage.getItem('user');
                    if (!userData) {
                        // Không có user trong storage -> đăng xuất
                        if (!stop) forceLogout();
                        return;
                    }
                    const currentUser = JSON.parse(userData);
                    const currentUserId = currentUser?._id || currentUser?.id;

                    // ✅ Nếu user trong storage khác với user hiện tại -> cập nhật state
                    if (currentUserId && currentUserId !== user._id) {
                        console.log('User changed in storage, updating state...');
                        setUser(currentUser);
                        return; // Không check user cũ nữa
                    }

                    // ✅ Chỉ check nếu user ID khớp với user hiện tại
                    if (!currentUserId || currentUserId !== user._id) {
                        return;
                    }

                    // Kiểm tra user trên server
                    const res = await axios.get(`${BASE_URL}/users/${currentUserId}`);
                    if (!res?.data?._id) {
                        throw new Error('User missing');
                    }

                    // Kiểm tra tài khoản có bị khóa không
                    if (res.data.isLocked === true) {
                        console.log('Tài khoản đã bị khóa. Sẽ hiển thị dialog sau 3 giây...');
                        // Hủy timeout cũ nếu có
                        if (lockCheckTimeoutRef.current) {
                            clearTimeout(lockCheckTimeoutRef.current);
                        }
                        // Đặt timeout 3 giây để hiển thị dialog
                        lockCheckTimeoutRef.current = setTimeout(() => {
                            if (!stop) {
                                setShowLockedDialog(true);
                            }
                        }, 3000);
                    } else {
                        // Nếu tài khoản không bị khóa, hủy timeout nếu có
                        if (lockCheckTimeoutRef.current) {
                            clearTimeout(lockCheckTimeoutRef.current);
                            lockCheckTimeoutRef.current = null;
                        }
                    }
                } catch (err: any) {
                    if (stop) return;
                    if (err?.response?.status === 404) {
                        console.log('Tài khoản đã bị xoá trên server. Thoát ra login...');
                        forceLogout();
                    } else if (err?.response?.status === 401) {
                        // Unauthorized - token hết hạn hoặc không hợp lệ
                        console.log('Token không hợp lệ. Thoát ra login...');
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
                // Hủy timeout khi component unmount
                if (lockCheckTimeoutRef.current) {
                    clearTimeout(lockCheckTimeoutRef.current);
                    lockCheckTimeoutRef.current = null;
                }
            };
        }, [user?._id])
    );

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

    // Lọc sản phẩm theo search & brand (thông minh, bỏ dấu)
    const filtered = useMemo(() => {
        const q = normalizeText(debouncedQuery.trim());

        return products.filter((p) => {
            // ✅ Hiển thị cả sản phẩm dừng bán (không filter isActive nữa)

            // Lọc theo danh mục
            if (activeFilters.selectedCategory !== "Tất cả") {
                const selectedCategory = categories.find(c => c.name === activeFilters.selectedCategory);
                if (selectedCategory && selectedCategory.id !== "all") {
                    if (p.categoryId !== selectedCategory.id) return false;
                }
            }

            // Lọc theo thương hiệu
            if (activeFilters.selectedBrand !== "Tất cả") {
                if (p.brand !== activeFilters.selectedBrand) return false;
            }

            // Lọc theo khoảng giá
            const minPrice = p.variants?.reduce((min: number, v: any) =>
                Math.min(min, v.currentPrice || Infinity), Infinity) || 0;
            if (minPrice < activeFilters.priceRange.min || minPrice > activeFilters.priceRange.max) {
                return false;
            }

            // Lọc theo đánh giá (chính xác số sao đã chọn)
            if (activeFilters.minRating > 0) {
                const rating = productRatings[p._id];
                if (!rating) return false;

                // Làm tròn rating về số nguyên gần nhất để so sánh
                const roundedRating = Math.round(rating.averageRating);
                if (roundedRating !== activeFilters.minRating) {
                    return false;
                }
            }

            // Lọc theo tìm kiếm
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
    }, [debouncedQuery, activeFilters, products, categories, productRatings]);

    // Gợi ý nhanh dưới thanh tìm kiếm
    const suggestions = useMemo(() => {
        const q = normalizeText(debouncedQuery.trim());
        if (!q) return [] as any[];
        // Ưu tiên tên sản phẩm khớp đầu, sau đó chứa
        const scored = products
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
        try {
            // Lấy user hiện tại
            const userStr = await AsyncStorage.getItem('user');
            const currentUser = userStr ? JSON.parse(userStr) : null;
            const userId = currentUser?._id || currentUser?.id;

            // Nếu không có user, dùng key 'favorites_guest'
            const favoritesKey = userId ? `favorites_${userId}` : 'favorites_guest';

            setFavorites((prev) => {
                const next = new Set(prev);
                if (next.has(id)) {
                    next.delete(id);
                } else {
                    next.add(id);
                }

                // Lưu favorites vào AsyncStorage theo user ID
                AsyncStorage.setItem(favoritesKey, JSON.stringify(Array.from(next)));

                return next;
            });
        } catch (error) {
            console.log('Lỗi toggle favorite:', error);
        }
        // Không điều hướng; chỉ lưu danh sách yêu thích. Người dùng mở qua tab tim.
    };

    const renderProduct = ({ item, index }: any) => {
        const mainVariant = item.variants[0];
        const totalStock = item.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
        const isFavorite = favorites.has(item._id);
        const isOutOfStock = totalStock === 0;
        const isInactive = !item.isActive; // ✅ Kiểm tra sản phẩm dừng bán
        const rating = productRatings[item._id];
        const hasRating = rating && rating.totalReviews > 0;

        return (
            <TouchableOpacity
                style={[styles.card, (isOutOfStock || isInactive) && styles.outOfStockCard]}
                onPress={() => {
                    if (isInactive) {
                        // ✅ Hiển thị dialog sản phẩm dừng bán
                        Alert.alert(
                            'Sản phẩm đã dừng bán',
                            'Sản phẩm này hiện không còn được bán nữa.',
                            [{ text: 'Đóng', style: 'cancel' }]
                        );
                    } else if (isOutOfStock) {
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
                    {isInactive ? (
                        <Text style={styles.inactiveText}>Đã dừng bán</Text>
                    ) : isOutOfStock ? (
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
        // Banner gốc 1920x600 => tỉ lệ 3.2:1. Giữ tỉ lệ để không bị cắt.
        const bannerAspect = 1920 / 600; // 3.2
        const bannerHeight = Math.round(bannerWidth / bannerAspect);

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
                                style={[styles.bannerImage, { width: bannerWidth, height: bannerHeight, borderRadius: 10, overflow: 'hidden' }]}
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
    // Chỉ fetch notifications khi có user đăng nhập
    const sevenDaysMs = 7 * 24 * 3600 * 1000;
    const getNotificationsLastSeen = async (): Promise<number> => {
        try {
            const stored = await AsyncStorage.getItem('notifications_last_seen');
            if (!stored) return 0;
            const parsed = new Date(stored);
            const ms = parsed.getTime();
            return Number.isFinite(ms) ? ms : 0;
        } catch {
            return 0;
        }
    };

    const fetchVoucherNewCount = async (lastSeenMs: number): Promise<number> => {
        try {
            const res = await axios.get(`${BASE_URL}/vouchers`);
            const list = Array.isArray(res.data) ? res.data : [];
            const now = Date.now();

            // Count voucher đang hoạt động và mới hơn mốc đã xem
            const count = list.filter((v: any) => {
                // Kiểm tra điều kiện cơ bản
                const startOk = v.startDate ? new Date(v.startDate).getTime() <= now : true;
                const endOk = v.endDate ? new Date(v.endDate).getTime() >= now : true;
                const quantityOk = typeof v.quantity === 'number' && typeof v.usedCount === 'number' ? v.usedCount < v.quantity : true;
                const isActive = v.isActive !== false;

                if (!startOk || !endOk || !quantityOk || !isActive) return false;

                // Kiểm tra voucher mới: được tạo sau lần xem cuối cùng
                let createdAtMs = 0;
                if (v.createdAt) {
                    const parsed = new Date(v.createdAt);
                    if (!isNaN(parsed.getTime())) {
                        createdAtMs = parsed.getTime();
                    }
                }

                // Nếu không có createdAt, bỏ qua
                if (!createdAtMs) return false;

                // Kiểm tra nếu lastSeen là thời gian trong tương lai (có thể do lỗi timezone), reset về 7 ngày trước
                let effectiveLastSeen = lastSeenMs;
                if (lastSeenMs > now) {
                    console.log('[Voucher Badge] ⚠️ lastSeen is in the future, resetting to 7 days ago');
                    effectiveLastSeen = 0; // Sẽ dùng 7 ngày trước
                }

                // Nếu chưa có lastSeen hoặc lastSeen trong tương lai, tính voucher trong 7 ngày gần đây
                // Nếu có lastSeen hợp lệ, chỉ tính voucher được tạo sau lastSeen
                const threshold = effectiveLastSeen > 0 ? effectiveLastSeen : (now - sevenDaysMs);
                const isNew = createdAtMs > threshold;

                // Debug log chi tiết
                if (isNew) {
                    console.log('[Voucher Badge] ✅ New voucher:', v.code,
                        'createdAt:', new Date(createdAtMs).toISOString(),
                        'threshold:', new Date(threshold).toISOString(),
                        'diff:', Math.round((createdAtMs - threshold) / 1000 / 60), 'minutes');
                } else if (createdAtMs > 0) {
                    console.log('[Voucher Badge] ⏭️ Old voucher:', v.code,
                        'createdAt:', new Date(createdAtMs).toISOString(),
                        'threshold:', new Date(threshold).toISOString());
                }

                return isNew;
            }).length;

            console.log('[Voucher Badge] Total new vouchers:', count,
                'lastSeen:', lastSeenMs > 0 ? new Date(lastSeenMs).toISOString() : 'never',
                'now:', new Date(now).toISOString(),
                'lastSeen > now?', lastSeenMs > now);
            return count;
        } catch (e) {
            console.error('Error fetching voucher count:', e);
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

    const fetchOrderUnreadCount = async (lastSeenMs: number): Promise<number> => {
        try {
            const userStr = await AsyncStorage.getItem('user');
            const u = userStr ? JSON.parse(userStr) : null;
            const uid = u?._id || u?.id;
            if (!uid) return 0;
            const cacheKey = `order_notifications_cache_${uid}`;
            const cacheStr = await AsyncStorage.getItem(cacheKey);
            const cached = cacheStr ? JSON.parse(cacheStr) : [];
            if (!Array.isArray(cached)) return 0;
            const now = Date.now();
            const threshold = lastSeenMs > 0 && lastSeenMs <= now ? lastSeenMs : (now - sevenDaysMs);
            return cached.filter((n: any) => {
                if (n?.type !== 'order') return false;
                if (n?.read) return false;
                const createdAtMs = n?.createdAt ? new Date(n.createdAt).getTime() : 0;
                if (!Number.isFinite(createdAtMs) || createdAtMs === 0) {
                    // Nếu thiếu createdAt, fallback: coi như đã đọc khi đã mở màn thông báo
                    return threshold === 0;
                }
                return createdAtMs > threshold;
            }).length;
        } catch {
            return 0;
        }
    };

    const refreshNotifCount = async () => {
        // Guest mode: không fetch notifications
        if (!user?._id) {
            setNotifCount(0);
            return;
        }
        const lastSeenMs = await getNotificationsLastSeen();
        const [vCount, cCount, oCount] = await Promise.all([
            fetchVoucherNewCount(lastSeenMs),
            fetchChatUnreadCount(),
            fetchOrderUnreadCount(lastSeenMs),
        ]);
        setNotifCount(vCount + cCount + oCount);
    };

    useFocusEffect(
        React.useCallback(() => {
            // Guest mode: không fetch notifications
            if (!user?._id) {
                setNotifCount(0);
                return;
            }
            // Refresh ngay khi vào màn hình (bao gồm khi quay lại từ notifications)
            refreshNotifCount();
            // Auto-refresh badge mỗi 1.5 giây để cập nhật ngay lập tức khi có voucher mới hoặc tin nhắn mới
            const interval = setInterval(() => {
                refreshNotifCount();
            }, 1500);
            return () => clearInterval(interval);
        }, [user?._id])
    );

    // Thêm useEffect để refresh badge khi component mount hoặc khi quay lại
    useEffect(() => {
        refreshNotifCount();
    }, [user?._id]);

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
                                        // Guest mode: chuyển sang login khi click vào notifications
                                        if (!user?._id) {
                                            router.push('/(tabs)/login');
                                            return;
                                        }
                                        try { await AsyncStorage.setItem('notifications_last_seen', new Date().toISOString()); } catch { }
                                        // Đánh dấu đã đọc toàn bộ order notifications để badge không lặp lại sau khi vào màn thông báo
                                        try {
                                            const userStr = await AsyncStorage.getItem('user');
                                            const u = userStr ? JSON.parse(userStr) : null;
                                            const uid = u?._id || u?.id;
                                            if (uid) {
                                                const cacheKey = `order_notifications_cache_${uid}`;
                                                const cacheStr = await AsyncStorage.getItem(cacheKey);
                                                const cached = cacheStr ? JSON.parse(cacheStr) : [];
                                                if (Array.isArray(cached) && cached.length > 0) {
                                                    const updated = cached.map((n: any) => n?.type === 'order' ? { ...n, read: true } : n);
                                                    await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
                                                }
                                            }
                                        } catch { }
                                        setNotifCount(0);
                                        router.push('/notifications');
                                    }}
                                >
                                    <Ionicons name="notifications-outline" size={22} color="#222" />
                                    {user?._id && notifCount > 0 && (
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
                                        onFocus={() => {
                                            setShowSuggestions(!!query.trim());
                                            isSelectingSuggestionRef.current = false;
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                if (!isSelectingSuggestionRef.current) {
                                                    setShowSuggestions(false);
                                                }
                                                isSelectingSuggestionRef.current = false;
                                            }, 200);
                                        }}
                                        returnKeyType="search"
                                        ref={searchInputRef}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        underlineColorAndroid="transparent"
                                        numberOfLines={1}
                                    />
                                    {query.length > 0 && (
                                        <TouchableOpacity
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                setQuery("");
                                                setShowSuggestions(false);
                                                searchInputRef.current?.focus();
                                            }}
                                            style={styles.clearBtn}
                                            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="close-circle" size={20} color="#999" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* ✅ NÚT FILTER MỚI */}
                                <TouchableOpacity
                                    style={styles.filterBtn}
                                    onPress={() => setShowFilter(true)}
                                >
                                    <Ionicons name="options-outline" size={22} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {showSuggestions && suggestions.length > 0 && (
                                <View style={styles.suggestionsPanel}>
                                    {suggestions.map((s: any, index: number) => (
                                        <TouchableOpacity
                                            key={s._id}
                                            style={[
                                                styles.suggestionItem,
                                                index === suggestions.length - 1 && styles.suggestionItemLast
                                            ]}
                                            onPressIn={() => {
                                                isSelectingSuggestionRef.current = true;
                                            }}
                                            onPress={() => {
                                                const selectedName = s.name;
                                                setQuery(selectedName);
                                                setShowSuggestions(false);
                                                isSelectingSuggestionRef.current = false;
                                                setTimeout(() => {
                                                    if (searchInputRef.current) {
                                                        searchInputRef.current.focus();
                                                        searchInputRef.current.setNativeProps({ text: selectedName });
                                                    }
                                                }, 50);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="search-outline" size={16} color="#666" style={{ marginRight: 8 }} />
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
                                            style={[styles.brandChip, activeFilters.selectedCategory === category.name && styles.brandChipActive]}
                                            onPress={() => {
                                                setBrand(category.name);
                                                // Cập nhật activeFilters để lọc sản phẩm
                                                setActiveFilters(prev => ({
                                                    ...prev,
                                                    selectedCategory: category.name
                                                }));
                                            }}
                                        >
                                            <Text style={[styles.brandText, activeFilters.selectedCategory === category.name && styles.brandTextActive]}>{category.name}</Text>
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
                <TouchableOpacity onPress={() => router.push('/(tabs)/home' as any)}>
                    <Ionicons name="home" size={22} color="black" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/favorites' as any)}>
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

            {/* Account Locked Dialog */}
            {showLockedDialog && (
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialogContainer}>
                        <View style={styles.dialogIcon}>
                            <Ionicons name="lock-closed" size={48} color="#ef4444" />
                        </View>
                        <Text style={styles.dialogTitle}>Tài khoản đã bị khóa</Text>
                        <Text style={styles.dialogMessage}>
                            Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ với bộ phận hỗ trợ để được giải quyết.
                        </Text>
                        <TouchableOpacity
                            style={styles.dialogButton}
                            onPress={async () => {
                                setShowLockedDialog(false);
                                await forceLogout();
                            }}
                        >
                            <Text style={styles.dialogButtonText}>Xác nhận</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            {/* Product Filter Modal */}
            <ProductFilter
                visible={showFilter}
                onClose={() => setShowFilter(false)}
                onApply={(filters) => {
                    setActiveFilters(filters);
                    setBrand(filters.selectedCategory);
                }}
                categories={categories}
                brands={brands}
            />
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
        padding: 4,
        zIndex: 10,
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
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    suggestionItemLast: {
        borderBottomWidth: 0,
    },
    suggestionText: {
        fontSize: 14,
        color: "#333",
        flex: 1,
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
        borderRadius: 8,
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
    inactiveText: {
        fontSize: 12,
        color: "#f59e0b",
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
    },
    filterBtn: {
        backgroundColor: "#ff4757",
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
});
