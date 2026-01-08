import OpenAI from 'openai';

export interface AgentProfile {
  name: string;
  provider: string;
  model: string;
  apiKeyEnv: string;
  role: string;
  style: string;
  avatar: string;
  rpgStats: { risk: number };
}

// --- 🏆 选手配置 (名称已修正为与数据库一致) ---
export const AGENTS_CONFIG: AgentProfile[] = [
  { 
    name: 'Qwen-Coder', // 修正：与数据库一致
    provider: 'silicon', 
    model: 'Qwen/Qwen2.5-Coder-32B-Instruct', 
    apiKeyEnv: 'SILICONFLOW_KEY_1',
    role: 'Quantitative Analyst',
    style: 'Technical Analysis, Mean Reversion',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=QwenCoder&backgroundColor=e5e7eb',
    rpgStats: { risk: 30 }
  },
  { 
    name: 'DeepSeek-V3', // 修正：与数据库一致
    provider: 'silicon', 
    model: 'deepseek-ai/DeepSeek-V3', 
    apiKeyEnv: 'SILICONFLOW_KEY_2',
    role: 'Value Investor',
    style: 'Fundamental Analysis, Long-term Hold',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=DeepSeekV3&backgroundColor=ffdfbf',
    rpgStats: { risk: 20 }
  },
  { 
    name: 'Doubao-Trader-A', // 修正：与数据库一致
    provider: 'volcano', 
    model: process.env.VOLCANO_ENDPOINT_ID!,
    apiKeyEnv: 'VOLCANO_API_KEY',
    role: 'Momentum Trader',
    style: 'Trend Following, Breakout Strategy',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=DoubaoA&backgroundColor=c0aede',
    rpgStats: { risk: 90 }
  },
  { 
    name: 'Doubao-Trader-B', // 修正：与数据库一致
    provider: 'volcano', 
    model: process.env.VOLCANO_ENDPOINT_ID!,
    apiKeyEnv: 'VOLCANO_API_KEY',
    role: 'Short Seller',
    style: 'Shorting Overvalued Stocks, Hedging',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=DoubaoB&backgroundColor=b6e3f4',
    rpgStats: { risk: 99 }
  }
];

// --- 🧠 决策逻辑 (保持不变) ---
export async function getAgentDecision(agent: AgentProfile, marketData: string) {
  const systemPrompt = `You are a professional Wall Street trader.
  Name: ${agent.name} | Role: ${agent.role} | Style: ${agent.style}
  
  Your goal is to maximize profit. Analyze the provided market data.
  
  Output STRICT JSON:
  {"action": "BUY"|"SELL"|"HOLD", "reason": "Brief professional analysis (<30 words)", "quantity": <integer>}
  
  Rules:
  1. If "action" is BUY, quantity must be > 0 (Max 10 shares).
  2. If "action" is SELL, ensure you are selling existing holdings.
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