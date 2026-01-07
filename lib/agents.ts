import OpenAI from 'openai';

// --- 🎮 RPG 角色设定 ---
export interface AgentProfile {
  name: string;
  provider: string;
  model: string;
  apiKeyEnv: string;
  role: string;           // 职业
  style: string;          // 交易风格
  avatar: string;         // 像素头像 URL
  rpgStats: {             // RPG 属性 (满分100)
    intelligence: number; // 智力 (分析深度)
    speed: number;        // 敏捷 (交易频率)
    luck: number;         // 幸运 (玄学指数)
    risk: number;         // 胆识 (风险偏好)
  };
}

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
  // 🌋 火山引擎 A: 动量刺客
  { 
    name: 'Doubao-Hunter', 
    provider: 'volcano', 
    model: process.env.VOLCANO_ENDPOINT_ID!,
    apiKeyEnv: 'VOLCANO_API_KEY',
    role: 'Momentum Assassin',
    style: '追涨杀跌，哪里有波动哪里就有我',
    avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=DoubaoHunter&backgroundColor=c0aede',
    rpgStats: { intelligence: 70, speed: 95, luck: 50, risk: 90 }
  },
  // 🌋 火山引擎 B: 逆向狂战士
  { 
    name: 'Doubao-Berserker', 
    provider: 'volcano', 
    model: process.env.VOLCANO_ENDPOINT_ID!,
    apiKeyEnv: 'VOLCANO_API_KEY',
    role: 'Contrarian Berserker',
    style: '别人贪婪我恐惧，专门做空热门情绪',
    avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=DoubaoBerserker&backgroundColor=ffdfbf',
    rpgStats: { intelligence: 60, speed: 85, luck: 80, risk: 99 }
  }
];

// ... (getAgentDecision 函数保持不变，记得把 any 类型改为 AgentProfile) ...
// 在 getAgentDecision 函数签名处修改：
// export async function getAgentDecision(agent: AgentProfile, marketData: string) { ... }