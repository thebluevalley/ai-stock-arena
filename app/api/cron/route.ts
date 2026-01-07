import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AGENTS_CONFIG, getAgentDecision } from '@/lib/agents';

// 获取 Alpaca 数据的简易函数
async function getMarketData(symbol: string) {
  const url = `https://paper-api.alpaca.markets/v2/stocks/${symbol}/bars?timeframe=15Min&limit=5`;
  const response = await fetch(url, {
    headers: {
      'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!,
      'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET!,
    },
  });
  const data = await response.json();
  const latestBar = data.bars[symbol][0]; // 获取最新的一根K线
  return {
    price: latestBar.c, // 收盘价
    summary: `Symbol: ${symbol}, Price: ${latestBar.c}, Volume: ${latestBar.v}, Time: ${latestBar.t}`
  };
}

// ⚠️ 设置最大执行时间为 60秒 (Vercel Pro是300s, Hobby是10s，如果在Hobby版超时，需要减少Agent数量)
export const maxDuration = 60; 
// 强制动态渲染
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. 安全校验
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SYMBOL = 'NVDA'; // 比赛标的：英伟达

  try {
    // 2. 获取市场数据
    const market = await getMarketData(SYMBOL);
    
    // 3. 让所有 AI 并行思考 (Promise.all 加速)
    const results = await Promise.all(
      AGENTS_CONFIG.map(async (agent) => {
        const decision = await getAgentDecision(agent, market.summary);
        return {
          agent_name: agent.name,
          model_provider: agent.provider,
          action: decision.action || 'HOLD',
          symbol: SYMBOL,
          reason: decision.reason || 'No reason',
          price: market.price,
          quantity: decision.quantity || 0
        };
      })
    );

    // 4. 写入 Supabase
    const { error } = await supabaseAdmin.from('logs').insert(results);

    if (error) throw error;

    return NextResponse.json({ status: 'Success', results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}