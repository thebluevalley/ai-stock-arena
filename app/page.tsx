import { supabase } from '@/lib/supabase';
import { AGENTS_CONFIG } from '@/lib/agents'; 
import { Terminal, Activity, TrendingUp, DollarSign, Briefcase } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [portfolioRes, logsRes] = await Promise.all([
    supabase.from('portfolios').select('*').order('total_value', { ascending: false }),
    supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(25)
  ]);

  const portfolios = portfolioRes.data || [];
  const logs = logsRes.data || [];

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-200 p-6 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-center border-b border-gray-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <Activity className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">AlphaQuant Arena</h1>
              <p className="text-sm text-gray-500 font-medium">Multi-Agent Algorithmic Trading System</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm mt-4 md:mt-0">
             <div className="text-gray-400">
                <span className="block text-xs text-gray-600 uppercase tracking-wider">Status</span>
                <span className="text-emerald-400 font-mono font-bold">● LIVE TRADING</span>
             </div>
             <div className="text-gray-400">
                <span className="block text-xs text-gray-600 uppercase tracking-wider">Market</span>
                <span className="text-white font-mono font-bold">US EQUITIES</span>
             </div>
          </div>
        </header>

        {/* --- 资产仪表盘 (Dashboard Cards) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {portfolios.map((p, idx) => {
            // 匹配配置以获取头像和角色信息
            const agentProfile = AGENTS_CONFIG.find(a => a.name === p.agent_name);
            const profit = p.total_value - 100000;
            const roi = ((profit / 100000) * 100).toFixed(2);
            const isPos = profit >= 0;

            // 处理持仓显示 (过滤掉数量为0的)
            const holdings = p.holdings || {};
            const activeHoldings = Object.entries(holdings)
              .filter(([_, qty]) => Number(qty) > 0)
              .map(([sym, qty]) => `${sym}×${qty}`);

            return (
              <div key={p.agent_name} className="bg-[#111] border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {/* 头像显示 */}
                    <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                       <img src={agentProfile?.avatar} alt={p.agent_name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-200 text-sm">{p.agent_name}</h3>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block">{agentProfile?.role}</span>
                    </div>
                  </div>
                  {idx === 0 && <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded font-bold">LEADER</span>}
                </div>

                <div className="space-y-4">
                  {/* 主要资产数据 */}
                  <div>
                    <div className="text-gray-500 text-xs uppercase mb-1">Net Liquidation Value</div>
                    <div className={`text-2xl font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${Number(p.total_value).toLocaleString()}
                    </div>
                    <div className={`text-xs font-mono mt-1 ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPos ? '▲' : '▼'} {roi}% (P&L: ${Math.abs(profit).toFixed(2)})
                    </div>
                  </div>

                  {/* 详细数据 Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-800/50">
                    <div className="bg-gray-900/50 p-2 rounded">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                        <DollarSign className="w-3 h-3" /> CASH
                      </div>
                      <div className="text-gray-300 font-mono text-sm">${Number(p.cash).toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                        <Briefcase className="w-3 h-3" /> POSITIONS
                      </div>
                      <div className="text-gray-300 font-mono text-xs truncate" title={activeHoldings.join(', ')}>
                        {activeHoldings.length > 0 ? activeHoldings.join(', ') : 'Empty'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- 实时交易终端 (Live Terminal) --- */}
        <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2 bg-gray-900/30">
            <Terminal className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Order Execution Log</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-gray-900/50 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-normal">TIMESTAMP</th>
                  <th className="px-6 py-3 font-normal">AGENT</th>
                  <th className="px-6 py-3 font-normal">SYMBOL</th>
                  <th className="px-6 py-3 font-normal">SIDE</th>
                  <th className="px-6 py-3 font-normal text-right">PRICE</th>
                  <th className="px-6 py-3 font-normal">RATIONALE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-900/40 transition-colors">
                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-3 font-bold text-gray-400">
                      {log.agent_name}
                    </td>
                    <td className="px-6 py-3 text-blue-400 font-bold">
                      {log.symbol}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded ${
                        log.action === 'BUY' ? 'bg-emerald-900/30 text-emerald-500' : 
                        log.action === 'SELL' ? 'bg-rose-900/30 text-rose-500' : 'text-gray-600'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-300">
                      ${Number(log.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-gray-500 truncate max-w-xs" title={log.reason}>
                      {log.reason}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-600 italic">
                      System initializing... Waiting for market data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}