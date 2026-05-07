/**
 * 日记 AI 评分解析服务
 * 处理评分提示词生成和响应解析
 */

const { getGradeByScore, getGradeConfig } = require('../config/diaryAchievements')

/**
 * 单条日记评分提示词模板
 */
const SINGLE_DIARY_SCORING_PROMPT = `你是一位资深的小学语文教师和儿童写作导师，拥有20年教学经验。请对以下小学生日记进行专业、详细的分析和评分。

## 你的任务

作为写作导师，你需要：
1. 认真阅读日记，发现闪光点
2. 找出需要改进的地方，并给出具体修改示例
3. 教授实用的写作技巧
4. 提取日记中提到的人物
5. 给予温暖而真诚的鼓励

## 输出格式要求

请严格按以下结构输出，先输出详细分析报告，最后输出JSON评分数据。

---

## 📝 日记点评报告

### 🌟 整体印象

（用2-3句话概括这篇日记的整体质量、主要特点和你的第一印象）

### ✨ 精彩之处

请找出2-3处写得好的地方，必须引用原文：

**亮点一：**
> "从日记中引用的原文句子"

👍 **点评**：说明这句话/这段话好在哪里，用了什么写作手法，为什么打动人...

**亮点二：**
> "从日记中引用的原文句子"

👍 **点评**：...

### 📚 改进建议

请找出2-3处可以改进的地方，必须引用原文并给出改写示例：

**建议一：**

原文：
> "需要改进的原文句子"

问题：说明这句话存在什么问题（比如：描写不够具体、缺少细节、用词不当等）

✏️ **建议改为**：
> "改写后的句子（要明显比原文更好）"

💡 **为什么这样改**：解释改写的理由和技巧...

**建议二：**

原文：
> "需要改进的原文句子"

问题：...

✏️ **建议改为**：
> "..."

💡 **为什么这样改**：...

### 👥 日记中的人物

（列出日记中提到的人物，简要描述他们与小作者的互动）

| 人物 | 关系 | 在日记中的表现 |
|------|------|----------------|
| ... | ... | ... |

### 📖 写作小课堂

根据这篇日记暴露的问题，教授1-2个实用写作技巧：

**技巧一：**（技巧名称，如"五感描写法"）

什么是这个技巧，怎么用，举个例子说明...

**技巧二：**（如果需要）

...

### 💬 老师寄语

（给孩子写一段温暖真诚的话，4-5句。要具体提到这篇日记的亮点，肯定孩子的努力，同时温和地指出进步方向，最后给予鼓励和期待。）

---

## 📊 评分数据

\`\`\`json
{
  "scores": {
    "content": { "score": 15, "comment": "内容充实度一句话点评" },
    "emotion": { "score": 14, "comment": "情感表达一句话点评" },
    "language": { "score": 13, "comment": "语言表达一句话点评" },
    "structure": { "score": 14, "comment": "结构逻辑一句话点评" },
    "creativity": { "score": 12, "comment": "创意思考一句话点评" }
  },
  "totalScore": 68,
  "grade": "B",
  "highlights": ["亮点关键词1", "亮点关键词2", "亮点关键词3"],
  "improvements": ["待改进关键词1", "待改进关键词2"],
  "encouragement": "一句简短的鼓励语",
  "nextGoal": "下一篇日记的具体小目标",
  "characters": [
    { "name": "人物名", "role": "关系(如爸爸/妈妈/老师/同学)", "action": "在日记中做了什么" }
  ]
}
\`\`\`

## 评分标准

每项满分20分：
- **内容充实度(20分)**：事件完整性、细节丰富度、信息量
- **情感表达(20分)**：感受真实性、情感层次、独特视角
- **语言表达(20分)**：用词准确性、句子通顺度、好词好句
- **结构逻辑(20分)**：条理清晰度、段落合理性、首尾呼应
- **创意思考(20分)**：独特见解、想象力、成长反思

## 评分原则

1. **客观公正**：根据实际水平评分，不过分夸大也不过分苛责
2. **鼓励为主**：发现闪光点，保护写作热情
3. **问题要指出**：温和但不回避问题，才能真正帮助进步
4. **建议要具体**：每个改进建议都要有原文引用和改写示例
5. **评分区间**：一般60-85分，特别优秀90+，较差50-60

请开始分析：`

