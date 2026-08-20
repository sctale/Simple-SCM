// 日期工具

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getToday(): string {
  return formatDate(new Date());
}

// 时间戳 → YYYY-MM-DD HH:mm
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 相对时间
export function relativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 2 * day) return '昨天';
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  return formatDate(new Date(ts));
}

// 时间戳 → 短时间（今天显示 HH:mm，否则 MM-DD）
export function shortTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (formatDate(d) === formatDate(today)) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return `${d.getMonth() + 1}-${d.getDate()}`;
}
