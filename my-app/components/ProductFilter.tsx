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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '88%',
        paddingBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FAFAFA',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: 0.3,
    },
    closeBtn: {
        padding: 6,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#888',
        marginBottom: 14,
        fontStyle: 'italic',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 8,
    },
    chip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#F8F8F8',
        borderWidth: 1.5,
        borderColor: '#E5E5E5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    chipActive: {
        backgroundColor: '#FF4757',
        borderColor: '#FF4757',
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    chipText: {
        fontSize: 14,
        color: '#555',
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    priceInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
        marginTop: 8,
    },
    priceInputWrapper: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 8,
        fontWeight: '600',
    },
    priceInput: {
        borderWidth: 2,
        borderColor: '#E5E5E5',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 15,
        color: '#1A1A1A',
        backgroundColor: '#FAFAFA',
        fontWeight: '600',
    },
    priceCurrency: {
        position: 'absolute',
        right: 14,
        bottom: 14,
        fontSize: 15,
        color: '#888',
        fontWeight: '600',
    },
    priceSeparator: {
        marginHorizontal: 14,
        fontSize: 18,
        color: '#999',
        fontWeight: '700',
        marginBottom: 12,
    },
    quickPriceContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 14,
    },
    quickPriceBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#F0F7FF',
        borderWidth: 1.5,
        borderColor: '#D0E7FF',
    },
    quickPriceText: {
        fontSize: 13,
        color: '#2563EB',
        fontWeight: '600',
    },
    ratingContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 8,
    },
    ratingChip: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#FFF9F0',
        borderWidth: 1.5,
        borderColor: '#FFE4B5',
        minWidth: 75,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    ratingChipActive: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    ratingText: {
        fontSize: 15,
        color: '#D97706',
        fontWeight: '700',
    },
    ratingTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 8,
        gap: 14,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: '#FAFAFA',
    },
    resetBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 14,
        backgroundColor: '#F5F5F5',
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        gap: 8,
    },
    resetBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#555',
    },
    applyBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 14,
        backgroundColor: '#FF4757',
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    applyBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
});
