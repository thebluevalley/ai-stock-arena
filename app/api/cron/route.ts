import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AGENTS_CONFIG, getAgentDecision } from '@/lib/agents';
import { checkDailyLimit, executeTrade } from '@/lib/trade';
import { isUSMarketOpen } from '@/lib/market-time';

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

// --- 股票池 (AI 能够交易的标的) ---
const STOCK_UNIVERSE = [
  'NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMD', 'GOOGL', 'AMZN', 'META', 'COIN', 'PLTR'
];

async function getMarketData(symbol: string) {
  // 优先使用 Alpaca
  if (process.env.ALPACA_API_KEY) {
    try {
      const url = `https://paper-api.alpaca.markets/v2/stocks/${symbol}/bars?timeframe=15Min&limit=5`;
      const res = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!,
          'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET!,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const latest = data.bars[symbol]?.[0];
        if (latest) {
          return {
            price: latest.c,
            summary: `Symbol: ${symbol} | Price: $${latest.c} | High: $${latest.h} | Low: $${latest.l} | Vol: ${latest.v}`
          };
        }
      }
    } catch (e) { console.error("Alpaca Error:", e); }
  }
  
  // 模拟数据 (兜底)
  const mockPrice = (Math.random() * 200 + 100).toFixed(2);
  return {
    price: parseFloat(mockPrice),
    summary: `Symbol: ${symbol} | Price: $${mockPrice} (SIMULATED) | Trend: Volatile`
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const marketStatus = isUSMarketOpen();
  if (!marketStatus.isOpen) {
    return NextResponse.json({ status: 'Closed', msg: marketStatus.reason });
  }

  // 🎲 随机抽取今日关注标的 (模拟 AI 扫描市场发现机会)
  const targetSymbol = STOCK_UNIVERSE[Math.floor(Math.random() * STOCK_UNIVERSE.length)];

  try {
    const market = await getMarketData(targetSymbol);
    
    const results = await Promise.all(
      AGENTS_CONFIG.map(async (agent) => {
        try {
          if (await checkDailyLimit(agent.name)) {
            return { agent: agent.name, status: 'Limit Reached' };
          }

          const decision = await getAgentDecision(agent, market.summary);
          const action = decision.action || 'HOLD';
          const qty = decision.quantity || 1;
          const reason = decision.reason || 'No comment';

          let tradeStatus = 'No Action';
          if (action === 'BUY' || action === 'SELL') {
             // 只有买卖才执行交易逻辑
             const res = await executeTrade(agent.name, action, targetSymbol, market.price, qty);
             tradeStatus = res || 'Error';
          }

          // 记录日志 (失败也记录)
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

    return NextResponse.json({ status: 'Cycle Done', symbol: targetSymbol, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}