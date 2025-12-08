# Hướng dẫn: Lọc và quản lý bình luận tiêu cực trong Reviews.jsx

## 📋 Tổng quan

Tính năng này cho phép admin:
1. Lọc ra các bình luận tiêu cực (rating thấp, từ ngữ tiêu cực)
2. Ẩn/hiện bình luận
3. Xóa bình luận không phù hợp

## 🎯 Các phương pháp phát hiện bình luận tiêu cực

### Phương pháp 1: Dựa vào Rating (Đơn giản nhất)
- Rating 1-2 sao: Tiêu cực
- Rating 3 sao: Trung lập
- Rating 4-5 sao: Tích cực

**Ưu điểm:**
- Dễ implement
- Chính xác cao
- Không cần AI/ML

**Nhược điểm:**
- Không phát hiện được bình luận 5 sao nhưng nội dung tiêu cực

### Phương pháp 2: Keyword-based (Từ khóa)
Tạo danh sách từ khóa tiêu cực tiếng Việt:

```javascript
const NEGATIVE_KEYWORDS = [
    // Chất lượng kém
    'tệ', 'kém', 'dở', 'tồi', 'thất vọng', 'không tốt', 'không đáng',
    'rác', 'bỏ đi', 'đừng mua', 'lừa đảo', 'gian lận',
    
    // Dịch vụ kém
    'thái độ tệ', 'phục vụ kém', 'không chuyên nghiệp',
    'giao hàng chậm', 'ship lâu', 'không giao',
    
    // Sản phẩm lỗi
    'hỏng', 'lỗi', 'bể', 'rách', 'phai màu', 'bong tróc',
    'không giống hình', 'fake', 'hàng giả', 'nhái',
    
    // Giá cả
    'đắt quá', 'mắc quá', 'không xứng đáng', 'cắt cổ',
    
    // Cảm xúc tiêu cực
    'ghét', 'tức', 'giận', 'bực', 'chán', 'hối hận'
];

function detectNegativeKeywords(text) {
    const normalized = text.toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}+/gu, "");
    
    const foundKeywords = NEGATIVE_KEYWORDS.filter(keyword => {
        const normalizedKeyword = keyword.toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}+/gu, "");
        return normalized.includes(normalizedKeyword);
    });
    
    return {
        isNegative: foundKeywords.length > 0,
        keywords: foundKeywords,
        score: foundKeywords.length
    };
}
```

**Ưu điểm:**
- Phát hiện được nội dung tiêu cực ngay cả khi rating cao
- Có thể tùy chỉnh danh sách từ khóa

**Nhược điểm:**
- Có thể false positive (VD: "không tệ" bị nhận là tiêu cực)
- Cần cập nhật danh sách từ khóa thường xuyên

### Phương pháp 3: Kết hợp (Recommended)
Kết hợp cả rating và keywords:

```javascript
function analyzeReview(review) {
    const ratingScore = review.rating <= 2 ? 2 : (review.rating === 3 ? 1 : 0);
    const keywordAnalysis = detectNegativeKeywords(review.comment || '');
    const keywordScore = keywordAnalysis.score;
    
    const totalScore = ratingScore + keywordScore;
    
    return {
        isNegative: totalScore >= 2,
        severity: totalScore >= 3 ? 'high' : (totalScore >= 2 ? 'medium' : 'low'),
        reasons: {
            lowRating: ratingScore > 0,
            negativeKeywords: keywordAnalysis.keywords
        }
    };
}
```

## 🗄️ Database Schema

### Thêm trường vào Review Model

```javascript
// backend/model/Review.js
const reviewSchema = new mongoose.Schema({
    // ... các trường hiện tại
    
    // Trường mới cho quản lý review
    isHidden: { 
        type: Boolean, 
        default: false,
        index: true  // Index để query nhanh
    },
    hiddenAt: Date,
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hiddenReason: String,
    
    // Phân tích tự động
    sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
        default: 'neutral'
    },
    negativeKeywords: [String],
    flaggedForReview: { type: Boolean, default: false }
});
```

## 🔧 Backend Implementation

### 1. Route để phân tích reviews

