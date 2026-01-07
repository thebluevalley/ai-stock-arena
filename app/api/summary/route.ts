import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AGENTS_CONFIG } from '@/lib/agents';
import OpenAI from 'openai';

// 强制动态渲染
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 复盘需要写长文，给足时间

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const results = [];

  for (const agent of AGENTS_CONFIG) {
    // 1. 获取今日所有交易记录
    const { data: logs } = await supabaseAdmin
      .from('logs')
      .select('*')
      .eq('agent_name', agent.name)
      .gte('created_at', today);

    // 2. 获取当前资产状况
    const { data: portfolio } = await supabaseAdmin
      .from('portfolios')
      .select('*')
      .eq('agent_name', agent.name)
      .single();

    // 如果今天没操作，就略过
    if (!logs || logs.length === 0) {
      results.push({ agent: agent.name, status: 'No trades today' });
      continue;
    }

    // 3. 构造复盘 Prompt
    const tradeHistory = logs.map(l => `${l.action} ${l.symbol} at $${l.price} (${l.reason})`).join('\n');
    const prompt = `
      你是 ${agent.name}，职业是 ${agent.role}，风格是 ${agent.style}。
      这是你今天的交易记录：
      ${tradeHistory}
      当前总资产：$${portfolio?.total_value || '未知'}。
      
      请写一篇简短的“收盘复盘日记”（100字以内）。
      要求：
      1. 必须符合你的RPG角色人设（比如狂战士要狂野，法师要理智）。
      2. 总结今天的得失。
      3. 包含一个今日心情关键词（如：兴奋、懊悔、淡定）。
      4. 返回JSON格式：{"summary": "日记内容...", "mood": "心情"}
    `;

    try {
      // 这里的调用逻辑和之前一样，根据 agent.provider 选择调用方式
      // 为了简化代码，这里假设你已经把 invokeLLM 封装好了，或者直接复制之前的调用代码
      // 这里简写演示：
      let summaryData = { summary: "今天很累，不想写日记", mood: "疲惫" };
      
      // ... (在此处插入调用 LLM 的代码，类似 getAgentDecision) ...
      // ⚠️ 注意：复盘建议统一用 SiliconFlow 的大模型 (Qwen/DeepSeek) 因为它们写作能力更好
      // 即使是 Doubao 的角色，也可以“借用” Qwen 的大脑来写日记，或者继续用 Doubao。
      
      // 假设拿到了 summaryData
      
      // 4. 存入数据库
      await supabaseAdmin.from('daily_journals').insert({
        agent_name: agent.name,
        date: today,
        summary: summaryData.summary, // 假设 LLM 返回的内容
        mood: summaryData.mood,
        performance: `Asset: $${Math.floor(portfolio?.total_value)}`
      });

      results.push({ agent: agent.name, status: 'Journal written' });

    } catch (e) {
      console.error(e);
    }
  }

  return NextResponse.json({ status: 'Daily Summary Completed', results });
}