// Drawer menu. `only` = setup types that see the item (no `only` = everyone).
// An item without href is not built yet (shown dimmed). href may be {setup: path}.
const STOCK = ['jewellery', 'general'], LOAN = ['jewellery', 'girvi_loan'], JEW = ['jewellery'];
export const MENU = [
  { k: 'accountInfo', items: [
    { k: 'accGroup', sub: [{ k: 'createNew', href: '/books/groups#create' }, { k: 'alter', href: '/books/groups#alter' }, { k: 'delete', href: '/books/groups#delete', danger: true }] },
    { k: 'ledgers', sub: [{ k: 'addLedger', href: '/books/ledgers#create' }, { k: 'alterLedger', href: '/books/ledgers#alter' }, { k: 'deleteLedger', href: '/books/ledgers#delete', danger: true }] }] },
  { k: 'inventoryInfo', only: STOCK, items: [
    { k: 'invGroup', sub: [{ k: 'createNew', href: { jewellery: '/jewellery/categories' } }, { k: 'alter' }, { k: 'delete', danger: true }] },
    { k: 'stockItem', sub: [{ k: 'createNew', href: { jewellery: '/jewellery/tags/new' } }, { k: 'alter' }, { k: 'delete', href: { jewellery: '/jewellery/tags' }, danger: true }] }] },
  { k: 'accountingVoucher', items: [
    { k: 'contra', key: 'F4', href: '/books/voucher/contra' },
    { k: 'payment', key: 'F5', href: '/books/voucher/payment' },
    { k: 'receipt', key: 'F6', href: '/books/voucher/receipt' },
    { k: 'journalEntry', key: 'F7', href: '/books/voucher/journal' },
    { k: 'sales', key: 'F8', href: '/books/voucher/sales', only: STOCK },
    { k: 'purchase', key: 'F9', href: '/books/voucher/purchase', only: STOCK },
    { k: 'creditNote', key: 'Ctrl+F8', only: STOCK },
    { k: 'debitNote', key: 'Ctrl+F9', only: STOCK },
    { k: 'bhavCutting', key: 'F10', only: JEW },
    { k: 'loanGiven', key: 'F11', href: '/girvi/new', only: LOAN },
    { k: 'loanReceived', key: 'F12', href: '/girvi#active', only: LOAN },
    { k: 'loanTransfer', only: LOAN },
    { k: 'stockJournal', key: 'Alt+F7', only: STOCK }, { k: 'salesOrder', key: 'Alt+F8', only: STOCK }, { k: 'purchaseOrder', key: 'Alt+F9', only: STOCK },
    { k: 'rejectionIn', key: 'Alt+F5', only: STOCK }, { k: 'rejectionOut', key: 'Alt+F6', only: STOCK }] },
  { k: 'display', items: [
    { k: 'balanceSheet', key: 'B', href: '/books/financials' },
    { k: 'ledgerRpt', sub: [{ k: 'ledgerRpt', href: '/books/ledger-report' }, { k: 'detailedLedger' }, { k: 'combinedLedger' }] },
    { k: 'loanReport', only: LOAN, sub: [{ k: 'allLoanList', key: 'Alt+B', href: '/girvi#all' }, { k: 'byPartyAccount', key: 'Ctrl+Z' },
      { k: 'pendingLoans', key: 'Ctrl+P', href: '/girvi#active' }, { k: 'closedLoan', key: 'Ctrl+C', href: '/girvi#released' }, { k: 'searchLoan', key: 'Ctrl+S', href: '/girvi#all' }] },
    { k: 'dayBook', href: '/books/daybook' }, { k: 'trialBalance', href: '/books/trial' }, { k: 'outstanding2', href: '/books/outstanding' },
    { k: 'gstReport', href: '/books/gst' }, { k: 'bankRecon', href: '/books/bank-recon' }] },
  { k: 'settings', items: [{ k: 'company', href: '/books/company' }] },
  { k: 'backupRestore', items: [{ k: 'backup' }, { k: 'restore' }] },
  { k: 'importExport', items: [{ k: 'importData' }, { k: 'exportData' }] },
];
export const hrefOf = (x, st) => (x && typeof x.href === 'object' ? x.href[st] : x?.href);
export const canSee = (x, st) => !x.only || x.only.includes(st);
export function menuFor(st) {
  return MENU.filter(g => canSee(g, st)).map(g => ({ ...g, items: g.items.filter(i => canSee(i, st)) })).filter(g => g.items.length);
}
