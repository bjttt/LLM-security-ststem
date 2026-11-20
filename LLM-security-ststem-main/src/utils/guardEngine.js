/**
 * 输入端内容防护 · 前端演示引擎
 * ---------------------------------------------------------------------------
 * 本文件把论文中的「对比检测—记忆追踪—语义改写」流水线映射为可交互的前端演示：
 *   1. 三元组特征：意图流 128 维 + 实体流 64 维 + 情感流 32 维 = 224 维混合向量；
 *   2. 双原型对比：输出单轮风险分、Token 级恶意分 p_i 与正常/攻击原型距离；
 *   3. 风险决策：低风险放行 / 中风险改写 / 高风险阻断（阈值可调）；
 *   4. 语义保持的 Token 级改写：p_i ≥ θ 掩码为「§」，按片段的语义类型做局部填空；
 *   5. 跨轮风险记忆：V/S/C 三元组、意图漂移 D_t、实体敏感累积 E_t、门控时序判定。
 *
 * 真实的编码器 / GRU / T5-small 由后端模型服务提供；此处用确定性的规则 + 特征
 * 哈希近似实现同一套接口与可视化所需的数据结构，便于在没有推理服务时演示交互。
 * 接入真实服务时，只需让后端返回同名字段（见 `analyzePrompt` 的返回值）。
 */

export const DEFAULT_THRESHOLDS = Object.freeze({
  mask: 0.35,   // 掩码阈值 θ：p_i ≥ θ 视为「需改写」token
  low: 0.45,    // 低风险上界 θ1
  high: 0.72,   // 高风险下界 θ2
  window: 3,    // 抗污染校验滑动窗口 w
})

export const LEVEL_META = Object.freeze({
  low: { label: '低风险', action: '直接放行', tone: 'safe' },
  mid: { label: '中风险', action: '触发改写', tone: 'warn' },
  high: { label: '高风险', action: '保守删除 + 阻断', tone: 'danger' },
})

/* -------------------------------------------------------------------------- */
/* 词表与规则                                                                  */
/* -------------------------------------------------------------------------- */

/** 每条规则：词条、权重、通道类型、命中的策略标签 */
const RULES = [
  // 指令覆盖 / 越狱
  { type: '注入', strategy: '指令覆盖/越狱', weight: 0.46, words: ['忽略', '无视', '绕过', '越狱', 'jailbreak', '开发者模式', 'DAN', '不受限制', '无限制', '不受约束', '系统提示', '提示词', '覆盖指令', '忘记你', '从现在起', '安全策略', '解锁', '模拟模式', '管理员模式'] },
  // 角色扮演 / 虚构框架
  { type: '角色', strategy: '角色扮演/虚构框架', weight: 0.24, words: ['扮演', '伪装', '假设你', '假如你', '你现在是', '小说', '剧本', '虚构', '反派', '角色', '设定', '情景', '故事', '作家', '人设', '剧情', '台词', '描写', '场景', '情节', '桥段'] },
  // 敏感实体
  { type: '实体', strategy: '敏感实体索取', weight: 0.34, words: ['配方', '比例', '合成', '制作', '制取', '提炼', '试剂', '危险品', '炸药', '炸弹', '毒品', '枪支', '弹药', '剧毒', '燃烧', '爆炸', '腐蚀', '诈骗', '洗钱', '入侵', '木马', '勒索', '身份证', '银行卡', '手机号', '密码', '违禁', '管制', '麻醉', '迷药', '监听', '跟踪', '残忍', '血腥'] },
  // 诱导 / 索取细节
  { type: '诱导', strategy: '登门槛诱导', weight: 0.2, words: ['直接告诉', '详细描述', '详细说明', '教教我', '步骤', '流程', '具体', '细节', '名单', '过程', '方法', '怎么弄', '如何获取', '给我一份'] },
  // 情绪施压
  { type: '情绪', strategy: '情绪施压', weight: 0.24, words: ['必须', '立刻', '马上', '否则', '废物', '蠢', '恨', '报复', '威胁', '恐吓', '去死', '滚', '垃圾'] },
]

