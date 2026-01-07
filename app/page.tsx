import { supabase } from '@/lib/supabase';
import { Terminal, TrendingUp, Wallet, Clock, ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 1. 获取排行榜数据 (按总资产降序)
  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('*')
    .order('total_value', { ascending: false });

  // 2. 获取最近交易日志
  const { data: logs } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-200 p-4 md:p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        
        {/* 标题栏 */}
        <header className="mb-10 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 flex items-center gap-3">
            <Terminal className="w-8 h-8 text-emerald-400" />
            AI Trading Arena
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Target: <span className="text-yellow-400 font-bold">NVDA</span> | Initial Capital: $100,000
          </p>
        </header>

        {/* --- 🏆 战绩排行榜 (Grid 布局) --- */}
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-yellow-400" /> Live Leaderboard
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {portfolios?.map((p, index) => {
            const profit = p.total_value - 100000;
            const isProfitable = profit >= 0;
            const holdings = p.holdings || {};
            const stockCount = holdings['NVDA'] || 0;

            return (
              <div key={p.agent_name} className={`relative bg-gray-900 border rounded-xl p-5 transition-all hover:transform hover:-translate-y-1 ${
                index === 0 ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border-gray-800'
              }`}>
                {index === 0 && <div className="absolute -top-3 right-4 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded">👑 1st</div>}
                
                <h3 className="text-lg font-bold text-gray-100 mb-1">{p.agent_name}</h3>
                <div className="text-xs text-gray-500 mb-4 font-sans">
                   {p.agent_name.includes('Doubao') ? 'Volcano Engine' : 'SiliconFlow'}
                </div>

                <div className="space-y-3">
                  {/* 总资产 */}
                  <div>
                    <p className="text-xs text-gray-500">Total Assets</p>
                    <p className={`text-2xl font-bold ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${Number(p.total_value).toLocaleString()}
                    </p>
                    <p className={`text-xs ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isProfitable ? '+' : ''}{((profit / 100000) * 100).toFixed(2)}%
                    </p>
                  </div>

                  {/* 详细持仓 */}
                  <div className="grid grid-cols-2 gap-2 text-sm pt-3 border-t border-gray-800">
                    <div>
                      <span className="text-gray-500 flex items-center gap-1"><Wallet className="w-3 h-3"/> Cash</span>
                      <span className="text-gray-300">${Number(p.cash).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> NVDA</span>
                      <span className="text-yellow-200">{stockCount} shares</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- 📝 交易历史 (Table 布局) --- */}
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" /> Transaction History
        </h2>
        
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800/50 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Agent</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs?.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-300">
                      {log.agent_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.action === 'BUY' ? 'bg-emerald-900/30 text-emerald-400' : 
                        log.action === 'SELL' ? 'bg-red-900/30 text-red-400' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {log.action} {log.quantity > 0 && `x${log.quantity}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      ${Number(log.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-400 max-w-xs truncate" title={log.reason}>
                      {log.reason}
                    </td>
                  </tr>
                ))}
                {logs?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No transactions recorded yet. Waiting for market execution...
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