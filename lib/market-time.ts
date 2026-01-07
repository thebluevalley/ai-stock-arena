// 检查当前是否为美股交易时间 (EST 9:30 - 16:00, Mon-Fri)
export function isUSMarketOpen(): { isOpen: boolean; reason: string } {
  // 强制转换为纽约时间
  const now = new Date();
  const nyTimeStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyTime = new Date(nyTimeStr);

  const day = nyTime.getDay(); // 0 is Sunday, 6 is Saturday
  const hour = nyTime.getHours();
  const minute = nyTime.getMinutes();
  const totalMinutes = hour * 60 + minute;

  // 1. 周末不开盘
  if (day === 0 || day === 6) {
    return { isOpen: false, reason: 'Market Closed (Weekend)' };
  }

  // 2. 盘前盘后 (9:30 AM = 570 mins, 4:00 PM = 960 mins)
  if (totalMinutes < 570) return { isOpen: false, reason: 'Pre-Market (Before 9:30 AM EST)' };
  if (totalMinutes >= 960) return { isOpen: false, reason: 'After-Hours (After 4:00 PM EST)' };

  return { isOpen: true, reason: 'Market Open' };
}