const RULE_BY_WORD = new Map()
for (const rule of RULES) {
  for (const word of rule.words) {
    const key = word.toLowerCase()
    if (!RULE_BY_WORD.has(key)) RULE_BY_WORD.set(key, [])
    RULE_BY_WORD.get(key).push(rule)
  }
}

/** 掩码片段被识别的边界词，用于把「诈骗 + 犯」合并成一个语义片段 */
const SPAN_SUFFIXES = ['犯', '者', '师', '手', '分子', '团伙', '集团', '画面', '细节', '过程', '内容', '顺序', '清单']

/** 片段改写词表：按危险片段的主类型替换为安全、可继续回答的表述 */
const SAFE_FILL = {
  暴力: '历史背景',
  诈骗: '常见案例',
  角色: '普通角色',
  危险品: '公开资料',
  注入: '常规说明',
  诱导: '一般介绍',
  情绪: '平和的表述',
  默认: '相关内容',
}

const VIOLENCE_HINTS = ['残忍', '血腥', '暴力', '屠杀', '虐待', '尸体', '斩首', '肢解', '自残', '自杀']
const FRAUD_HINTS = ['诈骗', '骗局', '洗钱', '钓鱼', '盗号', '碰瓷']
const WEAPON_HINTS = ['炸药', '炸弹', '毒品', '枪支', '弹药', '剧毒', '迷药', '制毒', '配方', '试剂', '危险品', '合成']

const STRATEGY_ORDER = ['指令覆盖/越狱', '角色扮演/虚构框架', '敏感实体索取', '登门槛诱导', '变体编码规避', '情绪施压']

/** 「登门槛」式的强索取词：出现时才解除虚构语境的降权 */
const GATE_WORDS = ['直接告诉', '详细描述', '详细说明', '教教我', '步骤', '流程', '比例', '合成顺序', '怎么弄', '如何获取', '给我一份', '配方']

/** 双用途实体：在小说/剧本语境下可以合法讨论，需要降权；赤裸的违法请求则不打折 */
const DUAL_USE = ['配方', '比例', '合成', '制作', '制取', '提炼', '试剂', '危险品', '炸药', '炸弹', '燃烧', '爆炸', '腐蚀', '管制', '麻醉']

/* -------------------------------------------------------------------------- */
/* 基础工具                                                                    */
/* -------------------------------------------------------------------------- */

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const round = (value, digits = 3) => Number(value.toFixed(digits))
const sigmoid = (x) => 1 / (1 + Math.exp(-x))

