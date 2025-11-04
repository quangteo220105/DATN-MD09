import React, { useRef, useState, useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  ts: number;
}

type Budget = 'under1m' | '1to2m' | 'over2m' | null;

interface ContextState {
  purpose: string | null; // chạy, đi học, đi làm, casual
  brand: string | null;   // adidas, nike, vans, converse
  size: number | null;    // cm
  budget: Budget;
  color: string | null;
}

const initialState: ContextState = {
  purpose: null,
  brand: null,
  size: null,
  budget: null,
  color: null,
};

function parseNumber(text: string): number | null {
  const m = text.match(/(\d+(?:[\.,]\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1].replace(',', '.'));
}

function detectBudget(text: string): Budget | null {
  const t = text.toLowerCase();
  if (/(dưới|<|<=|under|below).*1\s*(tr|triệu|m)/.test(t) || /(\b1\s*m\b)/.test(t)) return 'under1m';
  if (/(1\s*-\s*2\s*tr|1-2tr|1 đến 2tr|1 to 2m|1\s*triệu\s*đến\s*2\s*triệu)/.test(t)) return '1to2m';
  if (/(>\s*2\s*tr|trên\s*2\s*triệu|over 2m|more than 2m)/.test(t)) return 'over2m';
  return null;
}

function detectBrand(text: string): string | null {
  const t = text.toLowerCase();
  if (/adidas/.test(t)) return 'adidas';
  if (/nike/.test(t)) return 'nike';
  if (/vans/.test(t)) return 'vans';
  if (/converse/.test(t)) return 'converse';
  return null;
}

function detectPurpose(text: string): string | null {
  const t = text.toLowerCase();
  if (/(chạy|running)/.test(t)) return 'running';
  if (/(đi học|đi làm|casual|đi chơi)/.test(t)) return 'casual';
  if (/(tập gym|gym|training)/.test(t)) return 'training';
  return null;
}

function detectColor(text: string): string | null {
  const t = text.toLowerCase();
  const colors = ['trắng','đen','xanh','đỏ','vàng','hồng','nâu','xám','white','black','blue','red','yellow','pink','brown','grey','gray'];
  const found = colors.find(c => t.includes(c));
  return found || null;
}

function parseSizeCm(text: string): number | null {
  // e.g., 26 cm, 25.5cm
  const m = text.toLowerCase().match(/(\d+(?:[\.,]\d+)?)\s*cm/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

function humanBudget(b: Budget): string {
  if (b === 'under1m') return 'dưới 1 triệu';
  if (b === '1to2m') return '1 - 2 triệu';
  if (b === 'over2m') return 'trên 2 triệu';
  return '';
}

export default function ChatAIScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'm0', role: 'ai', text: 'Xin chào! Mình là trợ lý tư vấn giày. Hãy cho mình biết mục đích, tầm giá, size, thương hiệu bạn thích để mình gợi ý nhé.', ts: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [ctx, setCtx] = useState<ContextState>(initialState);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const ctxSummary = useMemo(() => {
    const parts: string[] = [];
    if (ctx.purpose) parts.push(`mục đích ${ctx.purpose}`);
    if (ctx.brand) parts.push(`thương hiệu ${ctx.brand}`);
    if (ctx.budget) parts.push(`tầm giá ${humanBudget(ctx.budget)}`);
    if (ctx.size) parts.push(`size ~ ${ctx.size} cm`);
    if (ctx.color) parts.push(`màu ${ctx.color}`);
    return parts.length ? `(${parts.join(', ')})` : '';
  }, [ctx]);

  const updateContext = (text: string) => {
    setCtx(prev => {
      const next: ContextState = { ...prev };
      next.brand = prev.brand || detectBrand(text) || null;
      next.purpose = prev.purpose || detectPurpose(text) || null;
      next.color = prev.color || detectColor(text) || null;
      next.budget = prev.budget || detectBudget(text) || null;
      const s = parseSizeCm(text) || parseNumber(text);
      if (!prev.size && s && s >= 20 && s <= 32) next.size = s;
      return next;
    });
  };

  const fetchRecommendations = async (): Promise<string> => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/products`);
      const list: any[] = Array.isArray(res.data) ? res.data : [];

      // Score each product by how well it matches context
      const scored = list.map(p => {
        const name = `${p.name || ''} ${p.brand || ''} ${(p.description || '')}`.toLowerCase();
        const brandScore = ctx.brand ? (name.includes(ctx.brand) ? 2 : 0) : 0;
        const purposeScore = ctx.purpose ? (/running/.test(ctx.purpose) ? /run|chạy|pegasus|ultraboost/.test(name) ? 2 : 0 : /casual|stan smith|air force/.test(name) ? 1 : 0) : 0;
        const colorScore = ctx.color ? (name.includes(ctx.color) ? 1 : 0) : 0;
        // From variants, compute min price and if within budget
        const variants = Array.isArray(p.variants) ? p.variants : [];
        const prices = variants.map((v: any) => Number(v.currentPrice || v.originalPrice || 0)).filter((n: number) => n > 0);
        const minPrice = prices.length ? Math.min(...prices) : 0;
        let budgetScore = 0;
        if (ctx.budget && minPrice) {
          if (ctx.budget === 'under1m' && minPrice < 1000000) budgetScore = 2;
          if (ctx.budget === '1to2m' && minPrice >= 1000000 && minPrice <= 2000000) budgetScore = 2;
          if (ctx.budget === 'over2m' && minPrice > 2000000) budgetScore = 2;
        }
        // Size availability
        const sizeOk = ctx.size ? (() => {
          const wanted = String(Math.round((ctx.size as number) * 10) / 10);
          return variants.some((v: any) => String(v.size).includes(wanted));
        })() : true;
        const sizeScore = sizeOk ? 1 : 0;
        const score = brandScore + purposeScore + colorScore + budgetScore + sizeScore;
        return { p, score, minPrice };
      }).sort((a, b) => b.score - a.score || a.minPrice - b.minPrice);

      const top = scored.filter(s => s.score > 0).slice(0, 3);
      if (!top.length) {
        return 'Mình chưa tìm thấy mẫu phù hợp ngay. Bạn có thể cho mình thêm thông tin (mục đích chạy/casual, tầm giá, thương hiệu, size/cm, màu thích) nhé!';
      }

      const lines = top.map((t, i) => `#${i+1} ${t.p.name}${t.minPrice ? ` ~ ${Math.round(t.minPrice/1000)}k` : ''}`);
      return `Gợi ý theo nhu cầu ${ctxSummary}:\n${lines.join('\n')}\nBạn muốn xem chi tiết mẫu nào không?`;
    } catch (e) {
      return 'Hiện mình không lấy được danh sách sản phẩm. Bạn thử lại sau nhé!';
    } finally {
      setLoading(false);
    }
  };

  const generateReply = async (text: string): Promise<string> => {
    updateContext(text);

    // If the message asks for recommendation or provides key info, try to recommend
    const t = text.toLowerCase();
    const wantsSuggest = /(tư vấn|gợi ý|suggest|nên mua|mẫu nào|loại nào|nên chọn)/.test(t) || detectBudget(t) || detectBrand(t) || detectPurpose(t) || parseSizeCm(t);
    if (wantsSuggest) {
      return await fetchRecommendations();
    }

    // Otherwise answer conversationally and show what info we still need
    const missing: string[] = [];
    if (!ctx.purpose) missing.push('mục đích (chạy, casual, gym)');
    if (!ctx.budget) missing.push('tầm giá (dưới 1tr / 1-2tr / trên 2tr)');
    if (!ctx.size) missing.push('size theo cm (ví dụ 26 cm)');
    if (!ctx.brand) missing.push('thương hiệu ưa thích');

    if (missing.length) {
      return `Mình đã ghi nhận ${ctxSummary || 'yêu cầu'}.
Bạn bổ sung giúp: ${missing.join(', ')} để mình gợi ý chuẩn hơn nhé.`;
    }

    // If everything present, recommend
    return await fetchRecommendations();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { id: String(Date.now()), role: 'user', text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    const replyText = await generateReply(text);
    const aiMsg: Message = { id: String(Date.now() + 1), role: 'ai', text: replyText, ts: Date.now() + 1 };
    setMessages(prev => [...prev, aiMsg]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tư vấn mua hàng (AI)</Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.messages} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {messages.map(m => (
          <View key={m.id} style={[styles.row, m.role === 'user' ? styles.rowRight : styles.rowLeft]}>
            <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
              <Text style={[styles.text, m.role === 'user' ? styles.textUser : styles.textAI]}>{m.text}</Text>
              <Text style={styles.time}>{new Date(m.ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={loading ? 'Đang tìm mẫu phù hợp...' : 'Nhập câu hỏi...'}
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity onPress={send} style={[styles.sendBtn, loading && { opacity: 0.6 }]} disabled={loading}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  messages: { flex: 1, padding: 16 },
  row: { marginBottom: 12 },
  rowRight: { alignItems: 'flex-end' },
  rowLeft: { alignItems: 'flex-start' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 14 },
  bubbleUser: { backgroundColor: '#007bff', borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  text: { fontSize: 14 },
  textUser: { color: '#fff' },
  textAI: { color: '#222' },
  time: { fontSize: 10, opacity: 0.7, marginTop: 4 },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderColor: '#d0d0d0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007bff', alignItems: 'center', justifyContent: 'center' }
});
