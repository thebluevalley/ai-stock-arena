import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AGENTS_CONFIG, getAgentDecision } from '@/lib/agents';
import { checkDailyLimit, executeTrade } from '@/lib/trade';
import { isUSMarketOpen } from '@/lib/market-time';

// Vercel 配置：设置最大超时时间为 60 秒（防止 AI 思考超时）
export const maxDuration = 60; 
// 强制动态渲染，防止 Vercel 缓存 API 结果
export const dynamic = 'force-dynamic';

// --- 辅助函数：获取市场数据 (Alpaca) ---
async function getMarketData(symbol: string) {
  // 优先尝试使用 Alpaca 获取真实模拟盘数据
  if (process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET) {
    try {
      const url = `https://paper-api.alpaca.markets/v2/stocks/${symbol}/bars?timeframe=15Min&limit=5`;
      const response = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const bars = data.bars[symbol];
        if (bars && bars.length > 0) {
          const latest = bars[0]; // 获取最新的一根K线
          return {
            price: latest.c, // Close price
            summary: `Symbol: ${symbol}, Price: ${latest.c}, High: ${latest.h}, Low: ${latest.l}, Volume: ${latest.v}, Timestamp: ${latest.t}`
          };
        }
      }
    } catch (e) {
      console.error("Alpaca Fetch Error:", e);
    }
  }

  // ⚠️ 兜底方案：如果 API 配置失败或报错，使用模拟数据防止程序崩溃
  // 实际生产中应报错停止，但在演示项目中保持运行
  console.warn("Using Mock Data for Market Price");
  const mockPrice = 140.00 + (Math.random() * 5 - 2.5); // 137.5 ~ 142.5 随机波动
  return {
    price: parseFloat(mockPrice.toFixed(2)),
    summary: `Symbol: ${symbol}, Price: ${mockPrice.toFixed(2)} (MOCK DATA), Trend: Volatile`
  };
}

// --- 主 API 入口 ---
export async function GET(request: Request) {
  // 1. 安全鉴权：验证 Cron Secret
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. 检查美股交易时间 (RPG 规则：只在开盘时间战斗)
  const marketStatus = isUSMarketOpen();
  if (!marketStatus.isOpen) {
    return NextResponse.json({ 
      status: 'Standby', 
      message: `Market Closed: ${marketStatus.reason}`,
      time: new Date().toLocaleString() 
    });
  }

  const TARGET_SYMBOL = 'NVDA'; // 本次大赛指定标的：英伟达

  try {
    // 3. 获取市场行情
    const market = await getMarketData(TARGET_SYMBOL);
    
    // 4. 并行触发所有智能体 (使用 Promise.all 加速)
    const results = await Promise.all(
      AGENTS_CONFIG.map(async (agent) => {
        try {
          // A. 检查每日交易次数限制
          const isLimitReached = await checkDailyLimit(agent.name);
          if (isLimitReached) {
            return { 
              agent: agent.name, 
              status: 'Skipped', 
              reason: 'Daily trade limit reached (Max 5)' 
            };
          }

          // B. AI 进行思考与决策
          const decision = await getAgentDecision(agent, market.summary);
          
          // 默认动作修正
          const action = decision.action || 'HOLD';
          const qty = decision.quantity || 1; // 默认每次交易 1 股
          const reason = decision.reason || 'AI 未提供理由';

          // C. 如果不是 HOLD，执行交易逻辑 (扣款/加仓)
          let tradeStatus = 'No Action';
          
          if (action === 'BUY' || action === 'SELL') {
             // 调用 lib/trade.ts 中的函数处理资金表
             const executionResult = await executeTrade(agent.name, action, TARGET_SYMBOL, market.price, qty);
             
             // 如果 executeTrade 返回错误信息 (如余额不足)，则记录
             tradeStatus = executionResult || 'Unknown Error';
          }

          // D. 记录日志到 logs 表 (仅当成功交易或决定 HOLD 时记录，失败的交易不记录或单独处理)
          // 注意：如果 tradeStatus 以 "Fails" 开头，说明资金不足等，我们依然记录，但在 action 栏标注失败
          if (action !== 'HOLD' && tradeStatus.startsWith('Fails')) {
             await supabaseAdmin.from('logs').insert({
                agent_name: agent.name,
                model_provider: agent.provider,
                action: 'FAIL', // 标记为失败
                symbol: TARGET_SYMBOL,
                reason: `${reason} [系统备注: ${tradeStatus}]`,
                price: market.price,
                quantity: qty
             });
          } else {
             // 正常的 BUY/SELL/HOLD 记录
             await supabaseAdmin.from('logs').insert({
                agent_name: agent.name,
                model_provider: agent.provider,
                action: action,
                symbol: TARGET_SYMBOL,
                reason: reason,
                price: market.price,
                quantity: qty
             });
          }

          return {
            agent_name: agent.name,
            model_provider: agent.provider,
            action: action,
            price: market.price,
            status: tradeStatus
          };

        } catch (innerError: any) {
          // 单个 Agent 报错不影响其他人
          console.error(`Agent ${agent.name} failed:`, innerError);
          return { agent: agent.name, status: 'Error', error: innerError.message };
        }
      })
    );

    return NextResponse.json({ 
      status: 'Cycle Completed', 
      market_price: market.price,
      results 
    });

  } catch (error: any) {
    console.error("Cron Job Critical Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}