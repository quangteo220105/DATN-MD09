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

    const scrollViewRef = useRef<ScrollView>(null);

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

    // Load favorites
    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const savedFavorites = await AsyncStorage.getItem('favorites');
                if (savedFavorites) {
                    const favoritesArray = JSON.parse(savedFavorites);
                    setFavorites(new Set(favoritesArray));
                    setIsFavorite(favoritesArray.includes(id));
                }
            } catch (error) {
                console.log('Lỗi load favorites:', error);
            }
        };
        loadFavorites();
    }, [id]);

    // Toggle favorite
    const toggleFavorite = async () => {
        try {
            const newFavorites = new Set(favorites);
            if (isFavorite) newFavorites.delete(id as string);
            else newFavorites.add(id as string);

            setFavorites(newFavorites);
            setIsFavorite(!isFavorite);
            await AsyncStorage.setItem('favorites', JSON.stringify(Array.from(newFavorites)));
        } catch (error) {
            console.log('Lỗi toggle favorite:', error);
        }
    };

    // Get all unique colors and sizes
    const getAllColors = () => {
        if (!product) return [];
        return [...new Set(product.variants.map(v => v.color))];
    };

    const getAllSizes = () => {
        if (!product) return [];
        return [...new Set(product.variants.map(v => v.size))];
    };

    // Update selected variant when color or size changes
    useEffect(() => {
        if (!product) return;
        const variant = product.variants.find(v =>
            v.color === selectedColor && v.size === selectedSize
        ) || null;
        setSelectedVariant(variant);
    }, [selectedColor, selectedSize]);

    // Get current images for selected variant
    const getCurrentImages = () => {
        if (!product) return [];
        if (selectedVariant) return [selectedVariant.image];
        return [...new Set(product.variants.map(v => v.image))];
    };

    // Calculate discount percentage
    const getDiscountPercentage = () => {
        if (!selectedVariant || !selectedVariant.price || !selectedVariant.currentPrice) return 0;
        return Math.round(((selectedVariant.price - selectedVariant.currentPrice) / selectedVariant.price) * 100);
    };

    const addToCart = async () => {
        if (!selectedVariant) {
            Alert.alert('Thông báo', 'Vui lòng chọn màu sắc và kích cỡ');
            return;
        }
        try {
            const userString = await AsyncStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            if (!user || !user._id) {
                Alert.alert('Lỗi', 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!');
                return;
            }
            const cartKey = `cart_${user._id}`;
            const cartString = await AsyncStorage.getItem(cartKey);
            let cart = cartString ? JSON.parse(cartString) : [];
            cart = Array.isArray(cart) ? cart : [];
            const idx = cart.findIndex((item: any) => item.id === product?._id && item.color === selectedVariant.color && item.size === selectedVariant.size);
            if (idx > -1) {
                cart[idx].qty = (cart[idx].qty || 1) + 1;
            } else {
                cart.push({
                    id: product?._id,
                    name: product?.name,
                    image: selectedVariant.image,
                    size: selectedVariant.size,
                    color: selectedVariant.color,
                    price: selectedVariant.currentPrice,
                    qty: 1,
                    checked: true
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
        if (!selectedVariant) {
            Alert.alert('Thông báo', 'Vui lòng chọn màu sắc và kích cỡ');
            return;
        }
        try {
            const userString = await AsyncStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            if (!user || !user._id) {
                Alert.alert('Lưu ý', 'Vui lòng đăng nhập để mua ngay');
                return;
            }
            const cartKey = `cart_${user._id}`;
            const cartString = await AsyncStorage.getItem(cartKey);
            let cart = cartString ? JSON.parse(cartString) : [];
            cart = Array.isArray(cart) ? cart : [];

            // Bỏ chọn tất cả item khác để chỉ hiển thị sản phẩm này ở checkout
            cart = cart.map((c: any) => ({ ...c, checked: false }));

            const idx = cart.findIndex((item: any) => item.id === product?._id && item.color === selectedVariant.color && item.size === selectedVariant.size);
            if (idx > -1) {
                // Đánh dấu checked và đảm bảo qty >= 1
                const qty = cart[idx].qty && cart[idx].qty > 0 ? cart[idx].qty : 1;
                cart[idx] = { ...cart[idx], checked: true, qty };
            } else {
                cart.push({
                    id: product?._id,
                    name: product?.name,
                    image: selectedVariant.image,
                    size: selectedVariant.size,
                    color: selectedVariant.color,
                    price: selectedVariant.currentPrice,
                    qty: 1,
                    checked: true,
                });
            }
            await AsyncStorage.setItem(cartKey, JSON.stringify(cart));
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
                <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#222" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết sản phẩm</Text>
                <TouchableOpacity style={styles.headerBtn} onPress={toggleFavorite}>
                    <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? "#ff4757" : "#222"} />
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
                        onScroll={(e) => setCurrentImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
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
                    <Text style={styles.description}>{product.description || 'Mô tả không có sẵn'}</Text>

                    {/* Price */}
                    <View style={styles.priceSection}>
                        <View style={styles.priceRow}>
                            <Text style={styles.currentPrice}>
                                {selectedVariant?.currentPrice ? selectedVariant.currentPrice.toLocaleString('vi-VN') : 'Chọn màu và size để xem giá'} VND
                            </Text>
                            {discountPercentage > 0 && (
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>-{discountPercentage}%</Text>
                                </View>
                            )}
                        </View>
                        {selectedVariant?.price && selectedVariant?.currentPrice && selectedVariant.price !== selectedVariant.currentPrice && (
                            <Text style={styles.originalPrice}>
                                {selectedVariant.price.toLocaleString('vi-VN')} VND
                            </Text>
                        )}
                    </View>

                    {/* Color Selection */}
                    <View style={styles.selectionSection}>
                        <Text style={styles.selectionTitle}>Màu sắc</Text>
                        <View style={styles.colorOptions}>
                            {getAllColors().map((color) => {
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

                    {/* Size Selection */}
                    <View style={styles.selectionSection}>
                        <Text style={styles.selectionTitle}>Kích cỡ</Text>
                        <View style={styles.sizeOptions}>
                            {getAllSizes().map((size) => {
                                const isSelected = selectedSize === size;
                                return (
                                    <TouchableOpacity
                                        key={size}
                                        style={[styles.sizeOption, isSelected && styles.sizeOptionSelected]}
                                        onPress={() => setSelectedSize(size)}
                                    >
                                        <Text style={[styles.sizeText, isSelected && styles.sizeTextSelected]}>{size}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Stock Info */}
                    <View style={styles.stockSection}>
                        <Ionicons name="checkmark-circle" size={20} color="#30c48d" />
                        <Text style={styles.stockText}>
                            {selectedVariant ? `Còn ${selectedVariant.stock} sản phẩm` : 'Chọn màu sắc và kích cỡ để xem số lượng'}
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
    description: { fontSize: 14, color: '#555', marginBottom: 10 },
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
    sizeText: { fontSize: 14 },
    sizeTextSelected: { color: '#ff4757', fontWeight: 'bold' },
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