function fnv1a(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function hashUnit(str) {
  return (fnv1a(str) % 1000) / 1000
}

function cosineDistance(a, b) {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (!normA || !normB) return 0
  return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

const TOKEN_RE = /[\u3400-\u9fff\uf900-\ufaff]|[A-Za-z0-9_@.+/=-]{1,}|[\s]+|[^\s]/gu

/** 把输入切成 Token：中文按字、英文/数字按词、空白与标点单独成 Token */
export function tokenize(text) {
  const tokens = []
  let match
  TOKEN_RE.lastIndex = 0
  while ((match = TOKEN_RE.exec(text)) !== null) {
    const value = match[0]
    tokens.push({
      text: value,
      start: match.index,
      end: match.index + value.length,
      space: /^\s+$/.test(value),
      p: 0,
      type: '无',
      hits: [],
      reason: '',
    })
  }
  return tokens
}

/** 哈希 n-gram 到指定区间，保留「同义不同形」的分布差异 */
function addHashed(vec, from, size, text, weight) {
  const chars = Array.from(text)
  for (let i = 0; i < chars.length; i += 1) {
    const gram = chars[i] + (chars[i + 1] || '')
    vec[from + (fnv1a(`g:${gram}`) % size)] += weight
  }
}

function normalizeRange(vec, from, to) {
  let norm = 0
  for (let i = from; i < to; i += 1) norm += vec[i] * vec[i]
  norm = Math.sqrt(norm)
  if (!norm) return
  for (let i = from; i < to; i += 1) vec[i] /= norm
}

/* -------------------------------------------------------------------------- */
/* 特征与打分                                                                  */
/* -------------------------------------------------------------------------- */

function detectVariants(text) {
  const notes = []
  let boost = 0

  if (/[\u200b-\u200f\u2060\ufeff]/.test(text)) {
    notes.push({ label: '零宽字符', detail: '检测到不可见字符，可能用于切分敏感词', weight: 0.22 })
    boost += 0.06
  }

  if (/[A-Za-z0-9+/]{24,}={0,2}/.test(text)) {
    notes.push({ label: 'Base64 嵌套', detail: '检测到长 Base64 串，可能承载编码后的恶意指令', weight: 0.3 })
    boost += 0.13
  }

  const spaced = text.match(/[\u4e00-\u9fa5][ \u3000·．\-_*]{1,3}(?=[\u4e00-\u9fa5])/g) || []
  if (spaced.length >= 3) {
    notes.push({ label: '分隔符分片', detail: `发现 ${spaced.length} 处分隔书写的汉字，疑似规避关键词匹配`, weight: 0.18 })
    boost += 0.05
  }

  if (/[\u{1f300}-\u{1faff}\u{2600}-\u{27bf}]/u.test(text)) {
    notes.push({ label: 'Emoji 夹杂', detail: '表情符号可能被用作敏感词的间隔符或情绪诱导', weight: 0.12 })
    boost += 0.03
  }

  if (/\b(?:zhadan|dupin|qiangzhi|mazui|zha(?:yao)?|dama|yueyu)\b/i.test(text)) {
    notes.push({ label: '拼音替代', detail: '检测到拼音书写的敏感实体', weight: 0.3 })
    boost += 0.08
  }

  return { notes, boost }
}

/** 规则匹配：原文逐字匹配 + 去空白后的紧凑文本匹配（应对分片规避） */
function applyRules(text, tokens, flags) {
  const compactMap = []
  let compact = ''
  tokens.forEach((token, index) => {
    if (token.space) return
    for (const char of Array.from(token.text)) {
      compact += char
      compactMap.push(index)
    }
  })

  const seen = new Set()
  const sources = [
    { text: text.toLowerCase(), map: null },
    { text: compact.toLowerCase(), map: compactMap },
  ]

  for (const [word, rules] of RULE_BY_WORD) {
    for (const source of sources) {
      let cursor = 0
      while (cursor <= source.text.length) {
        const index = source.text.indexOf(word, cursor)
        if (index === -1) break
        const end = index + word.length
        const covered = source.map
          ? [...new Set(source.map.slice(index, end))]
          : tokens
            .map((token, tokenIndex) => ({ token, tokenIndex }))
            .filter(({ token }) => token.start < end && token.end > index)
            .map(({ tokenIndex }) => tokenIndex)

        for (const rule of rules) {
          const dualUse = rule.type === '实体' && DUAL_USE.includes(word)
          const contextFactor = dualUse ? (flags.gate ? 1.06 : flags.fiction ? 0.64 : 1) : 1
          for (const tokenIndex of covered) {
            const token = tokens[tokenIndex]
            const key = `${tokenIndex}|${word}|${rule.type}`
            if (seen.has(key)) continue
            seen.add(key)
            token.hits.push({ type: rule.type, strategy: rule.strategy, word, weight: rule.weight * contextFactor })
          }
        }
        cursor = end
      }
    }
  }

  // 长 Base64 串作为编码变体直接参与打分与掩码
  for (const token of tokens) {
    if (/^[A-Za-z0-9+/]{24,}={0,2}$/.test(token.text)) {
      token.hits.push({ type: '编码', strategy: '变体编码规避', word: 'Base64 串', weight: 0.5 })
    }
  }
}

function resolveTokens(tokens, thresholds) {
  for (const token of tokens) {
    if (!token.hits.length) {
      // 未命中的 Token 也保留一点点波动，热力图更接近真实打分
      token.p = round(0.015 + hashUnit(token.text) * 0.05)
      token.reason = '未命中风险词表'
      continue
    }
    const byType = new Map()
    for (const hit of token.hits) {
      const weighted = hit.weight + (hit.weight >= 0.4 ? 0.08 : 0.03)
      byType.set(hit.type, Math.max(byType.get(hit.type) || 0, weighted))
    }
    // 概率并集，避免同词多规则重复叠加
    let miss = 1
    for (const weight of byType.values()) miss *= 1 - clamp(weight, 0, 0.95)
    token.p = round(clamp(1 - miss + 0.02, 0, 0.97))
    const top = [...token.hits].sort((a, b) => b.weight - a.weight)[0]
    token.type = top.type
    token.reason = `命中「${top.word}」· ${top.type}通道`
  }

  // 上下文平滑：邻近风险 Token 会轻微抬高自身分数
  const smoothed = tokens.map((token, index) => {
    if (token.p >= thresholds.mask) return token.p
    const neighbours = [tokens[index - 1], tokens[index + 1]].filter(Boolean)
    const peak = neighbours.reduce((max, item) => Math.max(max, item.p), 0)
    if (peak < thresholds.mask) return token.p
    return round(Math.max(token.p, peak * 0.3))
  })
  tokens.forEach((token, index) => { token.p = smoothed[index] })
  return tokens
}

function buildStrategies(tokens, variants) {
  const found = new Set()
  for (const token of tokens) {
    for (const hit of token.hits) found.add(hit.strategy)
  }
  if (variants.notes.length) found.add('变体编码规避')
  const list = STRATEGY_ORDER.filter((name) => found.has(name))
  return list.length ? list : ['无']
}

function buildChannels(tokens) {
  const sum = (types) => tokens.filter((token) => types.includes(token.type)).reduce((total, token) => total + token.p, 0)
  const intent = clamp(sum(['注入', '角色', '编码']) / 5.2)
  const entity = clamp(sum(['实体']) / 4)
  const sentiment = clamp(sum(['情绪']) / 1 + (tokens.some((token) => token.text === '！' || token.text === '!') ? 0.08 : 0))
  return {
    intent: { key: 'intent', label: '意图流', model: 'DeBERTa-CLS', dims: 128, score: round(intent) },
    entity: { key: 'entity', label: '实体流', model: 'RoBERTa-wwm-ext + LSTM', dims: 64, score: round(entity) },
    sentiment: { key: 'sentiment', label: '情感流', model: '情感词典 + BERT', dims: 32, score: round(sentiment) },
  }
}

function buildVector(tokens) {
  const vector = new Array(224).fill(0)
  addHashed(vector, 0, 128, tokens.map((token) => token.text).join(''), 1)
  for (const token of tokens) {
    if (token.hits.length) vector[128 + (fnv1a(`e:${token.text}`) % 64)] += token.p
    if (token.type === '情绪') vector[192 + (fnv1a(`s:${token.text}`) % 32)] += token.p
  }
  normalizeRange(vector, 0, 128)
  normalizeRange(vector, 128, 192)
  normalizeRange(vector, 192, 224)
  // 三个子空间的权重与论文一致：意图 128 / 实体 64 / 情感 32
  for (let i = 128; i < 192; i += 1) vector[i] *= 0.78
  for (let i = 192; i < 224; i += 1) vector[i] *= 0.6
  return vector
}

function computeRisk(tokens, variants, strategies) {
  const scores = tokens.map((token) => token.p).sort((a, b) => b - a)
  const peak = scores[0] || 0
  const top3 = scores.slice(0, 3).reduce((total, value) => total + value, 0) / Math.max(1, Math.min(3, scores.length))
  const risky = tokens.filter((token) => token.p >= 0.3).length
  const strategyCount = strategies[0] === '无' ? 0 : strategies.length
  let score = 0.45 * peak + 0.35 * top3 + 0.07 * Math.min(strategyCount, 3) + 0.06 * Math.min(risky / 6, 1) + variants.boost
  if (strategies.includes('指令覆盖/越狱')) score += 0.08
  return round(clamp(score))
}

function pickLevel(score, thresholds) {
  if (score >= thresholds.high) return 'high'
  if (score >= thresholds.low) return 'mid'
  return 'low'
}

/* -------------------------------------------------------------------------- */
/* 局部改写                                                                    */
/* -------------------------------------------------------------------------- */

function fillFor(spanText, type) {
  if (VIOLENCE_HINTS.some((word) => spanText.includes(word))) return SAFE_FILL.暴力
  if (type === '编码') return SAFE_FILL.注入
  if (type === '实体' && FRAUD_HINTS.some((word) => spanText.includes(word))) {
    return /[犯者师手]$/.test(spanText) ? SAFE_FILL.角色 : SAFE_FILL.诈骗
  }
  if (type === '实体' && WEAPON_HINTS.some((word) => spanText.includes(word))) return SAFE_FILL.危险品
  if (type === '注入') return SAFE_FILL.注入
  if (type === '角色') return SAFE_FILL.角色
  if (type === '诱导') return SAFE_FILL.诱导
  if (type === '情绪') return SAFE_FILL.情绪
  return SAFE_FILL.默认
}

function groupMaskedSpans(tokens, thresholds) {
  const spans = []
  let current = null
  tokens.forEach((token, index) => {
    if (token.space) return
    const masked = token.p >= thresholds.mask
    if (!masked) {
      current = null
      return
    }
    if (current && tokens.slice(current.last + 1, index).every((item) => item.space)) {
      current.last = index
      current.tokens.push(token)
    } else {
      current = { first: index, last: index, tokens: [token] }
      spans.push(current)
    }
  })

  return spans.map((span) => {
    // 把「诈骗 + 犯」「残忍 + 画面」这类后缀并入同一片段，避免改写后出现断句
    let last = span.last
    let extended = true
    while (extended && last + 1 < tokens.length) {
      extended = false
      for (const suffix of SPAN_SUFFIXES) {
        const chars = tokens.slice(last + 1, last + 1 + suffix.length)
        if (chars.length === suffix.length && chars.map((token) => token.text).join('') === suffix) {
          last += suffix.length
          span.tokens.push(...chars)
          extended = true
          break
        }
      }
    }
    span.last = last

    const text = span.tokens.map((token) => token.text).join('')
    const counts = new Map()
    for (const token of span.tokens) {
      for (const hit of token.hits) counts.set(hit.type, (counts.get(hit.type) || 0) + 1)
    }
    const type = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '无'
    const p = Math.max(...span.tokens.map((token) => token.p))
    return { ...span, text, type, p, fill: fillFor(text, type) }
  })
}

function rewriteWithSpans(tokens, spans) {
  const byFirst = new Map(spans.map((span) => [span.first, span]))
  const skipping = new Set()
  const segments = []
  const replacements = []
  let text = ''

  tokens.forEach((token, index) => {
    if (skipping.has(index)) return
    const span = byFirst.get(index)
    if (span) {
      for (let i = span.first; i <= span.last; i += 1) skipping.add(i)
      // 连续两个片段被填成同一个词时，第二个降级为泛化表述，避免复读
      const fill = replacements.length && replacements[replacements.length - 1].to === span.fill ? SAFE_FILL.默认 : span.fill
      replacements.push({ from: span.text, to: fill, type: span.type })
      segments.push({ text: fill, changed: true, type: span.type, origin: span.text })
      text += fill
      return
    }
    segments.push({ text: token.text, changed: false, type: '无' })
    text += token.text
  })

  return { text, segments, replacements }
}

/* -------------------------------------------------------------------------- */
/* 单轮分析                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * 分析一段 Prompt（单轮）
 * @param {string} text 原始输入
 * @param {object} options { thresholds, internal }
 * @returns {object|null} 分析结果，空输入返回 null
 */
export function analyzePrompt(text, options = {}) {
  const trimmed = String(text ?? '')
  if (!trimmed.trim()) return null
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds || {}) }

  const tokens = tokenize(trimmed)
  const variants = detectVariants(trimmed)

  // 语境标记：只有「虚构框架 + 索取细节」同时出现时才按真实攻击给实体加权，
  // 单独的小说/剧本讨论不应被误判为攻击，这对应论文中「对正常意图友好」的要求。
  const lower = trimmed.toLowerCase()
  const hasRole = RULES[1].words.some((word) => lower.includes(word.toLowerCase()))
  const hasGate = GATE_WORDS.some((word) => lower.includes(word.toLowerCase()))
  const flags = { role: hasRole, gate: hasGate, fiction: hasRole && !hasGate }

  applyRules(trimmed, tokens, flags)
  resolveTokens(tokens, thresholds)

  const strategies = buildStrategies(tokens, variants)
  const channels = buildChannels(tokens)
  const vector = buildVector(tokens)
  const riskScore = computeRisk(tokens, variants, strategies)
  const level = pickLevel(riskScore, thresholds)

  const spans = groupMaskedSpans(tokens, thresholds)
  let maskedText = ''
  tokens.forEach((token, index) => {
    const span = spans.find((item) => index >= item.first && index <= item.last)
    if (!span) { maskedText += token.text; return }
    if (index === span.first) maskedText += '§'
  })

  let rewrite = null
  if (spans.length && !options.internal) {
    const draft = rewriteWithSpans(tokens, spans)
    const recheck = analyzePrompt(draft.text, { thresholds, internal: true })
    const changedChars = spans.reduce((total, span) => total + span.text.length, 0)
    const preserved = round(clamp(1 - (changedChars / Math.max(1, trimmed.length)) * 0.55, 0.86, 0.99))
    const stillRisky = Boolean(recheck && recheck.riskScore >= thresholds.high)
    const conservativeText = tokens
      .filter((token, index) => !spans.some((span) => index >= span.first && index <= span.last))
      .map((token) => token.text)
      .join('')
    rewrite = {
      ...draft,
      preserved,
      originalRisk: riskScore,
      riskScore: recheck ? recheck.riskScore : 0,
      conservative: stillRisky,
      // 极端情况下退化为「保守删除」：直接移除高风险片段，再交给大模型
      conservativeText,
    }
  }

  const riskTokens = tokens
    .filter((token) => !token.space && token.p >= thresholds.mask)
    .map((token) => ({ text: token.text, p: token.p, type: token.type, reason: token.reason }))

  const riskPhrases = spans.map((span) => ({ text: span.text, p: round(span.p), type: span.type }))

  const prototypes = {
    normal: round(clamp(0.88 - riskScore * 0.86, 0.02, 0.98)),
    attack: round(clamp(0.12 + riskScore * 0.84, 0.02, 0.98)),
    margin: 0.5,
  }
  prototypes.pass = prototypes.normal - prototypes.attack > prototypes.margin
  prototypes.matched = prototypes.attack < prototypes.normal ? '正常原型' : '攻击原型'

  return {
    text: trimmed,
    tokens,
    channels,
    vector,
    strategies,
    variantNotes: variants.notes,
    riskScore,
    level,
    levelLabel: LEVEL_META[level].label,
    levelAction: LEVEL_META[level].action,
    thresholds,
    maskedText,
    maskCount: spans.length,
    maskSpans: spans.map((span) => ({ first: span.first, last: span.last })),
    riskPhrases,
    rewrite,
    riskTokens,
    prototypes,
    stats: {
      tokens: tokens.filter((token) => !token.space).length,
      chars: Array.from(trimmed).length,
      riskTokens: riskTokens.length,
      phrases: spans.length,
      strategies: strategies[0] === '无' ? 0 : strategies.length,
    },
  }
}

