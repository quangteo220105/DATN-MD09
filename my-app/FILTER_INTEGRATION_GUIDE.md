# Hướng dẫn tích hợp Bộ lọc vào Home.tsx

## Bước 1: Import ProductFilter component

Thêm vào đầu file `home.tsx`:

```typescript
import ProductFilter, { FilterState } from '../../components/ProductFilter';
```

## Bước 2: Thêm state cho filter

Thêm vào phần state declarations (sau các useState hiện có):

```typescript
const [showFilter, setShowFilter] = useState(false);
const [activeFilters, setActiveFilters] = useState<FilterState>({
    selectedCategory: 'Tất cả',
    selectedBrand: 'Tất cả',
    priceRange: { min: 0, max: 10000000 },
    minRating: 0,
});
```

## Bước 3: Lấy danh sách brands từ products

Thêm useMemo để tạo danh sách brands:

```typescript
const brands = useMemo(() => {
    const brandSet = new Set<string>();
    products.forEach(p => {
        if (p.brand) brandSet.add(p.brand);
    });
    return Array.from(brandSet).sort();
}, [products]);
```

## Bước 4: Cập nhật logic lọc sản phẩm

Thay thế useMemo `filtered` hiện tại bằng:

```typescript
const filtered = useMemo(() => {
    const q = normalizeText(debouncedQuery.trim());

    return products.filter((p) => {
        // Chỉ hiển thị sản phẩm đang bán
        if (!p.isActive) return false;

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

        // Lọc theo đánh giá
        if (activeFilters.minRating > 0) {
            const rating = productRatings[p._id];
            if (!rating || rating.averageRating < activeFilters.minRating) {
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
```

## Bước 5: Thêm nút Filter vào UI

Tìm phần Search Bar trong JSX (nơi có TextInput tìm kiếm) và thêm nút filter bên cạnh:

```typescript
{/* Search Bar với nút Filter */}
<View style={styles.searchRow}>
    <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm..."
            value={query}
            onChangeText={setQuery}
            onFocus={() => setShowSuggestions(!!query.trim())}
            onBlur={() => {
                if (!isSelectingSuggestionRef.current) {
                    setTimeout(() => setShowSuggestions(false), 200);
                }
            }}
        />
        {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
        )}
    </View>
    <TouchableOpacity 
        style={styles.filterBtn} 
        onPress={() => setShowFilter(true)}
    >
        <Ionicons name="options-outline" size={22} color="#fff" />
    </TouchableOpacity>
</View>
```

## Bước 6: Thêm ProductFilter component vào cuối JSX

Thêm trước tag đóng `</View>` cuối cùng:

```typescript
{/* Product Filter Modal */}
<ProductFilter
    visible={showFilter}
    onClose={() => setShowFilter(false)}
    onApply={(filters) => {
        setActiveFilters(filters);
        // Cập nhật brand state để đồng bộ với category tabs
        setBrand(filters.selectedCategory);
    }}
    categories={categories}
    brands={brands}
/>
```

## Bước 7: Thêm styles

Thêm vào StyleSheet.create:

```typescript
searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
},
searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
},
searchIcon: {
    marginRight: 8,
},
searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
},
clearBtn: {
    padding: 4,
},
filterBtn: {
    backgroundColor: '#ff4757',
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
},
```

## Hoàn tất!

Sau khi thực hiện các bước trên, bạn sẽ có:
- ✅ Nút bộ lọc chuyên nghiệp bên cạnh thanh tìm kiếm
- ✅ Modal bộ lọc với danh mục, thương hiệu, khoảng giá, đánh giá
- ✅ Nút "Thiết lập lại" và "Áp dụng"
- ✅ Lọc sản phẩm theo nhiều tiêu chí kết hợp
