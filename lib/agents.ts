import OpenAI from 'openai';

// --- 🏆 参赛选手配置表 ---
export const AGENTS_CONFIG = [
  // 🟢 选手 1: 硅基流动 (使用 Key 1)
  { 
    name: 'Qwen-Coder', 
    provider: 'silicon', 
    model: 'Qwen/Qwen2.5-Coder-32B-Instruct', 
    apiKeyEnv: 'SILICONFLOW_KEY_1' // 绑定第一个硅基 Key
  },
  // 🟢 选手 2: 硅基流动 (使用 Key 2)
  { 
    name: 'DeepSeek-V3', 
    provider: 'silicon', 
    model: 'deepseek-ai/DeepSeek-V3', 
    apiKeyEnv: 'SILICONFLOW_KEY_2' // 绑定第二个硅基 Key
  },
  // 🌋 选手 3: 火山引擎 A (共用火山资源)
  { 
    name: 'Doubao-Trader-A', 
    provider: 'volcano', 
    model: process.env.VOLCANO_ENDPOINT_ID!, // 读取统一的 Endpoint
    apiKeyEnv: 'VOLCANO_API_KEY'             // 读取统一的 Key
  },
  // 🌋 选手 4: 火山引擎 B (共用火山资源)
  // 虽然用的是同一个模型，但作为独立选手参赛，增加随机性
  { 
    name: 'Doubao-Trader-B', 
    provider: 'volcano', 
    model: process.env.VOLCANO_ENDPOINT_ID!, // 读取统一的 Endpoint
    apiKeyEnv: 'VOLCANO_API_KEY'             // 读取统一的 Key
  }
];

// --- 🧠 核心思考逻辑 ---
export async function getAgentDecision(agent: any, marketData: string) {
  const systemPrompt = `你是一个美股交易员。请根据市场数据决定操作。
  必须返回 JSON 格式：{"action": "BUY"|"SELL"|"HOLD", "reason": "简短理由(50字内)", "quantity": 1}`;
  
  const userPrompt = `当前市场数据: ${marketData}`;

  // 🔑 动态获取当前 Agent 专属的 API Key
  const apiKey = process.env[agent.apiKeyEnv];

  // 安全检查
  if (!apiKey) {
    console.error(`❌ 配置错误: 找不到 ${agent.name} 的 API Key (${agent.apiKeyEnv})`);
    return { action: 'HOLD', reason: 'API Key 配置缺失', quantity: 0 };
  }

  try {
    // === 🟢 硅基流动 (SiliconFlow) ===
    if (agent.provider === 'silicon') {
      const client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.siliconflow.cn/v1',
      });

      const completion = await client.chat.completions.create({
        model: agent.model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7, // 增加一点随机性，避免大家输出完全一样
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
          model: agent.model, // 这里传入的是 Endpoint ID
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          temperature: 0.8 // 给火山引擎更高的随机性，这样两个豆包选手的决策可能会不同
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Volcano API Error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "{}";
      const jsonStr = content.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonStr);
    }

  } catch (error: any) {
    console.error(`❌ ${agent.name} 思考失败:`, error.message);
    return { action: 'HOLD', reason: `AI Error: ${error.message}`, quantity: 0 };
  }
}