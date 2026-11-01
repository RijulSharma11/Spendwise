export function downloadCSV(transactions, formatCurrency) {
  const headers = ['Date', 'Type', 'Category', 'Description', 'Payment Mode', 'Amount'];
  const rows = transactions.map((t) => [
    new Date(t.date).toLocaleDateString(),
    t.type,
    t.category?.name || t.category || '',
    t.description || '',
    t.paymentMode || '',
    t.amount,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `spendwise-transactions-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
