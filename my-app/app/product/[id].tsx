import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Dimensions,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { DOMAIN, BASE_URL } from '../../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Variant {
    _id: string;
    color: string;
    size: string;
    price: number;
    currentPrice: number;
    stock: number;
    image: string;
}

interface Product {
    _id: string;
    name: string;
    brand: string;
    description: string;
    variants: Variant[];
    categoryId?: string;
    isActive?: boolean;
}

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favorites, setFavorites] = useState(new Set<string>());
    const [productRating, setProductRating] = useState<{ averageRating: number; totalReviews: number } | null>(null);
    const [loadingRating, setLoadingRating] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);

    // Khi quay lại màn chi tiết từ Checkout, đảm bảo xoá trạng thái buy-now tạm
    useFocusEffect(
        React.useCallback(() => {
            const clearBuyNow = async () => {
                try {
                    const userString = await AsyncStorage.getItem('user');
                    const user = userString ? JSON.parse(userString) : null;
                    if (user && user._id) {
                        await AsyncStorage.removeItem(`buy_now_${user._id}`);
                    }
                } catch { }
            };
            clearBuyNow();
        }, [])
    );

    // Load product details
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${BASE_URL}/products/${id}`);
                setProduct(response.data);

                if (response.data.variants && response.data.variants.length > 0) {
                    const defaultVariant = response.data.variants[0];
                    setSelectedVariant(defaultVariant);
                    setSelectedColor(defaultVariant.color || '');
                    setSelectedSize(defaultVariant.size || '');
                }
            } catch (error) {
                console.log('Lỗi lấy chi tiết sản phẩm:', error);
                Alert.alert('Lỗi', 'Không thể tải thông tin sản phẩm');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProduct();
    }, [id]);

    // ✅ Auto-refresh product mỗi 2 giây để kiểm tra trạng thái dừng bán real-time
    useEffect(() => {
        if (!id) return;

        const interval = setInterval(async () => {
            try {
                const response = await axios.get(`${BASE_URL}/products/${id}`);
                setProduct(response.data);
            } catch (error) {
                console.log('Lỗi refresh sản phẩm:', error);
            }
        }, 2000); // Refresh mỗi 2 giây

        return () => clearInterval(interval);
    }, [id]);

    // Load product rating
    useEffect(() => {
        const fetchRating = async () => {
            if (!id) return;
            try {
                setLoadingRating(true);
                const response = await fetch(`${BASE_URL}/reviews/product/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setProductRating({
                        averageRating: data.averageRating || 0,
                        totalReviews: data.totalReviews || 0,
                    });
                }
            } catch (error) {
                console.log('Lỗi lấy đánh giá sản phẩm:', error);
            } finally {
                setLoadingRating(false);
            }
        };
        fetchRating();
    }, [id]);

    // Load favorites theo user ID
    useEffect(() => {
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
                    setIsFavorite(favoritesArray.includes(id));
                } else {
                    setIsFavorite(false);
                }
            } catch (error) {
                console.log('Lỗi load favorites:', error);
            }
        };
        loadFavorites();
    }, [id]);

    const toggleFavorite = async () => {
        try {
            // Lấy user hiện tại
            const userStr = await AsyncStorage.getItem('user');
            const currentUser = userStr ? JSON.parse(userStr) : null;
            const userId = currentUser?._id || currentUser?.id;

            // Nếu không có user, dùng key 'favorites_guest'
            const favoritesKey = userId ? `favorites_${userId}` : 'favorites_guest';

            const newFavorites = new Set(favorites);
            if (isFavorite) newFavorites.delete(id as string);
            else newFavorites.add(id as string);

            setFavorites(newFavorites);
            setIsFavorite(!isFavorite);
            await AsyncStorage.setItem(favoritesKey, JSON.stringify(Array.from(newFavorites)));
        } catch (error) {
            console.log('Lỗi toggle favorite:', error);
        }
    };

    const getAllColors = () => {
        if (!product) return [];
        return [...new Set(product.variants.map(v => v.color))];
    };

    const getAllSizes = () => {
        if (!product) return [];
        return [...new Set(product.variants.map(v => v.size))];
    };

    // Kiểm tra stock của một size cụ thể (khi đã chọn màu)
    const getSizeStock = (size: string): number => {
        if (!product || !selectedColor) return 0;
        const variant = product.variants.find(v => v.color === selectedColor && v.size === size);
        return variant ? variant.stock : 0;
    };

    useEffect(() => {
        if (!product) return;
        const variant = product.variants.find(v => v.color === selectedColor && v.size === selectedSize) || null;
        setSelectedVariant(variant);
    }, [selectedColor, selectedSize]);

    const getCurrentImages = () => {
        if (!product) return [];
        if (selectedVariant) return [selectedVariant.image];
        return [...new Set(product.variants.map(v => v.image))];
    };

    const getDiscountPercentage = () => {
        if (!selectedVariant || !selectedVariant.price || !selectedVariant.currentPrice) return 0;
        return Math.round(((selectedVariant.price - selectedVariant.currentPrice) / selectedVariant.price) * 100);
    };

    const addToCart = async () => {
        if (!selectedVariant || !product) {
            Alert.alert('Thông báo', 'Vui lòng chọn màu sắc và kích cỡ');
            return;
        }
        // Kiểm tra sản phẩm dừng bán
        if (product.isActive === false) {
            Alert.alert('Thông báo', 'Sản phẩm này đã dừng bán');
            return;
        }
        // Kiểm tra stock
        if (selectedVariant.stock === 0) {
            Alert.alert('Thông báo', 'Sản phẩm đã hết hàng');
            return;
        }
        try {
            const userString = await AsyncStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            if (!user?._id) {
                Alert.alert(
                    'Đăng nhập',
                    'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!',
                    [
                        { text: 'Hủy', style: 'cancel' },
                        { text: 'Đăng nhập', onPress: () => router.push('/(tabs)/login') }
                    ]
                );
                return;
            }

            const cartKey = `cart_${user._id}`;
            const cartString = await AsyncStorage.getItem(cartKey);
            let cart = cartString ? JSON.parse(cartString) : [];
            cart = Array.isArray(cart) ? cart : [];

            const idx = cart.findIndex((item: any) => item.id === product._id && item.color === selectedVariant.color && item.size === selectedVariant.size);

            if (idx > -1) {
                // Kiểm tra stock trước khi tăng số lượng
                const currentQty = cart[idx].qty || 1;
                if (selectedVariant.stock !== undefined && currentQty + 1 > selectedVariant.stock) {
                    Alert.alert('Thông báo', `Số lượng tồn kho không đủ. Chỉ còn ${selectedVariant.stock} sản phẩm.`);
                    return;
                }
                cart[idx].qty = currentQty + 1;
                cart[idx].stock = selectedVariant.stock; // Cập nhật stock
            } else {
                cart.push({
                    id: product._id,
                    name: product.name,
                    image: selectedVariant.image,
                    size: selectedVariant.size,
                    color: selectedVariant.color,
                    price: selectedVariant.currentPrice,
                    categoryId: product.categoryId,
                    qty: 1,
                    checked: true,
                    stock: selectedVariant.stock, // Lưu stock
                });
            }

            await AsyncStorage.setItem(cartKey, JSON.stringify(cart));
            Alert.alert('Thành công', 'Đã thêm sản phẩm vào giỏ hàng', [
                { text: 'Xem giỏ hàng', onPress: () => router.push('/(tabs)/cart') },
                { text: 'Tiếp tục xem', style: 'cancel' },
            ]);
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng!');
            console.error('ERROR ADD TO CART:', error);
        }
    };

    const buyNow = async () => {
        if (!selectedVariant || !product) {
            Alert.alert('Thông báo', 'Vui lòng chọn màu sắc và kích cỡ');
            return;
        }
        // Kiểm tra sản phẩm dừng bán
        if (product.isActive === false) {
            Alert.alert('Thông báo', 'Sản phẩm này đã dừng bán');
            return;
        }
        // Kiểm tra stock
        if (selectedVariant.stock === 0) {
            Alert.alert('Thông báo', 'Sản phẩm đã hết hàng');
            return;
        }
        try {
            const userString = await AsyncStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            if (!user?._id) {
                Alert.alert(
                    'Đăng nhập',
                    'Vui lòng đăng nhập để mua ngay sản phẩm này!',
                    [
                        { text: 'Hủy', style: 'cancel' },
                        { text: 'Đăng nhập', onPress: () => router.push('/(tabs)/login') }
                    ]
                );
                return;
            }

            // Lưu riêng sản phẩm "Mua ngay" để không ghi đè giỏ hàng
            const buyNowKey = `buy_now_${user._id}`;
            const item = {
                id: product._id,
                name: product.name,
                image: selectedVariant.image,
                size: selectedVariant.size,
                color: selectedVariant.color,
                price: selectedVariant.currentPrice,
                qty: 1,
                checked: true,
                categoryId: product.categoryId,
                stock: selectedVariant.stock, // Lưu stock
            };
            await AsyncStorage.setItem(buyNowKey, JSON.stringify(item));
            router.push('/checkout');
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể thực hiện mua ngay');
            console.log('BUY_NOW_ERROR', e);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#222" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    if (!product) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Không tìm thấy sản phẩm</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentImages = getCurrentImages();
    const discountPercentage = getDiscountPercentage();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={toggleFavorite}>
                    <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? '#ff4757' : '#222'} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Product Images */}
                <View style={styles.imageSection}>
                    <FlatList
                        data={currentImages}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item, index) => index.toString()}
                        onScroll={e => setCurrentImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                        renderItem={({ item }) => (
                            <View style={styles.imageContainer}>
                                <Image source={{ uri: `${DOMAIN}${item}` }} style={styles.productImage} resizeMode="cover" />
                            </View>
                        )}
                    />
                    {currentImages.length > 1 && (
                        <View style={styles.imageIndicators}>
                            {currentImages.map((_, index) => (
                                <View key={index} style={[styles.indicator, { opacity: index === currentImageIndex ? 1 : 0.3 }]} />
                            ))}
                        </View>
                    )}
                </View>

                {/* Product Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.brand}>{product.brand || 'Thương hiệu không xác định'}</Text>
                    <Text style={styles.productName}>{product.name || 'Tên sản phẩm không xác định'}</Text>

                    {/* Description with Read More */}
                    <View style={styles.descriptionContainer}>
                        <Text
                            style={styles.description}
                            numberOfLines={isDescriptionExpanded ? undefined : 3}
                        >
                            {product.description || 'Mô tả không có sẵn'}
                        </Text>
                        {product.description && product.description.length > 100 && (
                            <TouchableOpacity
                                onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                style={styles.readMoreBtn}
                            >
                                <Text style={styles.readMoreText}>
                                    {isDescriptionExpanded ? 'Thu gọn' : 'Đọc thêm'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Rating */}
                    {productRating && productRating.totalReviews > 0 && (
                        <TouchableOpacity
                            style={styles.ratingSection}
                            onPress={() => router.push(`/product-reviews/${id}` as any)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.ratingRow}>
                                <View style={styles.starsContainer}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Ionicons
                                            key={star}
                                            name={star <= Math.round(productRating.averageRating) ? 'star' : 'star-outline'}
                                            size={20}
                                            color="#f59e0b"
                                        />
                                    ))}
                                </View>
                                <Text style={styles.ratingText}>
                                    {productRating.averageRating.toFixed(1)} ({productRating.totalReviews} đánh giá)
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#888" style={{ marginLeft: 'auto' }} />
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Price */}
                    <View style={styles.priceSection}>
                        <View style={styles.priceRow}>
                            <Text style={styles.currentPrice}>
                                {selectedVariant?.currentPrice
                                    ? selectedVariant.currentPrice.toLocaleString('vi-VN')
                                    : 'Chọn màu và size để xem giá'}{' '}
                                VND
                            </Text>
                            {discountPercentage > 0 && (
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>-{discountPercentage}%</Text>
                                </View>
                            )}
                        </View>
                        {selectedVariant?.price &&
                            selectedVariant?.currentPrice &&
                            selectedVariant.price !== selectedVariant.currentPrice && (
                                <Text style={styles.originalPrice}>{selectedVariant.price.toLocaleString('vi-VN')} VND</Text>
                            )}
                    </View>

                    {/* Color */}
                    <View style={styles.selectionSection}>
                        <Text style={styles.selectionTitle}>Màu sắc</Text>
                        <View style={styles.colorOptions}>
                            {getAllColors().map(color => {
                                const isSelected = selectedColor === color;
                                return (
                                    <TouchableOpacity
                                        key={color}
                                        style={[styles.colorOption, isSelected && styles.colorOptionSelected]}
                                        onPress={() => setSelectedColor(color)}
                                    >
                                        <Text style={[styles.colorText, isSelected && styles.colorTextSelected]}>{color}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Size */}
                    <View style={styles.selectionSection}>
                        <Text style={styles.selectionTitle}>Kích cỡ</Text>
                        <View style={styles.sizeOptions}>
                            {getAllSizes().map(size => {
                                const isSelected = selectedSize === size;
                                // Chỉ kiểm tra stock khi đã chọn màu
                                const sizeStock = selectedColor ? getSizeStock(size) : null;
                                const isOutOfStock = !!(selectedColor && sizeStock !== null && sizeStock === 0);
                                return (
                                    <TouchableOpacity
                                        key={size}
                                        style={[
                                            styles.sizeOption,
                                            isSelected && styles.sizeOptionSelected,
                                            isOutOfStock && styles.sizeOptionOutOfStock
                                        ]}
                                        onPress={() => {
                                            if (!isOutOfStock) {
                                                setSelectedSize(size);
                                            }
                                        }}
                                        disabled={isOutOfStock}
                                    >
                                        <Text style={[
                                            styles.sizeText,
                                            isSelected && styles.sizeTextSelected,
                                            isOutOfStock && styles.sizeTextOutOfStock
                                        ]}>
                                            {size}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Stock */}
                    <View style={styles.stockSection}>
                        <Ionicons name="checkmark-circle" size={20} color="#30c48d" />
                        <Text style={styles.stockText}>
                            {selectedVariant
                                ? selectedVariant.stock > 0
                                    ? `Còn ${selectedVariant.stock} sản phẩm`
                                    : 'Hết hàng'
                                : 'Chọn màu sắc và kích cỡ để xem số lượng'}
                        </Text>

                    </View>
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionSection}>
                <TouchableOpacity style={styles.addToCartBtn} onPress={addToCart}>
                    <Ionicons name="cart-outline" size={20} color="#fff" />
                    <Text style={styles.addToCartText}>Thêm vào giỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buyNowBtn} onPress={buyNow}>
                    <Text style={styles.buyNowText}>Mua ngay</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Bạn giữ nguyên styles cũ, chỉ cần kiểm tra colorOptionSelected, sizeOptionSelected để hiển thị nút chọn
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
    scrollView: { flex: 1 },
    imageSection: { width: '100%', height: 300, marginBottom: 10 },
    imageContainer: { width, height: 300 },
    productImage: { width: '100%', height: '100%' },
    imageIndicators: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
    indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333', margin: 3 },
    infoSection: { padding: 15 },
    brand: { fontSize: 14, color: '#888' },
    productName: { fontSize: 20, fontWeight: 'bold', marginVertical: 5 },
    descriptionContainer: { marginBottom: 10 },
    description: { fontSize: 14, color: '#555', lineHeight: 20 },
    readMoreBtn: { marginTop: 5 },
    readMoreText: { fontSize: 14, color: '#ff4757', fontWeight: '600' },
    priceSection: { marginVertical: 10 },
    priceRow: { flexDirection: 'row', alignItems: 'center' },
    currentPrice: { fontSize: 18, fontWeight: 'bold', color: '#222' },
    originalPrice: { fontSize: 14, color: '#888', textDecorationLine: 'line-through' },
    discountBadge: { backgroundColor: '#ff4757', paddingHorizontal: 5, paddingVertical: 2, marginLeft: 10, borderRadius: 4 },
    discountText: { color: '#fff', fontWeight: 'bold' },
    selectionSection: { marginVertical: 10 },
    selectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    colorOptions: { flexDirection: 'row', flexWrap: 'wrap' },
    colorOption: { padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginRight: 8, marginBottom: 8 },
    colorOptionSelected: { borderColor: '#ff4757', backgroundColor: '#ffe3e3' },
    colorText: { fontSize: 14 },
    colorTextSelected: { color: '#ff4757', fontWeight: 'bold' },
    sizeOptions: { flexDirection: 'row', flexWrap: 'wrap' },
    sizeOption: { padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginRight: 8, marginBottom: 8 },
    sizeOptionSelected: { borderColor: '#ff4757', backgroundColor: '#ffe3e3' },
    sizeOptionOutOfStock: { opacity: 0.4, borderColor: '#ddd' },
    sizeText: { fontSize: 14 },
    sizeTextSelected: { color: '#ff4757', fontWeight: 'bold' },
    sizeTextOutOfStock: { color: '#999' },
    ratingSection: { marginVertical: 10, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    starsContainer: { flexDirection: 'row', marginRight: 10 },
    star: { marginRight: 2 },
    ratingText: { fontSize: 14, color: '#666', fontWeight: '500' },
    stockSection: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    stockText: { marginLeft: 5, fontSize: 14, color: '#555' },
    actionSection: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', padding: 10 },
    addToCartBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#222', padding: 10, borderRadius: 5, marginRight: 5 },
    addToCartText: { color: '#fff', marginLeft: 5, fontWeight: 'bold' },
    buyNowBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ff4757', padding: 10, borderRadius: 5 },
    buyNowText: { color: '#fff', fontWeight: 'bold' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, marginBottom: 10 },
    backBtn: { padding: 10, backgroundColor: '#222', borderRadius: 5 },
    backBtnText: { color: '#fff' },
});