```javascript
// backend/routes/reviewRoutes.js

// GET /api/reviews/analyze - Phân tích tất cả reviews
router.get('/analyze', async (req, res) => {
    try {
        const reviews = await Review.find({ isHidden: false });
        
        const analyzed = reviews.map(review => {
            const analysis = analyzeReview(review);
            return {
                _id: review._id,
                rating: review.rating,
                comment: review.comment,
                userName: review.userName,
                productId: review.productId,
                ...analysis
            };
        });
        
        // Sắp xếp theo mức độ tiêu cực
        const sorted = analyzed.sort((a, b) => {
            const severityOrder = { high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });
        
        res.json({
            total: analyzed.length,
            negative: analyzed.filter(r => r.isNegative).length,
            reviews: sorted
        });
    } catch (error) {
        res.status(500).json({ message: 'Error analyzing reviews' });
    }
});

// PATCH /api/reviews/:id/hide - Ẩn review
router.patch('/:id/hide', async (req, res) => {
    try {
        const { reason, adminId } = req.body;
        
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            {
                isHidden: true,
                hiddenAt: new Date(),
                hiddenBy: adminId,
                hiddenReason: reason
            },
            { new: true }
        );
        
        res.json({ success: true, review });
    } catch (error) {
        res.status(500).json({ message: 'Error hiding review' });
    }
});

// PATCH /api/reviews/:id/unhide - Hiện lại review
router.patch('/:id/unhide', async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            {
                isHidden: false,
                hiddenAt: null,
                hiddenBy: null,
                hiddenReason: null
            },
            { new: true }
        );
        
        res.json({ success: true, review });
    } catch (error) {
        res.status(500).json({ message: 'Error unhiding review' });
    }
});

// DELETE /api/reviews/:id - Xóa review (đã có)
```

### 2. Cập nhật route GET reviews để lọc hidden

```javascript
// Cập nhật route GET /api/reviews
router.get('/', async (req, res) => {
    try {
        const { includeHidden } = req.query;
        
        const filter = includeHidden === 'true' ? {} : { isHidden: false };
        const reviews = await Review.find(filter).sort({ createdAt: -1 });
        
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reviews' });
    }
});
```

## 🎨 Frontend Implementation (Reviews.jsx)

### 1. State Management

```javascript
const [reviews, setReviews] = useState([]);
const [filterMode, setFilterMode] = useState('all'); // 'all', 'negative', 'hidden'
const [analyzedReviews, setAnalyzedReviews] = useState([]);
const [loading, setLoading] = useState(false);
```

### 2. UI Components

```javascript
// Filter tabs
<div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
    <button 
        onClick={() => setFilterMode('all')}
        style={{
            ...tabBtn,
            background: filterMode === 'all' ? '#1677ff' : '#fff',
            color: filterMode === 'all' ? '#fff' : '#333'
        }}
    >
        Tất cả ({reviews.length})
    </button>
    
    <button 
        onClick={() => setFilterMode('negative')}
        style={{
            ...tabBtn,
            background: filterMode === 'negative' ? '#ef4444' : '#fff',
            color: filterMode === 'negative' ? '#fff' : '#333'
        }}
    >
        ⚠️ Tiêu cực ({analyzedReviews.filter(r => r.isNegative).length})
    </button>
    
    <button 
        onClick={() => setFilterMode('hidden')}
        style={{
            ...tabBtn,
            background: filterMode === 'hidden' ? '#888' : '#fff',
            color: filterMode === 'hidden' ? '#fff' : '#333'
        }}
    >
        👁️ Đã ẩn ({reviews.filter(r => r.isHidden).length})
    </button>
</div>

// Review card với actions
<div style={{ 
    border: '1px solid #eee', 
    borderRadius: 8, 
    padding: 12,
    backgroundColor: review.isHidden ? '#f5f5f5' : '#fff'
}}>
    {/* Review content */}
    
    {/* Negative indicators */}
    {review.isNegative && (
        <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #fecaca',
            borderRadius: 4,
            padding: 8,
            marginTop: 8
        }}>
            <div style={{ color: '#dc2626', fontWeight: 600 }}>
                ⚠️ Bình luận tiêu cực
            </div>
            {review.reasons.lowRating && (
                <div style={{ fontSize: 12, color: '#666' }}>
                    • Rating thấp: {review.rating} sao
                </div>
            )}
            {review.reasons.negativeKeywords.length > 0 && (
                <div style={{ fontSize: 12, color: '#666' }}>
                    • Từ khóa: {review.reasons.negativeKeywords.join(', ')}
                </div>
            )}
        </div>
    )}
    
    {/* Actions */}
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {!review.isHidden ? (
            <button 
                onClick={() => handleHideReview(review._id)}
                style={{ ...actionBtn, background: '#f59e0b' }}
            >
                👁️ Ẩn
            </button>
        ) : (
            <button 
                onClick={() => handleUnhideReview(review._id)}
                style={{ ...actionBtn, background: '#22c55e' }}
            >
                👁️ Hiện
            </button>
        )}
        
        <button 
            onClick={() => handleDeleteReview(review._id)}
            style={{ ...actionBtn, background: '#ef4444' }}
        >
            🗑️ Xóa
        </button>
    </div>
</div>
```

