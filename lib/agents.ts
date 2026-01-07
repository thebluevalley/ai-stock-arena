import OpenAI from 'openai';

// 初始化硅基流动客户端 (兼容 OpenAI 协议)
const siliconClient = new OpenAI({
  apiKey: process.env.SILICONFLOW_API_KEY,
  baseURL: 'https://api.siliconflow.cn/v1',
});

// 定义 AI 角色配置
export const AGENTS_CONFIG = [
  { name: 'DeepSeek-V3', provider: 'silicon', model: 'deepseek-ai/DeepSeek-V3' },
  { name: 'Qwen-Coder', provider: 'silicon', model: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
  // 注意：火山引擎需要对应的 Endpoint ID，这里假设你用了两个不同的接入点，或者同一个
  { name: 'Doubao-Pro', provider: 'volcano', model: process.env.VOLCANO_ENDPOINT_ID! },
  { name: 'Doubao-Lite', provider: 'volcano', model: process.env.VOLCANO_ENDPOINT_ID! }, 
];

export async function getAgentDecision(agent: any, marketData: string) {
  const systemPrompt = `你是一个美股交易员。请根据市场数据决定操作。
  必须返回 JSON 格式：{"action": "BUY"|"SELL"|"HOLD", "reason": "简短理由(50字内)", "quantity": 1}`;
  
  const userPrompt = `当前市场数据: ${marketData}`;

  try {
    if (agent.provider === 'silicon') {
      const completion = await siliconClient.chat.completions.create({
        model: agent.model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' },
      });
      return JSON.parse(completion.choices[0].message.content || '{}');
    } 
    
    // 火山引擎调用 (使用 fetch 原生调用以减少依赖)
    if (agent.provider === 'volcano') {
      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VOLCANO_API_KEY}`
        },
        body: JSON.stringify({
          model: agent.model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        })
      });
      const data = await response.json();
      // 火山引擎可能不直接支持 JSON Mode，需要尝试解析 content
      const content = data.choices[0].message.content;
      // 简单的 JSON 提取逻辑，防止 AI 返回 Markdown 代码块
      const jsonStr = content.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonStr);
    }
  } catch (error) {
    console.error(`Error with agent ${agent.name}:`, error);
    return { action: 'HOLD', reason: 'AI 思考超时或出错', quantity: 0 };
  }
}