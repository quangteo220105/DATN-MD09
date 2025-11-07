import React, { useEffect, useState } from "react";

const RATING_OPTIONS = [
    { value: "", label: "Tất cả" },
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

    const fetchReviews = async (override = {}) => {
        try {
            setLoading(true);
            const q = Object.prototype.hasOwnProperty.call(override, 'q') ? override.q : query;
            const rt = Object.prototype.hasOwnProperty.call(override, 'rating') ? override.rating : rating;
            const pg = Object.prototype.hasOwnProperty.call(override, 'page') ? override.page : page;
            const lim = Object.prototype.hasOwnProperty.call(override, 'limit') ? override.limit : pageSize;

            const params = new URLSearchParams({
                page: String(pg),
                limit: String(lim),
            });
            if ((q || '').trim()) params.append("q", (q || '').trim());
            if (rt) params.append("rating", rt);

            const listPromise = (async () => {
                const res = await fetch(`http://localhost:3000/api/reviews?${params.toString()}`);
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.data || []);
                const totalCount = Array.isArray(data) ? list.length : (data.total || list.length);
                return { list, totalCount };
            })();

            const [listResult, stats] = await Promise.all([
                listPromise,
                collectRatingStats({ q })
            ]);

            setReviews(listResult.list);
            setTotal(listResult.totalCount);
            setRatingStats(stats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
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

    const handleDelete = async (reviewId) => {
        if (!window.confirm('Bạn có chắc muốn xóa đánh giá này?')) {
            return;
        }
        try {
            const res = await fetch(`http://localhost:3000/api/reviews/${reviewId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete review');
            setReviews(prev => prev.filter(r => (r._id || r.id) !== reviewId));
            alert('Xóa đánh giá thành công');
        } catch (e) {
            console.error(e);
            alert('Xóa đánh giá thất bại');
        }
    };

    const openDetail = async (review) => {
        try {
            const res = await fetch(`http://localhost:3000/api/reviews/${review._id || review.id}`);
            if (res.ok) {
                const data = await res.json();
                setSelected(data?._id ? data : review);
            } else {
                setSelected(review);
            }
        } catch {
            setSelected(review);
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
            <h2 style={{ margin: 0 }}>Quản lý đánh giá</h2>

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
                                    const userName = r.userId?.name || r.userName || r.user?.name || 'Khách hàng';
                                    const orderId = r.orderId?.code || r.orderId?._id || r.orderId || '—';
                                    const products = (r.items || []).slice(0, 2).map((it, idx) => it.name).join(', ');
                                    const moreProducts = (r.items || []).length > 2 ? ` +${(r.items || []).length - 2} sản phẩm khác` : '';

                                    return (
                                        <tr key={r._id || r.id}>
                                            <td style={td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {renderStars(r.rating || 0)}
                                                    <span style={{ fontWeight: 600, color: '#1677ff' }}>({r.rating || 0}/5)</span>
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ fontWeight: 500 }}>{userName}</div>
                                                {r.userId?.phone && (
                                                    <div style={{ color: '#888', fontSize: 12 }}>{r.userId.phone}</div>
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
                                                        <span title={r.comment}>
                                                            {r.comment.length > 50 ? `${r.comment.substring(0, 50)}...` : r.comment}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#999' }}>Không có bình luận</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ ...td, fontSize: 13, color: '#666' }}>{createdAt}</td>
                                            <td style={td}>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    <button onClick={() => openDetail(r)} style={btnLink}>Chi tiết</button>
                                                    <button onClick={() => handleDelete(r._id || r.id)} style={{ ...btnLink, color: '#ef4444' }}>Xóa</button>
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
                <div style={modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={modalCard} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ margin: 0 }}>Chi tiết đánh giá</h3>
                            <button onClick={() => setShowModal(false)} style={{ ...btn, background: '#eee', color: '#333' }}>Đóng</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                                <div><strong>Đánh giá:</strong> {renderStars(selected.rating || 0)} <span style={{ fontWeight: 600 }}>({selected.rating || 0}/5)</span></div>
                                <div style={{ marginTop: 8 }}><strong>Tên khách hàng:</strong> {selected.userId?.name || selected.userName || selected.user?.name || '—'}</div>
                                <div><strong>Điện thoại:</strong> {selected.userId?.phone || selected.user?.phone || '—'}</div>
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
                        {selected.items && selected.items.length > 0 && (
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
                        )}
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