/**
 * 批量日记评分提示词模板（含人物画像）
 */
const BATCH_DIARY_SCORING_PROMPT = `你是一位资深的小学语文教师和儿童心理分析师。请综合分析以下小学生一周的日记集合，给出详细的周报分析。

## 你的任务

1. 综合评估这一周的日记质量和写作进步
2. 分析情绪变化趋势和心理状态
3. 生成有趣的人物画像
4. **进行专业的儿童心理分析，输出结构化的心理摘要**
5. 给出下周的学习建议

## 输出格式要求

请严格按以下结构输出，先输出详细分析报告，最后输出JSON数据。

---

## 📊 本周日记周报

### 🌈 一周总览

（用3-4句话概括这一周日记的整体情况，包括：写作数量、整体质量、主要话题、情绪基调）

### 📈 写作进步分析

对比这一周的日记，分析写作能力的变化：

**进步的方面：**
- 具体说明哪些方面有进步，最好引用日记中的例子

**需要继续努力的方面：**
- 具体说明还有哪些问题需要改进

### 💭 情绪变化趋势

分析这一周的情绪变化：

（描述情绪曲线，哪几天比较开心，哪几天可能有困扰，是什么事情影响了情绪）

### 🧠 周心理摘要

从儿童心理学角度，分析这周日记反映的心理状态：

**情绪状态评估：**
- 主导情绪：（如：积极乐观/平稳安定/略有焦虑/情绪波动等）
- 情绪稳定性：（如：稳定/有波动/波动较大）
- 情绪来源：（主要由什么事件或人物引发情绪变化）

**心理需求识别：**
- 识别孩子在日记中表达的心理需求（如：被认可、被关注、独立自主、社交归属、安全感等）
- 哪些需求已得到满足，哪些可能需要关注

**成长信号：**
- 发现孩子的心理成长迹象（如：同理心发展、责任感增强、自我认知提升等）
- 值得肯定的心理品质表现

**家长引导建议：**
- 针对本周心理状态，给家长2-3条具体可操作的引导建议
- 建议要温和正面，避免给家长造成焦虑

### ✨ 本周精彩瞬间

从所有日记中选出2-3个最精彩的句子或片段：

> "引用的精彩句子1" —— 来自《日记标题》

👍 点评：...

> "引用的精彩句子2" —— 来自《日记标题》

👍 点评：...

### 📝 本周改进空间

指出这周日记中的共性问题，给出改进建议：

**问题一：**（如：细节描写不够）

具体表现：引用1-2个例子
改进建议：...

**问题二：**（如果有）

...

### 👤 小作者画像

根据这周的日记，描绘小作者的形象：

**性格特点：** ...
**兴趣爱好：** ...
**情感特质：** ...
**写作风格：** ...

🎭 **趣味描述：** （用一句有趣的话概括这个小作者，如："一个喜欢在雨天观察蚂蚁的小哲学家"）

### 👥 日记中的人物

（列出这周日记中出现的主要人物，简要描述）

| 人物 | 关系 | 特点 | 有趣评价 |
|------|------|------|----------|
| ... | ... | ... | ... |

### 💬 老师寄语

（给孩子和家长写一段温暖的周总结，5-6句话。肯定本周的努力，指出进步，温和提出期待，鼓励下周继续加油。）

### 🎯 下周小目标

给出2-3个具体可操作的下周写作小目标：

1. ...
2. ...
3. ...

---

## 📊 评分数据

\`\`\`json
{
  "totalScore": 72,
  "grade": "B",
  "summary": "本周日记一句话总结",
  "emotionTrend": "情绪趋势一句话描述",
  "writingProgress": "写作进步一句话描述",
  "highlights": ["本周亮点1", "本周亮点2", "本周亮点3"],
  "improvements": ["待改进1", "待改进2"],
  "weeklyGoal": "下周核心目标",
  "authorProfile": {
    "traits": ["性格特点1", "性格特点2"],
    "interests": ["兴趣1", "兴趣2"],
    "emotionPattern": "情绪倾向",
    "strengths": ["优点1", "优点2"],
    "funFact": "趣味描述"
  },
  "characters": [
    {
      "name": "人物名",
      "role": "关系",
      "traits": ["特点1"],
      "interaction": "互动特点",
      "funComment": "有趣评价"
    }
  ],
  "psychologySummary": {
    "dominantEmotion": "主导情绪（如：积极乐观/平稳安定/略有焦虑）",
    "emotionStability": "情绪稳定性（稳定/有波动/波动较大）",
    "emotionTriggers": ["情绪触发因素1", "情绪触发因素2"],
    "psychNeeds": {
      "identified": ["识别到的心理需求1", "心理需求2"],
      "satisfied": ["已满足的需求"],
      "needAttention": ["需要关注的需求"]
    },
    "growthSignals": ["成长信号1", "成长信号2"],
    "positiveTraits": ["值得肯定的心理品质1", "品质2"],
    "parentGuidance": ["家长引导建议1", "引导建议2", "引导建议3"],
    "riskLevel": "low",
    "weekSummary": "本周心理状态一句话总结"
  },
  "socialStyle": "社交风格描述",
  "funSummary": "有趣的周总结（适合分享）"
}
\`\`\`

## 评分原则

- 综合评估整周表现，不是单篇平均分
- 关注进步趋势，有进步可适当加分
- 评分区间：60-85分为主
- 人物画像要有趣、正面、富有个性
- 心理分析要专业但语言要温和正面，避免给家长造成焦虑
- riskLevel 只能是 "low"（正常）、"medium"（需关注）、"high"（建议专业咨询）

请开始分析：`

