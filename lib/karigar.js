import { r3, n2 } from './acc';
// fine balance > 0: karigar holds our metal. cash > 0: we owe the karigar.
export const apply = (b, x) => {
  if (x.kind === 'issue') b[x.metal] += +x.fine_wt;
  if (x.kind === 'receive') { b[x.metal] -= +x.fine_wt + +x.wastage_fine; b.cash += +x.labour_amount; }
  if (x.kind === 'return') b[x.metal] -= +x.fine_wt;
  if (x.kind === 'payment') b.cash -= +x.cash_amount;
  return b;
};
export const balances = tx => { const b = tx.reduce(apply, { gold: 0, silver: 0, cash: 0 }); return { gold: r3(b.gold), silver: r3(b.silver), cash: n2(b.cash) }; };
