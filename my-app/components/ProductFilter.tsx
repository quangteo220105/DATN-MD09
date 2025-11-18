import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    categories: { name: string; id: string }[];
    brands: string[];
}

export interface FilterState {
    selectedCategory: string;
    selectedBrand: string;
    priceRange: { min: number; max: number };
    minRating: number;
}

export default function ProductFilter({ visible, onClose, onApply, categories, brands }: FilterProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
    const [selectedBrand, setSelectedBrand] = useState<string>('Tất cả');
    const [priceMin, setPriceMin] = useState<number>(0);
    const [priceMax, setPriceMax] = useState<number>(10000000);
    const [minRating, setMinRating] = useState<number>(0);

    const handleReset = () => {
        setSelectedCategory('Tất cả');
        setSelectedBrand('Tất cả');
        setPriceMin(0);
        setPriceMax(10000000);
        setMinRating(0);
    };

    const handleApply = () => {
        onApply({
            selectedCategory,
            selectedBrand,
            priceRange: { min: priceMin, max: priceMax },
            minRating,
        });
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Bộ lọc</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Danh mục */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Danh mục</Text>
                            <View style={styles.chipContainer}>
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.chip,
                                            selectedCategory === cat.name && styles.chipActive,
                                        ]}
                                        onPress={() => setSelectedCategory(cat.name)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                selectedCategory === cat.name && styles.chipTextActive,
                                            ]}
                                        >
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Thương hiệu */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Thương hiệu</Text>
                            <View style={styles.chipContainer}>
                                {['Tất cả', ...brands].map((brand) => (
                                    <TouchableOpacity
                                        key={brand}
                                        style={[
                                            styles.chip,
                                            selectedBrand === brand && styles.chipActive,
                                        ]}
                                        onPress={() => setSelectedBrand(brand)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                selectedBrand === brand && styles.chipTextActive,
                                            ]}
                                        >
                                            {brand}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Khoảng giá */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Khoảng giá</Text>
                            <View style={styles.priceInputRow}>
                                <View style={styles.priceInputWrapper}>
                                    <Text style={styles.priceLabel}>Từ</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        value={priceMin === 0 ? '' : priceMin.toLocaleString('vi-VN')}
                                        onChangeText={(text) => {
                                            const num = parseInt(text.replace(/\D/g, '')) || 0;
                                            setPriceMin(num);
                                        }}
                                        keyboardType="numeric"
                                        placeholder="0"
                                    />
                                    <Text style={styles.priceCurrency}>đ</Text>
                                </View>
                                <Text style={styles.priceSeparator}>-</Text>
                                <View style={styles.priceInputWrapper}>
                                    <Text style={styles.priceLabel}>Đến</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        value={priceMax === 10000000 ? '' : priceMax.toLocaleString('vi-VN')}
                                        onChangeText={(text) => {
                                            const num = parseInt(text.replace(/\D/g, '')) || 10000000;
                                            setPriceMax(num);
                                        }}
                                        keyboardType="numeric"
                                        placeholder="10,000,000"
                                    />
                                    <Text style={styles.priceCurrency}>đ</Text>
                                </View>
                            </View>
                            {/* Quick price range buttons */}
                            <View style={styles.quickPriceContainer}>
                                <TouchableOpacity
                                    style={styles.quickPriceBtn}
                                    onPress={() => { setPriceMin(0); setPriceMax(100000); }}
                                >
                                    <Text style={styles.quickPriceText}>Dưới 100.000</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.quickPriceBtn}
                                    onPress={() => { setPriceMin(100000); setPriceMax(150000); }}
                                >
                                    <Text style={styles.quickPriceText}>100.000 - 150.000</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.quickPriceBtn}
                                    onPress={() => { setPriceMin(150000); setPriceMax(300000); }}
                                >
                                    <Text style={styles.quickPriceText}>150.000 - 300.000</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Đánh giá */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Đánh giá</Text>
                            <Text style={styles.sectionSubtitle}>Chọn số sao chính xác</Text>
                            <View style={styles.ratingContainer}>
                                {[0, 1, 2, 3, 4, 5].map((rating) => (
                                    <TouchableOpacity
                                        key={rating}
                                        style={[
                                            styles.ratingChip,
                                            minRating === rating && styles.ratingChipActive,
                                        ]}
                                        onPress={() => setMinRating(rating)}
                                    >
                                        <Text
                                            style={[
                                                styles.ratingText,
                                                minRating === rating && styles.ratingTextActive,
                                            ]}
                                        >
                                            {rating === 0 ? 'Tất cả' : `${rating}★`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                            <Ionicons name="refresh" size={18} color="#666" />
                            <Text style={styles.resetBtnText}>Thiết lập lại</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                            <Text style={styles.applyBtnText}>Áp dụng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#999',
        marginBottom: 12,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    chipActive: {
        backgroundColor: '#ff4757',
        borderColor: '#ff4757',
    },
    chipText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    priceInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    priceInputWrapper: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    priceInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#333',
    },
    priceCurrency: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        fontSize: 14,
        color: '#999',
    },
    priceSeparator: {
        marginHorizontal: 12,
        fontSize: 16,
        color: '#999',
    },
    quickPriceContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    quickPriceBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    quickPriceText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    ratingContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    ratingChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        minWidth: 70,
        alignItems: 'center',
    },
    ratingChipActive: {
        backgroundColor: '#f59e0b',
        borderColor: '#f59e0b',
    },
    ratingText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    ratingTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        paddingTop: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    resetBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#f5f5f5',
        gap: 6,
    },
    resetBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666',
    },
    applyBtn: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#ff4757',
    },
    applyBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});
