import { supabase } from '@/lib/supabase';
import { Terminal, Activity, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic'; // 确保不缓存，每次刷新看最新数据

export default async function Home() {
  const { data: logs } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-200 p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
              <Terminal className="w-6 h-6" />
              AI Stock Arena
            </h1>
            <p className="text-xs text-gray-500 mt-1">SiliconFlow vs Volcano Engine</p>
          </div>
          <div className="text-right text-xs text-gray-500">
             Target: <span className="text-yellow-400">NVDA</span>
          </div>
        </header>

        {/* 仪表盘统计区域 (可扩展) */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-900/50 p-4 rounded border border-gray-800">
             <h3 className="text-sm text-gray-400 flex items-center gap-2"><Activity className="w-4 h-4"/> 最新报价</h3>
             <p className="text-2xl font-bold text-white mt-2">${logs?.[0]?.price || '---'}</p>
          </div>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-800">
             <h3 className="text-sm text-gray-400 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> 决策总数</h3>
             <p className="text-2xl font-bold text-white mt-2">{logs?.length || 0}</p>
          </div>
        </div>

        {/* 日志列表 */}
        <div className="space-y-3">
          {logs?.map((log) => (
            <div key={log.id} className="bg-gray-900 border border-gray-800 p-4 rounded-lg hover:border-emerald-500/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded font-bold ${
                    log.model_provider === 'silicon' ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'
                  }`}>
                    {log.agent_name}
                  </span>
                  <span className="text-xs text-gray-600">{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
                <div className={`px-3 py-1 rounded text-sm font-bold ${
                    log.action === 'BUY' ? 'bg-emerald-900/20 text-emerald-400' : 
                    log.action === 'SELL' ? 'bg-red-900/20 text-red-400' : 'text-gray-500'
                }`}>
                  {log.action}
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed pl-1 border-l-2 border-gray-700 ml-1">
                {log.reason}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}