### 3. Functions

```javascript
const analyzeReviews = async () => {
    setLoading(true);
    try {
        const res = await fetch('http://localhost:3000/api/reviews/analyze');
        const data = await res.json();
        setAnalyzedReviews(data.reviews);
    } catch (error) {
        console.error('Error analyzing reviews:', error);
    } finally {
        setLoading(false);
    }
};

const handleHideReview = async (reviewId) => {
    const reason = prompt('Lý do ẩn bình luận:');
    if (!reason) return;
    
    try {
        const res = await fetch(`http://localhost:3000/api/reviews/${reviewId}/hide`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason, adminId: 'admin-id' })
        });
        
        if (res.ok) {
            alert('Đã ẩn bình luận');
            fetchReviews();
        }
    } catch (error) {
        alert('Lỗi khi ẩn bình luận');
    }
};

const handleUnhideReview = async (reviewId) => {
    try {
        const res = await fetch(`http://localhost:3000/api/reviews/${reviewId}/unhide`, {
            method: 'PATCH'
        });
        
        if (res.ok) {
            alert('Đã hiện lại bình luận');
            fetchReviews();
        }
    } catch (error) {
        alert('Lỗi khi hiện bình luận');
    }
};
```

## 📱 Mobile App Updates

### Cập nhật hiển thị reviews (ẩn reviews đã bị hidden)

```javascript
// my-app/app/product-reviews/[productId].tsx
const fetchReviews = async () => {
    const res = await fetch(`${BASE_URL}/reviews/product/${productId}`);
    const data = await res.json();
    
    // Chỉ hiển thị reviews không bị ẩn
    const visibleReviews = data.filter(r => !r.isHidden);
    setReviews(visibleReviews);
};
```

## 🚀 Roadmap Implementation

### Phase 1: Basic (1-2 giờ)
1. ✅ Thêm trường `isHidden` vào Review model
2. ✅ Tạo routes hide/unhide/delete
3. ✅ Thêm filter tabs trong Reviews.jsx
4. ✅ Implement hide/unhide/delete functions

### Phase 2: Negative Detection (2-3 giờ)
1. ✅ Tạo danh sách từ khóa tiêu cực
2. ✅ Implement hàm phân tích review
3. ✅ Tạo route /analyze
4. ✅ Hiển thị badge "Tiêu cực" trong UI
5. ✅ Filter theo mức độ tiêu cực

### Phase 3: Advanced (Optional)
1. ⭕ Thêm sentiment analysis bằng AI/ML
2. ⭕ Auto-flag reviews tiêu cực
3. ⭕ Email notification cho admin
4. ⭕ Bulk actions (ẩn/xóa nhiều reviews)
5. ⭕ Review moderation history

## 💡 Best Practices

1. **Không xóa ngay:** Nên ẩn trước, xóa sau khi xác nhận
2. **Lưu lý do:** Luôn yêu cầu admin nhập lý do khi ẩn/xóa
3. **Audit log:** Lưu lại ai đã ẩn/xóa review nào, khi nào
4. **Thông báo user:** Có thể gửi email cho user khi review bị ẩn
5. **Appeal process:** Cho phép user khiếu nại nếu review bị ẩn nhầm

## 🔍 Testing Checklist

- [ ] Admin có thể xem danh sách reviews tiêu cực
- [ ] Admin có thể ẩn review
- [ ] Admin có thể hiện lại review đã ẩn
- [ ] Admin có thể xóa review
- [ ] Review bị ẩn không hiển thị trên mobile
- [ ] Filter tabs hoạt động đúng
- [ ] Phân tích từ khóa tiêu cực chính xác
- [ ] Rating thấp được đánh dấu tiêu cực
- [ ] Audit log được lưu đúng

## 📝 Notes

- Cân nhắc giữa tự do ngôn luận và chất lượng nội dung
- Không nên ẩn tất cả reviews tiêu cực (mất tính trung thực)
- Chỉ ẩn những reviews có ngôn từ không phù hợp, spam, hoặc sai sự thật
- Reviews tiêu cực hợp lệ nên được giữ lại để cải thiện sản phẩm/dịch vụ