/**
 * 解析 AI 评分响应
 * @param {string} responseText - AI 响应文本
 * @returns {object} 解析后的评分数据
 */
function parseScoreResponse(responseText) {
  try {
    // 尝试提取 JSON 块
    let jsonStr = responseText

    // 方法1：提取 ```json ``` 块
    const jsonBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1]
    } else {
      // 方法2：提取 { } 块
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }
    }

    const parsed = JSON.parse(jsonStr)

    // 标准化数据
    const result = {
      totalScore: normalizeScore(parsed.totalScore),
      grade: normalizeGrade(parsed.grade, parsed.totalScore),
      scoreDetails: normalizeScoreDetails(parsed.scores),
      highlights: normalizeArray(parsed.highlights),
      improvements: normalizeArray(parsed.improvements),
      encouragement: parsed.encouragement || null,
      nextGoal: parsed.nextGoal || parsed.weeklyGoal || null,
    }

    // 单条分析人物字段
    if (parsed.characters) {
      result.charactersProfile = normalizeCharacters(parsed.characters)
    }

    // 批量分析额外字段
    if (parsed.authorProfile) {
      result.authorProfile = normalizeAuthorProfile(parsed.authorProfile)
    }
    if (parsed.characters) {
      result.charactersProfile = normalizeCharacters(parsed.characters)
    }
    if (parsed.socialStyle) {
      result.socialStyle = parsed.socialStyle
    }
    if (parsed.funSummary) {
      result.funSummary = parsed.funSummary
    }
    if (parsed.summary) {
      result.summary = parsed.summary
    }
    if (parsed.emotionTrend) {
      result.emotionTrend = parsed.emotionTrend
    }
    if (parsed.writingProgress) {
      result.writingProgress = parsed.writingProgress
    }

    // 周心理摘要（批量分析）
    if (parsed.psychologySummary) {
      result.psychologySummary = normalizePsychologySummary(parsed.psychologySummary)
    }

    return result

  } catch (e) {
    console.error('[DiaryScore] JSON解析失败，尝试降级解析:', e.message)
    return extractScoreByRegex(responseText)
  }
}

/**
 * 正则降级解析
 * @param {string} text - 响应文本
 * @returns {object} 解析结果
 */
