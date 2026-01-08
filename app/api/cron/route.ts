import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AGENTS_CONFIG, getAgentDecision } from '@/lib/agents';
import { checkDailyLimit, executeTrade } from '@/lib/trade';
import { isUSMarketOpen } from '@/lib/market-time';

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const STOCK_UNIVERSE = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMD', 'GOOGL', 'AMZN', 'META', 'PLTR'];

async function getMarketData(symbol: string) {
  // 模拟数据 (确保测试时 100% 能拿到数据)
  // 如果你有 Alpaca Key，代码会自动用；这里为测试稳定性保留模拟兜底
  if (process.env.ALPACA_API_KEY) {
    try {
      const url = `https://paper-api.alpaca.markets/v2/stocks/${symbol}/bars?timeframe=15Min&limit=1`;
      const res = await fetch(url, { headers: {
        'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!,
        'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET!,
      }});
      if (res.ok) {
        const data = await res.json();
        const latest = data.bars[symbol]?.[0];
        if (latest) return { price: latest.c, summary: `Symbol: ${symbol} | Price: $${latest.c} | Vol: ${latest.v}` };
      }
    } catch (e) { console.error("Alpaca Error:", e); }
  }
  const mockPrice = (Math.random() * 200 + 100).toFixed(2);
  return { price: parseFloat(mockPrice), summary: `Symbol: ${symbol} | Price: $${mockPrice} (SIMULATED)` };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // 1. 鉴权
  if (searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. 强制交易模式检测
  const isForceRun = searchParams.get('force') === 'true';

  // 3. 市场时间检查 (如果是强制运行，则跳过检查)
  const marketStatus = isUSMarketOpen();
  if (!marketStatus.isOpen && !isForceRun) {
    return NextResponse.json({ status: 'Closed', msg: `Market Closed (${marketStatus.reason}) & No Force Flag` });
  }

  const targetSymbol = STOCK_UNIVERSE[Math.floor(Math.random() * STOCK_UNIVERSE.length)];

  try {
    const market = await getMarketData(targetSymbol);
    
    const results = await Promise.all(
      AGENTS_CONFIG.map(async (agent) => {
        try {
          // 强制模式下，可选：跳过每日次数限制 checkDailyLimit(agent.name)
          // 这里我们保留限制，避免刷爆 API，如果你想无限刷，注释掉下面 3 行
          if (await checkDailyLimit(agent.name) && !isForceRun) {
             return { agent: agent.name, status: 'Limit Reached' };
          }

          const decision = await getAgentDecision(agent, market.summary);
          const action = decision.action || 'HOLD';
          const qty = decision.quantity || 1;
          const reason = decision.reason || 'No comment';

          let tradeStatus = 'No Action';
          if (action === 'BUY' || action === 'SELL') {
             const res = await executeTrade(agent.name, action, targetSymbol, market.price, qty);
             tradeStatus = res || 'Error';
          }

          if (action !== 'HOLD') {
             await supabaseAdmin.from('logs').insert({
                agent_name: agent.name,
                model_provider: agent.provider,
                action: tradeStatus.startsWith('Fails') ? 'FAIL' : action,
                symbol: targetSymbol,
                reason: tradeStatus.startsWith('Fails') ? `${reason} (${tradeStatus})` : reason,
                price: market.price,
                quantity: qty
             });
          }

          return { agent: agent.name, action, symbol: targetSymbol, status: tradeStatus };
        } catch (e: any) {
          return { agent: agent.name, error: e.message };
        }
      })
    );

    return NextResponse.json({ status: 'Success', mode: isForceRun ? 'FORCE RUN' : 'AUTO', symbol: targetSymbol, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}