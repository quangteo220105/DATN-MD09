import React, { useEffect, useState } from "react";

const RATING_OPTIONS = [
    { value: "", label: "Tất cả" },
    { value: "negative", label: "🚫 Tiêu cực" },
    { value: "5", label: "⭐ 5 sao" },
    { value: "4", label: "⭐ 4 sao" },
    { value: "3", label: "⭐ 3 sao" },
    { value: "2", label: "⭐ 2 sao" },
    { value: "1", label: "⭐ 1 sao" },
];

const pageSizeOptions = [10, 20, 50];

const RATING_VALUES = [5, 4, 3, 2, 1];

const createDefaultRatingStats = () => ({
    total: 0,
    average: 0,
    counts: RATING_VALUES.reduce((acc, rating) => {
        acc[rating] = 0;
        return acc;
    }, {})
});

// Danh sách từ khóa tiêu cực tiếng Việt
const NEGATIVE_KEYWORDS = [
    'tệ', 'dở', 'kém', 'tồi', 'thất vọng', 'không tốt', 'không đẹp', 'xấu',
    'kém chất lượng', 'chất lượng kém', 'không như mô tả', 'không giống hình',
    'lừa đảo', 'gian lận', 'không uy tín', 'không đáng tin', 'không nên mua',
    'rác', 'phí tiền', 'lãng phí', 'không đáng', 'không nên',
    'hỏng', 'hư', 'lỗi', 'bể', 'rách', 'bong tróc', 'phai màu',
    'không vừa', 'không đúng size', 'sai size', 'chật', 'rộng quá',
    'giao hàng chậm', 'ship lâu', 'không giao đúng hẹn', 'thái độ tệ',
    'không hài lòng', 'thất bại', 'tệ hại', 'kinh khủng', 'khủng khiếp',
    'không đáng tiền', 'mất tiền oan', 'không đẹp như hình', 'fake',
    'giả', 'nhái', 'hàng giả', 'hàng nhái', 'không chính hãng',
    'dm', 'cc', 'đm', 'đcm', 'địt mẹ', 'đụ má', 'đụ mẹ', 'đĩ mẹ', 'đĩ mợ', 'đéo', 'lồn', 'cặc', 'buồi', 'đụ', 'đụt',
    'lon', 'giày quá chán', 'như cut', 'chán quá', 'chán thật', 'chán vl', 'bực mình', 'ức chế', 'phẫn nộ', 'ghét', 'ghê tởm', 'kinh tởm',
    'bẩn', 'dơ', 'ô nhiễm', 'dcm', 'tệ hại', 'vớ vẩn', 'vớ vẫn', 'làm ăn bát nháo', 'làm ăn cẩu thả'
];

// Hàm phát hiện bình luận tiêu cực
const isNegativeComment = (comment) => {
    if (!comment || typeof comment !== 'string') return false;
    const lowerComment = comment.toLowerCase().trim();
    return NEGATIVE_KEYWORDS.some(keyword => lowerComment.includes(keyword));
};

function normalizeOrderFromReview(review) {
    if (!review) return null;
    if (review.orderFetched) return review.orderFetched;
    if (review.order) return review.order;
    if (review.orderId && typeof review.orderId === "object") return review.orderId;
    return null;
}

const parseAddressInfo = (address, fallbackName = "Khách hàng", fallbackPhone = "-") => {
    if (!address) return { name: fallbackName, phone: fallbackPhone };

    if (typeof address === "object") {
        return {
            name: address.name || fallbackName,
            phone: address.phone || fallbackPhone,
        };
    }

    const text = String(address);

    if (text.trim().startsWith("{")) {
        try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === "object") {
                return {
                    name: parsed.name || fallbackName,
                    phone: parsed.phone || fallbackPhone,
                };
            }
        } catch (err) {
            /* ignore */
        }
    }

    let name = fallbackName;
    let phone = fallbackPhone;
    const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
    const firstLine = lines[0] || "";

    const dashSplit = firstLine.split(/\s*-\s*/);
    if (dashSplit.length >= 2) {
        name = dashSplit[0].trim() || name;
        phone = dashSplit.slice(1).join(" - ").trim() || phone;
    }

    const phoneMatch = text.match(/(\+?84|0)(\d[\s.-]?){8,10}/);
    if (phoneMatch) {
        phone = phoneMatch[0].replace(/[\s.-]/g, "");
        if (phone.startsWith("84") && phone.length >= 11) {
            phone = "0" + phone.slice(2);
        }
    }

    if ((!name || name === fallbackName) && dashSplit.length === 1 && lines.length > 1) {
        name = firstLine || name;
    }

    return { name: name || fallbackName, phone: phone || fallbackPhone };
};

