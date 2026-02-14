const a = [
  '', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '
];
const b = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

function inWords(num: number): string {
  if (num === 0) return 'zero';
  if (num > 9999999) {
    return 'Number too large';
  }
  let n = ('0000000' + num).substr(-7).match(/^(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'lakh ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'thousand ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'hundred ' : '';
  str += (Number(n[4]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) : '';
  return str;
}

export function numberToWords(num: number): string {
  if (num === null || num === undefined) return '';
  const [integerPart, decimalPart] = String(num.toFixed(2)).split('.');
  let words = inWords(Number(integerPart));
  if (decimalPart && Number(decimalPart) > 0) {
    words += ' dirhams and ' + inWords(Number(decimalPart)) + 'fils ';
  }
  return words.trim().replace(/\s\s+/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}