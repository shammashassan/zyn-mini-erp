// UAE currency denominations: Dirhams (integer) and Fils (decimal)
// Uses international system: Millions, Thousands, Hundreds

const ones: string[] = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tens: string[] = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function inWords(num: number): string {
  if (num <= 0) return '';

  if (num < 20) {
    return ones[num];
  }

  if (num < 100) {
    const t = tens[Math.floor(num / 10)];
    const o = ones[num % 10];
    return o ? `${t} ${o}` : t;
  }

  if (num < 1000) {
    const remainder = num % 100;
    return `${ones[Math.floor(num / 100)]} Hundred${remainder ? ` And ${inWords(remainder)}` : ''}`;
  }

  if (num < 1_000_000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return `${inWords(thousands)} Thousand${remainder ? ` ${inWords(remainder)}` : ''}`;
  }

  if (num < 1_000_000_000) {
    const millions = Math.floor(num / 1_000_000);
    const remainder = num % 1_000_000;
    return `${inWords(millions)} Million${remainder ? ` ${inWords(remainder)}` : ''}`;
  }

  return 'Number Too Large';
}

export function numberToWords(num: number): string {
  if (num === null || num === undefined) return '';
  if (num === 0) return 'Zero Dirhams Only';

  const fixed = Math.abs(num).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const intNum = parseInt(intPart, 10);
  const decNum = parseInt(decPart, 10);

  let words = inWords(intNum);
  words += ' Dirhams';

  if (decNum > 0) {
    words += ` And ${inWords(decNum)} Fils`;
  }

  return `${words} Only`;
}