import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DOMAIN } from '../../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';

interface CartItem {
    id: string;
    name: string;
    image: string;
    size: string;
    color: string;
    price: number;
    qty: number;
    checked: boolean;
}

export default function CartScreen() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            const fetchUserAndCart = async () => {
                const userString = await AsyncStorage.getItem('user');
                const user = userString ? JSON.parse(userString) : null;
                if (!user || !user._id) {
                    setCart([]);
                    return;
                }
                const cartKey = `cart_${user._id}`;
                const cartString = await AsyncStorage.getItem(cartKey);
                // Fix: đảm bảo cart luôn là mảng, thêm kiểm tra qty, checked
                let items = [];
                try {
                    items = cartString ? JSON.parse(cartString) : [];
                    items = Array.isArray(items) ? items : [];
                } catch {
                    items = [];
                }
                // Đảm bảo mỗi item có đủ trường qty, checked
                items = items.map(item => ({ ...item, qty: item.qty || 1, checked: typeof item.checked === 'boolean' ? item.checked : true }));
                setCart(items);
            };
            fetchUserAndCart();
        }, [])
    );

    const saveCart = async (newCart: CartItem[]) => {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) {
            setCart([]);
            return;
        }
        const cartKey = `cart_${user._id}`;
        // Đảm bảo mỗi item có đủ trường qty, checked khi lưu
        const sanitizedCart = newCart.map(item => ({ ...item, qty: item.qty || 1, checked: typeof item.checked === 'boolean' ? item.checked : true }));
        setCart(sanitizedCart);
        await AsyncStorage.setItem(cartKey, JSON.stringify(sanitizedCart));
    };

    const onCheck = (id: string, color: string, size: string) => {
        const newCart = cart.map(item =>
            item.id === id && item.color === color && item.size === size
                ? { ...item, checked: !item.checked }
                : item
        );
        saveCart(newCart);
    };

    const onCheckAll = () => {
        const newValue = !selectAll;
        setSelectAll(newValue);
        const newCart = cart.map(item => ({ ...item, checked: newValue }));
        saveCart(newCart);
    };

    const changeQty = (id: string, color: string, size: string, d: number) => {
        const newCart = cart.map(item => {
            if (item.id === id && item.color === color && item.size === size) {
                const newQty = Math.max(1, item.qty + d);
                return { ...item, qty: newQty };
            }
            return item;
        });
        saveCart(newCart);
    };

    const deleteItem = (id: string, color: string, size: string) => {
        Alert.alert('Xóa sản phẩm', 'Bạn chắc chắn muốn xóa sản phẩm này?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive', onPress: async () => {
                    // Lọc đúng unique
                    const newCart = cart.filter(item => !(item.id === id && item.color === color && item.size === size));
                    await saveCart(newCart);
                }
            }
        ]);
    };

    const totalChecked = cart.filter(item => item.checked).reduce((sum, item) => sum + item.qty * item.price, 0);
    const allChecked = cart.length > 0 && cart.every(item => item.checked);
    const hasChecked = cart.some(item => item.checked);

    const renderCheckbox = (checked: boolean, onPress: () => void) => (
        <TouchableOpacity onPress={onPress} style={styles.checkbox}>
            <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? '#ff4757' : '#bbb'} />
        </TouchableOpacity>
    );

    const renderItem = ({ item }: { item: CartItem }) => (
        <View style={styles.itemContainer}>
            {renderCheckbox(item.checked, () => onCheck(item.id, item.color, item.size))}
            <Image source={{ uri: `${DOMAIN}${item.image}` }} style={styles.productImage} />
            <View style={styles.infoWrap}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.desc}>Size: <Text style={styles.bold}>{item.size}</Text> | Màu: <Text style={styles.bold}>{item.color}</Text></Text>
                <Text style={styles.price}>{item.price.toLocaleString('vi-VN')} VND</Text>
                <View style={styles.qtyWrap}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item.id, item.color, item.size, -1)}>
                        <Ionicons name="remove-circle-outline" size={22} color="#222" />
                    </TouchableOpacity>
                    <Text style={styles.qty}>{item.qty}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item.id, item.color, item.size, 1)}>
                        <Ionicons name="add-circle-outline" size={22} color="#222" />
                    </TouchableOpacity>
                </View>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteItem(item.id, item.color, item.size)}>
                <Ionicons name="trash" size={20} color="#ff4757" />
            </TouchableOpacity>
        </View>
    );

    // Đảm bảo chỉ hiện 'giỏ hàng trống' khi thực sự mảng rỗng
    if (!cart || cart.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f9', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ position: 'absolute', top: 30, left: 14 }}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(tabs)/home')}>
                        <Ionicons name="arrow-back" size={24} color="#222" />
                    </TouchableOpacity>
                </View>
                <Ionicons name="cart-outline" size={80} color="#bbb" style={{ marginBottom: 14 }} />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#888' }}>Giỏ hàng của bạn đang trống</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f9' }}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(tabs)/home')}>
                    <Ionicons name="arrow-back" size={24} color="#222" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🛒 Giỏ hàng</Text>
            </View>
            <View style={styles.selectAllRow}>
                {renderCheckbox(allChecked, onCheckAll)}
                <Text style={styles.selectAllLabel}>Chọn tất cả</Text>
                {cart.length > 0 && (
                    <TouchableOpacity
                        style={styles.clearAllBtn}
                        onPress={() => {
                            Alert.alert('Xóa tất cả', 'Bạn chắc chắn muốn xóa toàn bộ sản phẩm khỏi giỏ hàng?', [
                                { text: 'Hủy', style: 'cancel' },
                                {
                                    text: 'Xóa hết', style: 'destructive', onPress: async () => {
                                        await saveCart([]);
                                    }
                                }
                            ]);
                        }}
                    >
                        <Ionicons name="trash" size={21} color="#ff4757" />
                        <Text style={{ color: '#ff4757', marginLeft: 4, fontWeight: 'bold' }}>Xóa tất cả</Text>
                    </TouchableOpacity>
                )}
            </View>
            <FlatList
                data={cart}
                renderItem={renderItem}
                keyExtractor={item => `${item.id}-${item.size}-${item.color}`}
                style={styles.flatList}
                contentContainerStyle={{ paddingBottom: 80 }}
                showsVerticalScrollIndicator={false}
            />
            <View style={styles.footer}>
                <View style={styles.totalWrap}>
                    <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
                    <Text style={styles.totalValue}>{totalChecked.toLocaleString('vi-VN')} VND</Text>
                </View>
                <TouchableOpacity
                    style={[styles.payBtn, !hasChecked && { backgroundColor: '#aaa' }]}
                    disabled={!hasChecked}
                    onPress={() => router.push('/checkout')}
                >
                    <Text style={styles.payBtnText}>Thanh toán</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 7,
    },
    backBtn: {
        marginRight: 12,
        padding: 6,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#222',
    },
    flatList: {
        flex: 1,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 15,
        paddingVertical: 16,
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 1,
    },
    productImage: {
        width: 70,
        height: 70,
        borderRadius: 8,
        marginHorizontal: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    infoWrap: {
        flex: 1,
        paddingHorizontal: 5,
        minWidth: 120,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    desc: {
        fontSize: 13,
        color: '#666',
    },
    bold: {
        fontWeight: 'bold',
        color: '#ff4757',
    },
    price: {
        fontSize: 15,
        color: '#222',
        fontWeight: 'bold',
        marginVertical: 3,
    },
    qtyWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    qtyBtn: {
        padding: 3,
    },
    qty: {
        width: 32,
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    deleteBtn: {
        padding: 7,
        marginLeft: 2,
    },
    selectAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 22,
        marginBottom: 5
    },
    selectAllLabel: {
        fontSize: 15,
        marginLeft: 9,
        color: '#666',
        fontWeight: '500',
    },
    clearAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ffccd5',
        backgroundColor: '#fff0f3',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 5,
        marginLeft: 16,
    },
    // Footer
    footer: {
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 15,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.09,
        shadowRadius: 10,
    },
    totalWrap: {
        flex: 1,
    },
    totalLabel: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ff4757',
        marginTop: 3,
    },
    payBtn: {
        backgroundColor: '#ff4757',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 6,
        marginLeft: 18,
        // elevation/shadow
        shadowColor: '#ff4757',
        shadowOpacity: 0.12,
        shadowRadius: 6,
    },
    payBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    checkbox: {
        padding: 2,
    }
});