/* -------------------------------------------------------------------------- */
/* 跨轮风险记忆与渐进检测                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 计算多轮轨迹：意图漂移 D_t、实体敏感累积 E_t、策略标签 S_t、门控时序风险
 * @param {Array<object>} analyses analyzePrompt 结果数组（按轮次）
 * @param {object} options { thresholds }
 */
export function evaluateSequence(analyses, options = {}) {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds || {}) }
  if (!Array.isArray(analyses) || !analyses.length) {
    return { rounds: [], summary: null }
  }

  const baseline = analyses[0].vector
  const rounds = []
  let sensitivity = 0
  let hidden = 0
  const seen = new Set()
  let blockedAt = null
  let warnedAt = null

  analyses.forEach((analysis, index) => {
    const drift = index === 0 ? 0 : round(cosineDistance(analysis.vector, baseline))
    // 实体敏感累积 E_t：即使单轮因虚构语境被降权，敏感实体仍会进入跨轮记忆
    const entityMass = analysis.tokens
      .filter((token) => token.type === '实体' && token.p >= 0.15)
      .reduce((total, token) => total + token.p, 0)
    const riskyMass = analysis.tokens
      .filter((token) => token.p >= thresholds.mask)
      .reduce((total, token) => total + token.p, 0)
    sensitivity = round(sensitivity + (entityMass * 0.5 + riskyMass * 0.5) / 1.2)

    analysis.strategies.forEach((name) => { if (name !== '无') seen.add(name) })

    // 抗污染校验：滑动窗口内意图剧烈跳变时降权，避免单轮噪声污染全局记忆
    const windowDrifts = rounds.slice(-thresholds.window).map((item) => item.drift)
    const mean = windowDrifts.length ? windowDrifts.reduce((total, value) => total + value, 0) / windowDrifts.length : 0
    const contaminated = windowDrifts.length >= 2 && Math.abs(drift - mean) > 0.55
    const driftWeight = contaminated ? 0.5 : 1

    const strategyCount = analysis.strategies[0] === '无' ? 0 : analysis.strategies.length
    const gate = 2.0 * drift * driftWeight
      + 2.6 * Math.min(sensitivity / 1.2, 1)
      + 1.4 * Math.min(strategyCount / 2, 1)
      + 1.1 * analysis.riskScore
      + 1.35 * hidden
      - 5.2
    const sequenceRisk = round(sigmoid(gate))
    hidden = sequenceRisk

    const fusion = round(Math.max(analysis.riskScore, sequenceRisk))
    const level = pickLevel(fusion, thresholds)
    if (level === 'high' && blockedAt === null) blockedAt = index + 1
    if (level === 'mid' && warnedAt === null) warnedAt = index + 1

    rounds.push({
      index: index + 1,
      text: analysis.text,
      analysis,
      drift,
      sensitivity,
      strategyCount,
      strategyTags: analysis.strategies,
      singleRisk: analysis.riskScore,
      sequenceRisk,
      fusion,
      level,
      levelLabel: LEVEL_META[level].label,
      contaminated,
      memory: { v: analysis.vector, s: analysis.strategies, c: sensitivity },
    })
  })

  const summary = {
    rounds: rounds.length,
    maxRisk: round(Math.max(...rounds.map((item) => item.fusion))),
    blockedAt,
    warnedAt,
    strategySet: [...seen],
    cumulativeSensitivity: sensitivity,
    drift: rounds[rounds.length - 1].drift,
  }

  return { rounds, summary }
}

/* -------------------------------------------------------------------------- */
/* 展示辅助                                                                    */
/* -------------------------------------------------------------------------- */

export function levelOf(score, thresholds = DEFAULT_THRESHOLDS) {
  return pickLevel(score, thresholds)
}

export function describeAnalysis(analysis) {
  if (!analysis) return ''
  const risky = analysis.riskPhrases.slice(0, 2).map((phrase) => `「${phrase.text}」`).join('、')
  const strategies = analysis.strategies[0] === '无' ? '未命中策略模板' : `命中 ${analysis.strategies.join('、')}`
  const basis = risky ? `风险片段 ${risky} 的恶意分超过阈值 ${analysis.thresholds.mask}` : '未发现超过掩码阈值的片段'
  return `${strategies}；${basis}。与攻击原型距离 ${analysis.prototypes.attack}，与正常原型距离 ${analysis.prototypes.normal}，判定为${analysis.levelLabel}（${analysis.levelAction}）。`
}

export function actionLabel(action) {
  return {
    pending: '待处理',
    passed: '直接通过',
    rewritten: '确认改写',
    rolledback: '回退原句',
    blocked: '已阻断',
    forced: '强制放行',
  }[action] || '待处理'
}
