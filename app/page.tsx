import { supabase } from '@/lib/supabase';
import { AGENTS_CONFIG } from '@/lib/agents'; // 引入配置拿头像和属性
import { Terminal, BookOpen, Swords } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 获取数据 (并行请求加速)
  const [portfolioRes, logsRes, journalsRes] = await Promise.all([
    supabase.from('portfolios').select('*').order('total_value', { ascending: false }),
    supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('daily_journals').select('*').order('created_at', { ascending: false }).limit(4)
  ]);

  const portfolios = portfolioRes.data || [];
  const logs = logsRes.data || [];
  const journals = journalsRes.data || [];

  return (
    <main className="min-h-screen bg-[#111] text-gray-200 p-4 md:p-8 font-mono">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-end border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center gap-3">
              <Swords className="w-10 h-10 text-indigo-400" />
              AI STOCK RPG
            </h1>
            <p className="text-sm text-gray-500 mt-2">Serverless Automated Trading Arena</p>
          </div>
          <div className="text-right">
             <div className="flex items-center gap-2 text-green-500 text-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                US Market Status: Checked
             </div>
          </div>
        </header>

        {/* --- 🎭 角色卡片 (RPG 风格) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {portfolios.map((p) => {
            // 匹配配置文件里的 RPG 信息
            const config = AGENTS_CONFIG.find(a => a.name === p.agent_name);
            const profit = p.total_value - 100000;
            const isWin = profit >= 0;

            return (
              <div key={p.agent_name} className="group relative bg-[#1a1a1a] border border-gray-800 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all duration-300">
                {/* 顶部背景条 */}
                <div className={`h-2 w-full ${isWin ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                
                <div className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    {/* 像素头像 */}
                    <img src={config?.avatar} alt="avatar" className="w-16 h-16 rounded-lg border-2 border-gray-700 shadow-lg bg-gray-800" />
                    <div>
                      <h3 className="font-bold text-white text-lg leading-tight">{p.agent_name}</h3>
                      <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">{config?.role}</span>
                    </div>
                  </div>

                  {/* 资产大数字 */}
                  <div className="mb-4">
                    <p className={`text-2xl font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${Number(p.total_value).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                       Cash: ${Number(p.cash).toLocaleString()} | NVDA: {p.holdings?.NVDA || 0}
                    </p>
                  </div>

                  {/* RPG 属性条 */}
                  <div className="space-y-2 text-[10px] text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>INT</span>
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{width: `${config?.rpgStats.intelligence}%`}}></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>RISK</span>
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500" style={{width: `${config?.rpgStats.risk}%`}}></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 人设台词/风格 */}
                  <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-500 italic">
                    "{config?.style}"
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- 📔 复盘日记 (左侧 2/3) --- */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-pink-400">
              <BookOpen className="w-5 h-5" /> Daily Journals
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {journals.length === 0 ? (
                <div className="text-gray-600 text-sm italic">等待收盘后生成日记...</div>
              ) : (
                journals.map(j => (
                  <div key={j.id} className="bg-[#1a1a1a] p-5 rounded-lg border border-gray-800 relative">
                     <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-purple-300">{j.agent_name}</span>
                        <span className="text-xs text-gray-500">{j.date}</span>
                     </div>
                     <p className="text-gray-300 text-sm leading-relaxed mb-3">
                       {j.summary}
                     </p>
                     <div className="flex gap-3 text-xs">
                        <span className="bg-gray-800 px-2 py-1 rounded text-gray-400">Mood: {j.mood}</span>
                        <span className="bg-gray-800 px-2 py-1 rounded text-gray-400">{j.performance}</span>
                     </div>
                  </div>
                ))
              )}
            </div>

            {/* 交易列表 */}
            <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400 pt-6">
              <Terminal className="w-5 h-5" /> Live Feed
            </h2>
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between bg-[#161616] p-3 rounded border border-gray-800/50 hover:border-gray-700 text-sm">
                   <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs">{new Date(log.created_at).toLocaleTimeString()}</span>
                      <span className="font-bold text-gray-300 w-24">{log.agent_name}</span>
                      <span className={`font-bold ${log.action==='BUY'?'text-emerald-500':'text-rose-500'}`}>
                        {log.action}
                      </span>
                   </div>
                   <div className="text-gray-500 text-xs truncate max-w-[200px] md:max-w-md">
                     {log.reason}
                   </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- 右侧边栏 (规则说明) --- */}
          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 h-fit">
            <h3 className="font-bold text-white mb-4">Arena Rules</h3>
            <ul className="space-y-3 text-sm text-gray-400 list-disc pl-4">
              <li>Open: 9:30 AM - 4:00 PM (EST)</li>
              <li>Asset: NVDA (Nvidia)</li>
              <li>Start Capital: $100,000</li>
              <li>Daily Limit: 5 Trades / Agent</li>
            </ul>
            <div className="mt-6 pt-6 border-t border-gray-800">
               <p className="text-xs text-gray-600 text-center">
                 Powered by SiliconFlow & Volcano Engine
               </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}