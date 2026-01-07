import OpenAI from 'openai';

// --- 定义 RPG 角色接口 ---
export interface AgentProfile {
  name: string;
  provider: string; // 'silicon' | 'volcano'
  model: string;
  apiKeyEnv: string;
  role: string;           // 职业
  style: string;          // 交易风格
  avatar: string;         // 像素头像 URL
  rpgStats: {             // RPG 属性 (0-100)
    intelligence: number;
    speed: number;
    luck: number;
    risk: number;
  };
}

// --- 🏆 参赛选手配置表 (3 Key / 4 Agent 版) ---
export const AGENTS_CONFIG: AgentProfile[] = [
  // 🟢 硅基流动 1: 量化法师
  { 
    name: 'Qwen-Quant', 
    provider: 'silicon', 
    model: 'Qwen/Qwen2.5-Coder-32B-Instruct', 
    apiKeyEnv: 'SILICONFLOW_KEY_1',
    role: 'Quantitative Mage',
    style: '严格遵循技术指标，冷酷无情的数据机器',
    avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=QwenQuant&backgroundColor=b6e3f4',
    rpgStats: { intelligence: 95, speed: 80, luck: 40, risk: 30 }
  },
  // 🟢 硅基流动 2: 价值圣骑士
  { 
    name: 'DeepSeek-Value', 
    provider: 'silicon', 
    model: 'deepseek-ai/DeepSeek-V3', 
    apiKeyEnv: 'SILICONFLOW_KEY_2',
    role: 'Value Paladin',
    style: '寻找被低估的标的，擅长防御性持仓',
    avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=DeepSeekValue&backgroundColor=ffdfbf',
    rpgStats: { intelligence: 90, speed: 20, luck: 60, risk: 20 }
  },
  // 🌋 火山引擎 A: 动量刺客 (共用火山 Key)
  { 
    name: 'Doubao-Hunter', 
    provider: 'volcano', 
    model: process.env.VOLCANO_ENDPOINT_ID!, // 读取环境变量中的 Endpoint
    apiKeyEnv: 'VOLCANO_API_KEY',
    role: 'Momentum Assassin',
    style: '追涨杀跌，哪里有波动哪里就有我',
    avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=DoubaoHunter&backgroundColor=c0aede',
    rpgStats: { intelligence: 70, speed: 95, luck: 50, risk: 90 }
  },
  // 🌋 火山引擎 B: 逆向狂战士 (共用火山 Key)
  { 
    name: 'Doubao-Berserker', 
    provider: 'volcano', 
    model: process.env.VOLCANO_ENDPOINT_ID!, // 读取环境变量中的 Endpoint
    apiKeyEnv: 'VOLCANO_API_KEY',
    role: 'Contrarian Berserker',
    style: '别人贪婪我恐惧，专门做空热门情绪',
    avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=DoubaoBerserker&backgroundColor=ffdfbf',
    rpgStats: { intelligence: 60, speed: 85, luck: 80, risk: 99 }
  }
];

// --- 🧠 核心思考逻辑函数 ---
export async function getAgentDecision(agent: AgentProfile, marketData: string) {
  const systemPrompt = `你是一个美股交易员。
  你的名字是：${agent.name}
  你的职业是：${agent.role}
  你的风格是：${agent.style}
  
  请根据市场数据决定操作。
  必须严格返回 JSON 格式：{"action": "BUY"|"SELL"|"HOLD", "reason": "简短理由(50字内，体现你的风格)", "quantity": 1}`;
  
  const userPrompt = `当前市场数据: ${marketData}`;

  // 1. 动态获取 API Key
  const apiKey = process.env[agent.apiKeyEnv];

  // 安全检查
  if (!apiKey) {
    console.error(`❌ 配置错误: 找不到 ${agent.name} 的 API Key (${agent.apiKeyEnv})`);
    // 如果是火山引擎且 Endpoint 也没配，肯定跑不通
    if (agent.provider === 'volcano' && !agent.model) {
        return { action: 'HOLD', reason: '系统错误: Volcano Endpoint 缺失', quantity: 0 };
    }
    return { action: 'HOLD', reason: '系统错误: API Key 缺失', quantity: 0 };
  }

  try {
    // === 🟢 硅基流动 (SiliconFlow) ===
    if (agent.provider === 'silicon') {
      // 懒加载 Client，防止 Build 报错
      const client = new OpenAI({
        apiKey: apiKey, 
        baseURL: 'https://api.siliconflow.cn/v1',
      });

      const completion = await client.chat.completions.create({
        model: agent.model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7 + (agent.rpgStats.risk / 200), // 风险值越高，随机性(Temp)越高
      });
      return JSON.parse(completion.choices[0].message.content || '{}');
    } 
    
    // === 🌋 火山引擎 (Volcano) ===
    if (agent.provider === 'volcano') {
      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify({
          model: agent.model, // 传入 Endpoint ID
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          temperature: 0.7 + (agent.rpgStats.risk / 200)
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Volcano API Error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "{}";
      // 移除可能的 Markdown 标记
      const jsonStr = content.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonStr);
    }

  } catch (error: any) {
    console.error(`❌ ${agent.name} 思考失败:`, error.message);
    return { action: 'HOLD', reason: `AI Error: ${error.message}`, quantity: 0 };
  }
}