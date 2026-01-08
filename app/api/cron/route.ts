import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AGENTS_CONFIG, getAgentDecision } from '@/lib/agents';
import { checkDailyLimit, executeTrade } from '@/lib/trade';
import { isUSMarketOpen } from '@/lib/market-time';

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

// 扩充股票池，确保够分
const STOCK_UNIVERSE = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMD', 'GOOGL', 'AMZN', 'META', 'PLTR', 'COIN', 'NFLX', 'INTC'];

// 洗牌算法：打乱数组顺序
function shuffleArray(array: string[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function getMarketData(symbol: string) {
  // 1. 优先尝试 Alpaca
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
    } catch (e) { console.error(`Alpaca Error (${symbol}):`, e); }
  }
  
  // 2. 模拟兜底 (增加随机波动，让价格看起来更真实)
  const basePrice = 100 + (symbol.length * 10); // 根据名字长度生成基础价，保证不同股票价格不同
  const randomMove = (Math.random() * 10 - 5);
  const mockPrice = (basePrice + randomMove).toFixed(2);
  return { price: parseFloat(mockPrice), summary: `Symbol: ${symbol} | Price: $${mockPrice} (SIMULATED)` };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // 鉴权
  if (searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 强制模式 & 市场时间检查
  const isForceRun = searchParams.get('force') === 'true';
  const marketStatus = isUSMarketOpen();
  if (!marketStatus.isOpen && !isForceRun) {
    return NextResponse.json({ status: 'Closed', msg: `Market Closed (${marketStatus.reason})` });
  }

  try {
    // 🎲 核心改动：洗牌股票池
    // 这一步保证了每个 Agent 在这一轮里拿到的股票都是随机且不同的
    const shuffledStocks = shuffleArray([...STOCK_UNIVERSE]);

    const results = await Promise.all(
      AGENTS_CONFIG.map(async (agent, index) => {
        // 为每个 Agent 分配一只独特的股票
        // 如果 Agent 数量超过股票数，用取余数循环分配
        const targetSymbol = shuffledStocks[index % shuffledStocks.length];

        try {
          if (await checkDailyLimit(agent.name) && !isForceRun) {
             return { agent: agent.name, status: 'Limit Reached' };
          }

          // 获取该股票的独立行情
          const market = await getMarketData(targetSymbol);
          
          // AI 独立决策
          const decision = await getAgentDecision(agent, market.summary);
          const action = decision.action || 'HOLD';
          const qty = decision.quantity || 1;
          const reason = decision.reason || 'No comment';

          let tradeStatus = 'No Action';
          if (action === 'BUY' || action === 'SELL') {
             // 执行交易
             const res = await executeTrade(agent.name, action, targetSymbol, market.price, qty);
             tradeStatus = res || 'Error';
          }

          // 记录日志
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

    return NextResponse.json({ status: 'Success', mode: isForceRun ? 'FORCE' : 'AUTO', results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}