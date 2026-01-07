import OpenAI from 'openai';

// --- 角色接口定义 ---
export interface AgentProfile {
  name: string;
  provider: string; 
  model: string;
  apiKeyEnv: string;
  role: string;   
  style: string;
  avatar: string; 
  // 保留内部属性用于控制随机性，但 UI 不再展示
  rpgStats: { risk: number }; 
}

// --- 🏆 选手配置 (使用 Notion 风格头像，更具职业感) ---
export const AGENTS_CONFIG: AgentProfile[] = [
  { 
    name: 'Qwen-Quant', 
    provider: 'silicon', 
    model: 'Qwen/Qwen2.5-Coder-32B-Instruct', 
    apiKeyEnv: 'SILICONFLOW_KEY_1',
    role: 'Quantitative Analyst',
    style: 'Technical Analysis, Mean Reversion',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Qwen&backgroundColor=e5e7eb',
    rpgStats: { risk: 30 }
  },
  { 
    name: 'DeepSeek-Value', 
    provider: 'silicon', 
    model: 'deepseek-ai/DeepSeek-V3', 
    apiKeyEnv: 'SILICONFLOW_KEY_2',
    role: 'Value Investor',
    style: 'Fundamental Analysis, Long-term Hold',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=DeepSeek&backgroundColor=ffdfbf',
    rpgStats: { risk: 20 }
  },
  { 
    name: 'Doubao-Hunter', 
    provider: 'volcano', 
    model: process.env.VOLCANO_ENDPOINT_ID!,
    apiKeyEnv: 'VOLCANO_API_KEY',
    role: 'Momentum Trader',
    style: 'Trend Following, Breakout Strategy',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=DoubaoHunter&backgroundColor=c0aede',
    rpgStats: { risk: 90 }
  },
  { 
    name: 'Doubao-Contrarian', // 改个名字更专业
    provider: 'volcano', 
    model: process.env.VOLCANO_ENDPOINT_ID!,
    apiKeyEnv: 'VOLCANO_API_KEY',
    role: 'Short Seller',
    style: 'Shorting Overvalued Stocks, Hedging',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=DoubaoShort&backgroundColor=b6e3f4',
    rpgStats: { risk: 99 }
  }
];

// --- 🧠 决策逻辑 ---
export async function getAgentDecision(agent: AgentProfile, marketData: string) {
  const systemPrompt = `You are a professional Wall Street trader.
  Name: ${agent.name} | Role: ${agent.role} | Style: ${agent.style}
  
  Your goal is to maximize profit. Analyze the provided market data.
  
  Output STRICT JSON:
  {"action": "BUY"|"SELL"|"HOLD", "reason": "Brief professional analysis (<30 words)", "quantity": <integer>}
  
  Rules:
  1. If "action" is BUY, quantity must be > 0.
  2. If "action" is SELL, ensure you are selling existing holdings (or shorting if allowed).
  3. Keep reasons concise and professional.`;
  
  const userPrompt = `Market Data: ${marketData}`;

  const apiKey = process.env[agent.apiKeyEnv];
  if (!apiKey) return { action: 'HOLD', reason: 'Configuration Error: Missing API Key', quantity: 0 };

  try {
    let content = "{}";

    if (agent.provider === 'silicon') {
      const client = new OpenAI({ apiKey, baseURL: 'https://api.siliconflow.cn/v1' });
      const completion = await client.chat.completions.create({
        model: agent.model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7 + (agent.rpgStats.risk / 200),
      });
      content = completion.choices[0].message.content || "{}";
    } 
    
    if (agent.provider === 'volcano') {
      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: agent.model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          temperature: 0.7 + (agent.rpgStats.risk / 200)
        })
      });
      const data = await response.json();
      content = data.choices[0]?.message?.content || "{}";
    }

    return JSON.parse(content.replace(/```json|```/g, '').trim());

  } catch (error: any) {
    console.error(`Agent ${agent.name} error:`, error.message);
    return { action: 'HOLD', reason: 'Analysis Timeout', quantity: 0 };
  }
}