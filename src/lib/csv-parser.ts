// Bank statement CSV parser
// Supports common bank export formats:
// - Single "Amount" column (positive = deposit, negative = withdrawal)
// - Separate "Debit"/"Credit" columns

export interface ParsedBankLine {
  date: string;
  description: string;
  amount: number; // positive = deposit, negative = withdrawal
  reference?: string;
}

export function parseCSV(text: string): ParsedBankLine[] {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

  const header = parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());

  const dateIdx = header.findIndex(h => h.includes('date'));
  const descIdx = header.findIndex(h =>
    h.includes('description') || h.includes('memo') || h.includes('payee') || h.includes('details')
  );
  const amountIdx = header.findIndex(h => h === 'amount' || h === 'transaction amount');
  const debitIdx = header.findIndex(h => h === 'debit' || h === 'withdrawal' || h === 'withdrawals');
  const creditIdx = header.findIndex(h => h === 'credit' || h === 'deposit' || h === 'deposits');
  const refIdx = header.findIndex(h =>
    h.includes('reference') || h.includes('check') || h.includes('number') || h.includes('ref')
  );

  if (dateIdx === -1) throw new Error('CSV must have a date column (e.g., "Date")');
  if (descIdx === -1) throw new Error('CSV must have a description column (e.g., "Description", "Memo", "Payee")');
  if (amountIdx === -1 && (debitIdx === -1 || creditIdx === -1)) {
    throw new Error('CSV must have an "Amount" column, or separate "Debit"/"Credit" columns');
  }

  const results: ParsedBankLine[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    if (cols.length <= dateIdx || cols.length <= descIdx) continue;

    let amount: number;
    if (amountIdx !== -1) {
      amount = parseCurrencyValue(cols[amountIdx]);
    } else {
      const debit = parseCurrencyValue(cols[debitIdx] || '0');
      const credit = parseCurrencyValue(cols[creditIdx] || '0');
      amount = credit - debit;
    }

    if (isNaN(amount) || amount === 0) continue;

    const dateStr = cols[dateIdx]?.trim();
    if (!dateStr) continue;

    results.push({
      date: dateStr,
      description: cols[descIdx]?.trim() || '',
      amount,
      reference: refIdx !== -1 ? cols[refIdx]?.trim() || undefined : undefined,
    });
  }

  if (results.length === 0) throw new Error('No valid transactions found in CSV');
  return results;
}

function parseCurrencyValue(value: string): number {
  if (!value || !value.trim()) return 0;
  const cleaned = value.trim();
  // Handle parentheses for negative: (500.00) -> -500.00
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    return -parseFloat(cleaned.slice(1, -1).replace(/[$,]/g, ''));
  }
  return parseFloat(cleaned.replace(/[$,]/g, ''));
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

export function parseDateString(dateStr: string): Date | null {
  // Try common date formats: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, M/D/YYYY
  const formats = [
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,  // MM/DD/YYYY or M/D/YYYY
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,   // YYYY-MM-DD
  ];

  for (const fmt of formats) {
    const match = dateStr.match(fmt);
    if (match) {
      let year: number, month: number, day: number;
      if (match[1].length === 4) {
        year = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        day = parseInt(match[3]);
      } else {
        month = parseInt(match[1]) - 1;
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      }
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}