function extractScoreByRegex(text) {
  const result = {
    totalScore: null,
    grade: null,
    scoreDetails: null,
    highlights: [],
    improvements: [],
    encouragement: null,
    nextGoal: null,
  }

  // 尝试提取分数
  const scoreMatch = text.match(/(?:总分|totalScore|得分)[：:\s]*(\d+)/i)
  if (scoreMatch) {
    result.totalScore = normalizeScore(parseInt(scoreMatch[1]))
    result.grade = getGradeByScore(result.totalScore)
  }

  // 尝试提取等级
  const gradeMatch = text.match(/(?:等级|grade)[：:\s]*([A-D][+-]?)/i)
  if (gradeMatch && !result.grade) {
    result.grade = gradeMatch[1].toUpperCase()
  }

  // 尝试提取亮点
  const highlightMatch = text.match(/(?:亮点|优点|highlights)[：:\s]*([\s\S]*?)(?=(?:改进|建议|improvements)|$)/i)
  if (highlightMatch) {
    result.highlights = extractListItems(highlightMatch[1])
  }

  // 尝试提取建议
  const improvementMatch = text.match(/(?:改进|建议|improvements)[：:\s]*([\s\S]*?)(?=(?:鼓励|目标)|$)/i)
  if (improvementMatch) {
    result.improvements = extractListItems(improvementMatch[1])
  }

  return result
}

/**
 * 从文本中提取列表项
 * @param {string} text - 文本
 * @returns {array} 列表项
 */
function extractListItems(text) {
  const items = []
  const lines = text.split(/[\n\r]+/)

  for (const line of lines) {
    const cleaned = line.replace(/^[\s\-\*\d\.、]+/, '').trim()
    if (cleaned && cleaned.length > 2 && cleaned.length < 200) {
      items.push(cleaned)
    }
    if (items.length >= 5) break
  }

  return items
}

/**
 * 标准化分数
 * @param {number|string} score - 原始分数
 * @returns {number} 0-100的分数
 */
function normalizeScore(score) {
  const num = parseInt(score)
  if (isNaN(num)) return 70 // 默认值
  return Math.min(100, Math.max(0, num))
}

/**
 * 标准化等级
 * @param {string} grade - 原始等级
 * @param {number} score - 分数（用于推断）
 * @returns {string} 标准等级
 */
function normalizeGrade(grade, score) {
  const validGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'D-']

  if (grade && validGrades.includes(grade.toUpperCase())) {
    return grade.toUpperCase()
  }

  // 根据分数推断
  if (score !== null && score !== undefined) {
    return getGradeByScore(normalizeScore(score))
  }

  return 'B' // 默认值
}

/**
 * 标准化分项评分
 * @param {object} scores - 原始分项
 * @returns {object} 标准化分项
 */
