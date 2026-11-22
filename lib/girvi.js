import { n2 } from './acc';
export const days = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5));
// 30-day months. Interest accrues on the principal outstanding between payments; compound adds unpaid interest to the base.
export function calc(loan, pays, asOn) {
  let p = +loan.principal, acc = 0, cur = loan.loan_date, paidI = 0, paidP = 0; const rate = +loan.rate_pct / 100;
  const seg = to => { acc += (loan.interest_type === 'compound' ? p + acc : p) * rate * days(cur, to) / 30; cur = to > cur ? to : cur; };
  [...(pays || [])].filter(x => x.pay_date <= asOn).sort((a, b) => a.pay_date.localeCompare(b.pay_date)).forEach(x => {
    seg(x.pay_date);
    if (x.kind === 'interest') { acc -= +x.amount; paidI += +x.amount; } else { p -= +x.amount; paidP += +x.amount; }
  });
  seg(asOn);
  const d = new Date(loan.loan_date); d.setMonth(d.getMonth() + (+loan.tenure_months || 12));
  return { principal: n2(p), interest: n2(acc), total: n2(p + acc), paidI: n2(paidI), paidP: n2(paidP), dueDate: d.toISOString().slice(0, 10), months: Math.round(days(loan.loan_date, asOn) / 3) / 10 };
}
