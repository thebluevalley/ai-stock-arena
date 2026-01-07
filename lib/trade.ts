import { supabaseAdmin } from '@/lib/supabase';

// 每日最大交易次数限制
const MAX_DAILY_TRADES = 5;

// 1. 检查今日交易次数是否超限
export async function checkDailyLimit(agentName: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]; // 获取 YYYY-MM-DD
  
  const { count, error } = await supabaseAdmin
    .from('logs')
    .select('*', { count: 'exact', head: true })
    .eq('agent_name', agentName)
    .gte('created_at', today);

  if (error) {
    console.error('Limit check error:', error);
    return true; // 出错时为了安全，暂停交易
  }

  return (count || 0) >= MAX_DAILY_TRADES;
}

// 2. 执行交易并更新账户
export async function executeTrade(
  agentName: string, 
  action: 'BUY' | 'SELL' | 'HOLD', 
  symbol: string, 
  price: number, 
  quantity: number
) {
  // A. 获取当前账户状态
  const { data: portfolio } = await supabaseAdmin
    .from('portfolios')
    .select('*')
    .eq('agent_name', agentName)
    .single();

  if (!portfolio) return;

  let newCash = Number(portfolio.cash);
  let newHoldings = portfolio.holdings || {};
  const currentQty = newHoldings[symbol] || 0;
  const cost = price * quantity;

  // B. 计算资金变动
  if (action === 'BUY') {
    if (newCash < cost) return 'Fails: 余额不足'; // 没钱买不起
    newCash -= cost;
    newHoldings[symbol] = currentQty + quantity;
  } else if (action === 'SELL') {
    if (currentQty < quantity) return 'Fails: 持仓不足'; // 没货卖不出
    newCash += cost;
    newHoldings[symbol] = Math.max(0, currentQty - quantity);
  } else {
    return 'HOLD';
  }

  // C. 计算当前总资产 (现金 + 股票最新市值)
  const stockValue = (newHoldings[symbol] || 0) * price; 
  // 注意：如果持有多只股票，这里简化只计算当前这只的市值更新，
  // 严谨做法是遍历 holdings 所有 key 获取最新价，这里做 MVP 简化。
  const totalValue = newCash + stockValue; 

  // D. 写入数据库
  await supabaseAdmin
    .from('portfolios')
    .update({
      cash: newCash,
      holdings: newHoldings,
      total_value: totalValue,
      last_updated: new Date().toISOString()
    })
    .eq('agent_name', agentName);

  return 'Success';
}