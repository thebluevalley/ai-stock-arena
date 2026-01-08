'use client';

import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ForceTriggerBtn({ secret }: { secret: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleTrigger = async () => {
    if (!secret) {
      alert("Error: CRON_SECRET is not set in environment variables!");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/cron?key=${secret}&force=true`);
      const data = await res.json();

      if (res.ok) {
        alert(`Success! Trade Cycle Completed.\nMode: ${data.mode}\nSymbol: ${data.symbol}`);
        router.refresh(); // 刷新页面数据
      } else {
        alert(`Failed: ${data.error || 'Unknown Error'}`);
      }
    } catch (error) {
      alert("Network Error: Failed to reach API.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleTrigger}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all ${
        isLoading 
          ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
      }`}
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Zap className="w-3 h-3" />
      )}
      {isLoading ? 'TRADING...' : 'FORCE TRIGGER'}
    </button>
  );
}