const getCustomerInfoFromReview = (review) => {
    const fallbackName =
        review.customerName ||
        review.userId?.name ||
        review.userName ||
        review.user?.name ||
        "Khách hàng";

    const fallbackPhone =
        review.customerPhone ||
        review.userId?.phone ||
        review.user?.phone ||
        "-";

    const orderInfo = normalizeOrderFromReview(review);

    const addressSource =
        orderInfo?.address ||
        orderInfo?.shippingAddress ||
        review.orderAddress ||
        review.address ||
        null;

    const explicitName =
        orderInfo?.customerName ||
        orderInfo?.name ||
        fallbackName;

    const explicitPhone =
        orderInfo?.customerPhone ||
        orderInfo?.phone ||
        fallbackPhone;

    return parseAddressInfo(addressSource, explicitName, explicitPhone);
};

export default function Reviews() {
    const [loading, setLoading] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [total, setTotal] = useState(0);
    const [ratingStats, setRatingStats] = useState(() => createDefaultRatingStats());

    const [query, setQuery] = useState("");
    const [rating, setRating] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [selected, setSelected] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [orderReviews, setOrderReviews] = useState([]);
    const [loadingOrderReviews, setLoadingOrderReviews] = useState(false);

    const collectRatingStats = async ({ q }) => {
        const stats = createDefaultRatingStats();
        try {
            const buildParams = (queryValue, ratingValue) => {
                const params = new URLSearchParams({ page: "1", limit: "1" });
                if ((queryValue || "").trim()) params.append("q", (queryValue || "").trim());
                if (ratingValue !== undefined) params.append("rating", String(ratingValue));
                return params;
            };

            const parseTotal = (data) => {
                if (Array.isArray(data)) return data.length;
                if (typeof data?.total === 'number') return data.total;
                const list = Array.isArray(data?.data) ? data.data : [];
                return list.length;
            };

            const totalRes = await fetch(`http://localhost:3000/api/reviews?${buildParams(q).toString()}`);
            const totalData = await totalRes.json();
            stats.total = parseTotal(totalData);

            const ratingResults = await Promise.all(
                RATING_VALUES.map(async (ratingValue) => {
                    const res = await fetch(`http://localhost:3000/api/reviews?${buildParams(q, ratingValue).toString()}`);
                    const data = await res.json();
                    return [ratingValue, parseTotal(data)];
                })
            );

            let weightedSum = 0;
            ratingResults.forEach(([ratingValue, count]) => {
                stats.counts[ratingValue] = Number.isFinite(count) ? count : 0;
                weightedSum += ratingValue * (Number.isFinite(count) ? count : 0);
            });

            stats.average = stats.total > 0 ? Number((weightedSum / stats.total).toFixed(1)) : 0;
        } catch (e) {
            console.error("Failed to collect rating stats", e);
        }
        return stats;
    };

    const fetchOrderDetails = async (orderId, cache) => {
        if (!orderId) return null;
        const key = String(orderId);
        if (cache.has(key)) return cache.get(key);
        try {
            const res = await fetch(`http://localhost:3000/api/orders/${key}`);
            if (res.ok) {
                const data = await res.json();
                cache.set(key, data);
                return data;
            }
        } catch (err) {
            console.error('Failed to fetch order detail', err);
        }
        cache.set(key, null);
        return null;
    };

    const enrichReviewsWithOrders = async (reviews) => {
        const cache = new Map();
        const enriched = await Promise.all(reviews.map(async (review) => {
            const existingOrder = normalizeOrderFromReview(review);
            if (existingOrder && (existingOrder.address || existingOrder.customerName || existingOrder.customerPhone)) {
                return review;
            }
            let orderId = null;
            if (typeof review.orderId === "string") {
                orderId = review.orderId;
            } else if (typeof review.orderId === "object") {
                orderId = review.orderId?._id || review.orderId?.id || review.orderId?.code || null;
            } else if (review.order?._id || review.order?.id) {
                orderId = review.order._id || review.order.id;
            }
            const order = await fetchOrderDetails(orderId, cache);
            if (!order) return review;
            return { ...review, orderFetched: order };
        }));
        return enriched;
    };

    const fetchReviews = async (override = {}) => {
        try {
            setLoading(true);
            const q = Object.prototype.hasOwnProperty.call(override, 'q') ? override.q : query;
            const rt = Object.prototype.hasOwnProperty.call(override, 'rating') ? override.rating : rating;
            const pg = Object.prototype.hasOwnProperty.call(override, 'page') ? override.page : page;
            const lim = Object.prototype.hasOwnProperty.call(override, 'limit') ? override.limit : pageSize;

            // Nếu filter là "negative", cần lấy tất cả reviews để lọc ở frontend
            const isNegativeFilter = rt === 'negative';

            const params = new URLSearchParams({
                page: isNegativeFilter ? '1' : String(pg),
                limit: isNegativeFilter ? '1000' : String(lim), // Lấy nhiều để lọc
            });
            if ((q || '').trim()) params.append("q", (q || '').trim());
            if (rt && !isNegativeFilter) params.append("rating", rt);

            const listPromise = (async () => {
                const res = await fetch(`http://localhost:3000/api/reviews?${params.toString()}`);
                const data = await res.json();
                let list = Array.isArray(data) ? data : (data.data || []);

                // Nếu filter tiêu cực, lọc ở frontend
                if (isNegativeFilter) {
                    list = list.filter(review => isNegativeComment(review.comment));
                }

                const totalCount = list.length;

                // Phân trang thủ công nếu filter tiêu cực
                if (isNegativeFilter) {
                    const startIdx = (pg - 1) * lim;
                    const endIdx = startIdx + lim;
                    list = list.slice(startIdx, endIdx);
                }

                return { list, totalCount };
            })();

            const [listResult, stats] = await Promise.all([
                listPromise,
                collectRatingStats({ q })
            ]);

            const enrichedList = await enrichReviewsWithOrders(listResult.list);

            setReviews(enrichedList);
            setTotal(listResult.totalCount);
            setRatingStats(stats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này không?')) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:3000/api/reviews/${reviewId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                alert('Xóa đánh giá thành công');
                // Refresh lại danh sách
                fetchReviews();
            } else {
                const data = await res.json();
                alert(data.message || 'Lỗi khi xóa đánh giá');
            }
        } catch (e) {
            console.error('Error deleting review:', e);
            alert('Lỗi khi xóa đánh giá');
        }
    };

    useEffect(() => {
        fetchReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize]);

    const onSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchReviews({ q: query, rating, page: 1 });
    };

    const openDetail = async (review) => {
        try {
            // Fetch review chi tiết
            const res = await fetch(`http://localhost:3000/api/reviews/${review._id || review.id}`);
            let reviewData = review;
            if (res.ok) {
                const data = await res.json();
                reviewData = data?._id ? data : review;
            }

            const [enriched] = await enrichReviewsWithOrders([reviewData]);
            setSelected(enriched);

            // Fetch tất cả reviews của đơn hàng này
            // Lấy orderId từ nhiều nguồn có thể
            let orderId = null;

            // Thử lấy từ enriched.orderId
            if (enriched.orderId) {
                if (typeof enriched.orderId === 'string') {
                    orderId = enriched.orderId;
                } else if (typeof enriched.orderId === 'object') {
                    orderId = enriched.orderId._id || enriched.orderId.id;
                }
            }

            // Nếu chưa có, thử lấy từ enriched.orderFetched
            if (!orderId && enriched.orderFetched) {
                if (typeof enriched.orderFetched === 'string') {
                    orderId = enriched.orderFetched;
                } else if (typeof enriched.orderFetched === 'object') {
                    orderId = enriched.orderFetched._id || enriched.orderFetched.id;
                }
            }

            console.log('🔍 Debug openDetail:', {
                'enriched.orderId': enriched.orderId,
                'enriched.orderFetched': enriched.orderFetched,
                'extracted orderId': orderId
            });

            if (orderId) {
                setLoadingOrderReviews(true);
                try {
                    console.log(`📡 Fetching reviews for order: ${orderId}`);
                    const orderReviewsRes = await fetch(`http://localhost:3000/api/reviews/order/${orderId}`);
                    console.log(`📡 Response status: ${orderReviewsRes.status}`);

                    if (orderReviewsRes.ok) {
                        const orderReviewsData = await orderReviewsRes.json();
                        console.log(`📦 Received reviews data:`, orderReviewsData);
                        const allOrderReviews = Array.isArray(orderReviewsData) ? orderReviewsData : [];
                        console.log(`✅ Total reviews found: ${allOrderReviews.length}`);
                        // Enrich với order info
                        const enrichedOrderReviews = await enrichReviewsWithOrders(allOrderReviews);
                        console.log(`✅ Enriched reviews:`, enrichedOrderReviews);
                        setOrderReviews(enrichedOrderReviews);
                    } else {
                        console.log('❌ Response not OK');
                        setOrderReviews([]);
                    }
                } catch (err) {
                    console.error('❌ Error fetching order reviews:', err);
                    setOrderReviews([]);
                } finally {
                    setLoadingOrderReviews(false);
                }
            } else {
                console.log('⚠️ No orderId found, cannot fetch order reviews');
                setOrderReviews([]);
            }
        } catch {
            const [enriched] = await enrichReviewsWithOrders([review]);
            setSelected(enriched);
            setOrderReviews([]);
        }
        setShowModal(true);
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span key={i} style={{ fontSize: 16, color: i <= rating ? '#f59e0b' : '#ddd' }}>
                    ★
                </span>
            );
        }
        return <span style={{ display: 'inline-flex', gap: 2 }}>{stars}</span>;
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0 }}>⭐ Quản lý đánh giá</h2>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13, color: '#666' }}>Tổng đánh giá</div>
                    <div style={{ color: '#1677ff', fontSize: 24, fontWeight: 700 }}>{ratingStats.total}</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13, color: '#666' }}>Đánh giá TB</div>
                    <div style={{ color: '#1677ff', fontSize: 24, fontWeight: 700 }}>{typeof ratingStats.average === 'number' ? ratingStats.average.toFixed(1) : '0.0'}</div>
                </div>
                {RATING_VALUES.map(r => (
                    <div key={r} style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13, color: '#666' }}>{r} sao</div>
                        <div style={{ color: '#1677ff', fontSize: 20, fontWeight: 700 }}>{ratingStats.counts[r] || 0}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <form onSubmit={onSearch} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                    value={query}
                    onChange={e => {
                        const v = e.target.value;
                        setQuery(v);
                        if (v.trim() === '' && rating === '') {
                            setPage(1);
                            fetchReviews({ q: '', rating: '', page: 1 });
                        }
                    }}
                    placeholder="Tìm theo tên khách hàng, mã đơn, bình luận..."
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', minWidth: 280, flex: 1 }}
                />
                <select
                    value={rating}
                    onChange={e => {
                        const rt = e.target.value;
                        setRating(rt);
                        setPage(1);
                    }}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', minWidth: 150 }}
                >
                    {RATING_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
                <button
                    type="submit"
                    style={{ padding: '8px 12px', border: 'none', background: '#1677ff', color: '#fff', borderRadius: 6, cursor: 'pointer' }}
                >
                    Tìm kiếm
                </button>
            </form>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#fafafa' }}>
                            <tr>
                                <th style={th}>Đánh giá</th>
                                <th style={th}>Khách hàng</th>
                                <th style={th}>Đơn hàng</th>
                                <th style={th}>Sản phẩm</th>
                                <th style={th}>Bình luận</th>
                                <th style={th}>Ngày tạo</th>
                                <th style={th}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center' }}>Đang tải...</td></tr>
                            ) : reviews.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center' }}>Chưa có dữ liệu</td></tr>
                            ) : (
                                reviews.map((r) => {
                                    const createdAt = r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : '';
                                    const { name: userName, phone: userPhone } = getCustomerInfoFromReview(r);
                                    const orderId = r.orderId?.code || r.orderId?._id || r.orderId || '—';
                                    const products = (r.items || []).slice(0, 2).map((it, idx) => it.name).join(', ');
                                    const moreProducts = (r.items || []).length > 2 ? ` +${(r.items || []).length - 2} sản phẩm khác` : '';
                                    const hasNegativeComment = isNegativeComment(r.comment);

                                    return (
                                        <tr key={r._id || r.id} style={hasNegativeComment ? { background: '#fff3f3' } : {}}>
                                            <td style={td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {renderStars(r.rating || 0)}
                                                    <span style={{ fontWeight: 600, color: '#1677ff' }}>({r.rating || 0}/5)</span>
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ fontWeight: 500 }}>{userName}</div>
                                                {userPhone && userPhone !== '-' && (
                                                    <div style={{ color: '#888', fontSize: 12 }}>{userPhone}</div>
                                                )}
                                            </td>
                                            <td style={td}>
                                                <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{orderId}</span>
                                            </td>
                                            <td style={td}>
                                                <div style={{ maxWidth: 200, fontSize: 13 }}>
                                                    {products || '—'}
                                                    {moreProducts && <span style={{ color: '#888' }}>{moreProducts}</span>}
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ maxWidth: 300, fontSize: 13, color: '#333' }}>
                                                    {r.comment ? (
                                                        <div>
                                                            <span title={r.comment}>
                                                                {r.comment.length > 50 ? `${r.comment.substring(0, 50)}...` : r.comment}
                                                            </span>
                                                            {hasNegativeComment && (
                                                                <span style={{
                                                                    marginLeft: 8,
                                                                    padding: '2px 6px',
                                                                    background: '#ff4d4f',
                                                                    color: '#fff',
                                                                    borderRadius: 4,
                                                                    fontSize: 11,
                                                                    fontWeight: 600
                                                                }}>
                                                                    TIÊU CỰC
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#999' }}>Không có bình luận</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ ...td, fontSize: 13, color: '#666' }}>{createdAt}</td>
                                            <td style={td}>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    <button onClick={() => openDetail(r)} style={btnLink}>Chi tiết</button>
                                                    {hasNegativeComment && (
                                                        <button
                                                            onClick={() => handleDeleteReview(r._id || r.id)}
                                                            style={{
                                                                ...btn,
                                                                background: '#ff4d4f',
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                padding: '4px 8px'
                                                            }}
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTop: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Hiển thị</span>
                        <select
                            value={pageSize}
                            onChange={e => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}
                        >
                            {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span>bản ghi/trang</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            style={pagerBtn}
                        >
                            &lt;
                        </button>
                        <span>{page}/{totalPages}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            style={pagerBtn}
                        >
                            &gt;
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {showModal && selected && (
                <div style={modalOverlay} onClick={() => {
                    setShowModal(false);
                    setOrderReviews([]);
                }}>
                    <div style={modalCard} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ margin: 0 }}>Chi tiết đánh giá</h3>
                            <button onClick={() => {
                                setShowModal(false);
                                setOrderReviews([]);
                            }} style={{ ...btn, background: '#eee', color: '#333' }}>Đóng</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                                <div><strong>Đánh giá:</strong> {renderStars(selected.rating || 0)} <span style={{ fontWeight: 600 }}>({selected.rating || 0}/5)</span></div>
                                {(() => {
                                    const { name, phone } = getCustomerInfoFromReview(selected);
                                    return (
                                        <>
                                            <div style={{ marginTop: 8 }}><strong>Tên khách hàng:</strong> {name || '—'}</div>
                                            <div><strong>Điện thoại:</strong> {phone && phone !== '-' ? phone : '—'}</div>
                                        </>
                                    );
                                })()}
                            </div>
                            <div>
                                <div><strong>Mã đơn hàng:</strong> {selected.orderId?.code || selected.orderId?._id || selected.orderId || '—'}</div>
                                <div style={{ marginTop: 8 }}><strong>Ngày tạo:</strong> {selected.createdAt ? new Date(selected.createdAt).toLocaleString('vi-VN') : '—'}</div>
                            </div>
                        </div>
                        <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginBottom: 12 }}>
                            <div><strong>Bình luận:</strong></div>
                            <div style={{ marginTop: 8, padding: 12, background: '#f8f8f9', borderRadius: 8, color: '#333', minHeight: 60 }}>
                                {selected.comment || <span style={{ color: '#999' }}>Không có bình luận</span>}
                            </div>
                        </div>
                        {/* Hiển thị tất cả reviews của đơn hàng, nhóm theo sản phẩm */}
                        {loadingOrderReviews ? (
                            <div style={{ borderTop: '1px solid #eee', paddingTop: 12, textAlign: 'center', color: '#666' }}>
                                Đang tải đánh giá...
                            </div>
                        ) : orderReviews.length > 0 ? (
                            <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
                                <div style={{ marginBottom: 12, fontSize: 16, fontWeight: 600, color: '#222' }}>
                                    Tất cả đánh giá của đơn hàng ({orderReviews.length} đánh giá)
                                </div>

                                {/* Nhóm reviews theo sản phẩm */}
                                {(() => {
                                    // Nhóm reviews theo productId + color + size
                                    const groupedReviews = new Map();

                                    orderReviews.forEach((rev) => {
                                        const productId = rev.productId?._id || rev.productId || 'unknown';

                                        if (rev.items && rev.items.length > 0) {
                                            // Review có items, duyệt qua TẤT CẢ items để nhóm
                                            rev.items.forEach((item) => {
                                                const color = String(item.color || '').trim();
                                                const size = String(item.size || '').trim();
                                                const key = `${productId}_${color}_${size}`;

                                                if (!groupedReviews.has(key)) {
                                                    groupedReviews.set(key, []);
                                                }
                                                // Lưu cả review và item cụ thể
                                                groupedReviews.get(key).push({ review: rev, item });
                                            });
                                        } else {
                                            // Review không có items, chỉ dùng productId làm key
                                            const key = `product_${productId}`;
                                            if (!groupedReviews.has(key)) {
                                                groupedReviews.set(key, []);
                                            }
                                            groupedReviews.get(key).push({ review: rev, item: null });
                                        }
                                    });

                                    return Array.from(groupedReviews.entries()).map(([key, reviewItems], groupIdx) => {
                                        const firstEntry = reviewItems[0];
                                        const firstItem = firstEntry.item;

                                        // Lấy tên sản phẩm từ item hoặc từ productId nếu có
                                        let productName = firstItem?.name || 'Sản phẩm không xác định';
                                        // Nếu không có name trong item, thử lấy từ productId (nếu có populate)
                                        if (productName === 'Sản phẩm không xác định' && firstEntry.review.productId) {
                                            const product = firstEntry.review.productId;
                                            if (typeof product === 'object' && product.name) {
                                                productName = product.name;
                                            }
                                        }

                                        const productColor = firstItem?.color || '';
                                        const productSize = firstItem?.size || '';

                                        return (
                                            <div key={key} style={{
                                                marginBottom: 20,
                                                padding: 16,
                                                background: '#f8f9fa',
                                                borderRadius: 8,
                                                border: '1px solid #e5e7eb'
                                            }}>
                                                <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #e5e7eb' }}>
                                                    <div style={{ fontSize: 15, fontWeight: 600, color: '#222', marginBottom: 4 }}>
                                                        {productName}
                                                    </div>
                                                    {(productColor || productSize) && (
                                                        <div style={{ fontSize: 13, color: '#666' }}>
                                                            {[productSize, productColor].filter(Boolean).join(', ')}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Hiển thị tất cả reviews cho sản phẩm này */}
                                                {reviewItems.map((entry, revIdx) => {
                                                    const rev = entry.review;
                                                    return (
                                                        <div key={revIdx} style={{
                                                            marginBottom: revIdx < reviewItems.length - 1 ? 16 : 0,
                                                            paddingBottom: revIdx < reviewItems.length - 1 ? 16 : 0,
                                                            borderBottom: revIdx < reviewItems.length - 1 ? '1px solid #e5e7eb' : 'none'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                                {renderStars(rev.rating || 0)}
                                                                <span style={{ fontWeight: 600, color: '#1677ff' }}>({rev.rating || 0}/5)</span>
                                                                {rev.createdAt && (
                                                                    <span style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>
                                                                        {new Date(rev.createdAt).toLocaleString('vi-VN')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {rev.comment && (
                                                                <div style={{
                                                                    padding: 10,
                                                                    background: '#fff',
                                                                    borderRadius: 6,
                                                                    color: '#333',
                                                                    fontSize: 13,
                                                                    lineHeight: 1.5
                                                                }}>
                                                                    {rev.comment}
                                                                </div>
                                                            )}
                                                            {!rev.comment && (
                                                                <div style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>
                                                                    Không có bình luận
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        ) : selected.items && selected.items.length > 0 ? (
                            <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
                                <div style={{ marginBottom: 8 }}><strong>Sản phẩm được đánh giá:</strong></div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...th, fontSize: 13 }}>Sản phẩm</th>
                                            <th style={{ ...th, fontSize: 13 }}>Thuộc tính</th>
                                            <th style={{ ...th, fontSize: 13 }}>SL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selected.items || []).map((it, idx) => (
                                            <tr key={idx}>
                                                <td style={{ ...td, fontSize: 13 }}>{it.name}</td>
                                                <td style={{ ...td, fontSize: 13 }}>{[it.size, it.color].filter(Boolean).join(', ') || '—'}</td>
                                                <td style={{ ...td, fontSize: 13 }}>{it.qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}

const th = { textAlign: 'left', padding: 12, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' };
const td = { padding: 12, borderBottom: '1px solid #f3f3f3', verticalAlign: 'top' };
const btn = { padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer' };
const btnLink = { ...btn, background: 'transparent', color: '#1677ff', padding: 0, textDecoration: 'underline' };
const pagerBtn = { padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalCard = { background: '#fff', borderRadius: 12, padding: 16, width: 800, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' };

