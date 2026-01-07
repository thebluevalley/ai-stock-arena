import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AGENTS_CONFIG, getAgentDecision } from '@/lib/agents';
import { checkDailyLimit, executeTrade } from '@/lib/trade'; // 引入新写的逻辑

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

async function getMarketData(symbol: string) {
  // ... 保持之前的 Alpaca 获取数据逻辑 ...
  // 为了节省篇幅这里省略，请保留你之前写好的 getMarketData 函数
  // 假设返回: { price: 120.5, summary: "..." }
  // 如果没有 Alpaca，暂时硬编码用于测试：
  return { price: 135.00, summary: "NVDA Price: 135.00, Trend: Bullish" }; 
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const SYMBOL = 'NVDA';

  try {
    const market = await getMarketData(SYMBOL);
    
    // 并行执行所有 Agent
    const results = await Promise.all(
      AGENTS_CONFIG.map(async (agent) => {
        // 1. 检查每日限制
        const isLimitReached = await checkDailyLimit(agent.name);
        if (isLimitReached) {
          return { agent: agent.name, status: 'Skipped: Daily Limit Reached' };
        }

        // 2. AI 思考
        const decision = await getAgentDecision(agent, market.summary);
        const action = decision.action || 'HOLD';
        const qty = decision.quantity || 1; // 默认每次交易 1 股

        // 3. 执行交易 (扣钱/记账)
        let tradeStatus = 'Skipped';
        if (action !== 'HOLD') {
          const result = await executeTrade(agent.name, action, SYMBOL, market.price, qty);
          tradeStatus = result || 'Error';
        }

        // 4. 记录日志 (如果交易失败，Reason 里会写失败原因)
        if (action !== 'HOLD' && !tradeStatus.startsWith('Fails')) {
             await supabaseAdmin.from('logs').insert({
                agent_name: agent.name,
                model_provider: agent.provider,
                action: action,
                symbol: SYMBOL,
                reason: decision.reason,
                price: market.price,
                quantity: qty
             });
        }

        return { 
            agent: agent.name, 
            action, 
            status: tradeStatus 
        };
      })
    );

    return NextResponse.json({ status: 'Cycle Completed', results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}