function normalizeScoreDetails(scores) {
  if (!scores || typeof scores !== 'object') return null

  const normalized = {}
  const dimensions = ['content', 'emotion', 'language', 'structure', 'creativity']

  for (const dim of dimensions) {
    if (scores[dim]) {
      normalized[dim] = {
        score: Math.min(20, Math.max(0, parseInt(scores[dim].score) || 14)),
        comment: scores[dim].comment || ''
      }
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

/**
 * 标准化数组
 * @param {array} arr - 原始数组
 * @returns {array} 标准化数组
 */
function normalizeArray(arr) {
  if (!Array.isArray(arr)) return []
  return arr.filter(item => typeof item === 'string' && item.trim()).slice(0, 5)
}

/**
 * 标准化作者画像
 * @param {object} profile - 原始画像
 * @returns {object} 标准化画像
 */
function normalizeAuthorProfile(profile) {
  if (!profile || typeof profile !== 'object') return null

  return {
    traits: normalizeArray(profile.traits),
    interests: normalizeArray(profile.interests),
    emotionPattern: profile.emotionPattern || null,
    strengths: normalizeArray(profile.strengths),
    funFact: profile.funFact || null,
  }
}

/**
 * 标准化人物列表
 * @param {array} characters - 原始人物列表
 * @returns {array} 标准化列表
 */
function normalizeCharacters(characters) {
  if (!Array.isArray(characters)) return []

  return characters
    .filter(c => c && c.name)
    .slice(0, 10)
    .map(c => ({
      name: c.name,
      role: c.role || '未知',
      traits: normalizeArray(c.traits),
      interaction: c.interaction || null,
      funComment: c.funComment || null,
    }))
}

/**
 * 标准化心理摘要
 * @param {object} summary - 原始心理摘要
 * @returns {object} 标准化摘要
 */
function normalizePsychologySummary(summary) {
  if (!summary || typeof summary !== 'object') return null

  const validRiskLevels = ['low', 'medium', 'high']

  return {
    dominantEmotion: summary.dominantEmotion || null,
    emotionStability: summary.emotionStability || null,
    emotionTriggers: normalizeArray(summary.emotionTriggers),
    psychNeeds: summary.psychNeeds ? {
      identified: normalizeArray(summary.psychNeeds.identified),
      satisfied: normalizeArray(summary.psychNeeds.satisfied),
      needAttention: normalizeArray(summary.psychNeeds.needAttention),
    } : null,
    growthSignals: normalizeArray(summary.growthSignals),
    positiveTraits: normalizeArray(summary.positiveTraits),
    parentGuidance: normalizeArray(summary.parentGuidance),
    riskLevel: validRiskLevels.includes(summary.riskLevel) ? summary.riskLevel : 'low',
    weekSummary: summary.weekSummary || null,
  }
}

/**
 * 构建单条日记的评分提示
 * @param {object} diary - 日记对象
 * @param {object} previousAnalysis - 上次分析结果（可选）
 * @returns {string} 完整提示词
 */
function buildSingleDiaryPrompt(diary, previousAnalysis = null) {
  let prompt = SINGLE_DIARY_SCORING_PROMPT + '\n\n'

  // 添加上次分析作为参考
  if (previousAnalysis) {
    prompt += `## 上次分析参考（用于对比进步）

上次评分：${previousAnalysis.totalScore}分 (${previousAnalysis.grade})
上次亮点：${(previousAnalysis.highlights || []).join('、')}
上次建议：${(previousAnalysis.improvements || []).join('、')}

请关注这次相比上次的进步或变化。

`
  }

  prompt += `## 日记内容

标题：${diary.title}
日期：${diary.createdAt ? new Date(diary.createdAt).toLocaleDateString('zh-CN') : '未知'}
心情：${diary.mood || '未设置'}
天气：${diary.weather || '未设置'}

正文：
${diary.content}
`

  return prompt
}

/**
 * 构建批量日记的评分提示
 * @param {array} diaries - 日记数组
 * @param {string} period - 周期描述（本周/上周）
 * @param {object} previousAnalysis - 上次分析结果（可选）
 * @returns {string} 完整提示词
 */
function buildBatchDiaryPrompt(diaries, period = '本周', previousAnalysis = null) {
  let prompt = BATCH_DIARY_SCORING_PROMPT + '\n\n'

  // 添加上次分析作为参考
  if (previousAnalysis) {
    prompt += `## 上次分析参考

上次评分：${previousAnalysis.totalScore}分 (${previousAnalysis.grade})
上次作者画像：${previousAnalysis.authorProfile ? JSON.stringify(previousAnalysis.authorProfile) : '无'}
上次人物：${previousAnalysis.charactersProfile ? JSON.stringify(previousAnalysis.charactersProfile) : '无'}

请关注相比上次的变化和成长。

`
  }

  prompt += `## ${period}日记集合（共${diaries.length}篇）\n\n`

  for (let i = 0; i < diaries.length; i++) {
    const diary = diaries[i]
    prompt += `### 日记 ${i + 1}
标题：${diary.title}
日期：${diary.createdAt ? new Date(diary.createdAt).toLocaleDateString('zh-CN') : '未知'}
心情：${diary.mood || '未设置'}

${diary.content}

---

`
  }

  return prompt
}

module.exports = {
  SINGLE_DIARY_SCORING_PROMPT,
  BATCH_DIARY_SCORING_PROMPT,
  parseScoreResponse,
  buildSingleDiaryPrompt,
  buildBatchDiaryPrompt,
  normalizeScore,
  normalizeGrade,
  getGradeByScore,
  getGradeConfig,
}
