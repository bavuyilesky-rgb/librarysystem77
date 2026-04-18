export const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

export const fmtNum = (n: number) => new Intl.NumberFormat("en-US").format(n || 0);

export const calcFine = (
  dueDate: string,
  returnDate: string | Date,
  s: { daily_fine_rate: number; grace_period_days: number; max_fine: number }
) => {
  const due = new Date(dueDate);
  const ret = new Date(returnDate);
  const days = Math.floor((ret.getTime() - due.getTime()) / 86400000);
  const overdue = Math.max(0, days - s.grace_period_days);
  if (overdue <= 0) return 0;
  return Math.min(overdue * s.daily_fine_rate, s.max_fine);
};
