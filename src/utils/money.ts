// Decimal strings remain exact. Only charts convert them to numbers for pixel placement.
export function formatCurrency(value:string) {
  if(!/^-?\d+(\.\d{1,2})?$/.test(value)) return '—';
  const negative=value.startsWith('-');
  const [integer,fraction='']=value.replace('-','').split('.');
  return `${negative?'− ':''}R$ ${BigInt(integer).toLocaleString('pt-BR')},${fraction.padEnd(2,'0')}`;
}
export function parseMoneyInput(value:string):string|null {
  const clean=value.trim().replace(/^R\$\s*/, '');
  if(!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(clean)) return null;
  const [integer,fraction='']=clean.replaceAll('.','').split(',');
  const cents=BigInt(integer)*100n+(integer.startsWith('-')?-1n:1n)*BigInt(fraction.padEnd(2,'0'));
  if(cents>99999999999999n||cents< -99999999999999n) return null;
  const absolute=cents<0n?-cents:cents;
  return `${cents<0n?'-':''}${absolute/100n}.${String(absolute%100n).padStart(2,'0')}`;
}
export function moneyMask(value:string) {
  const digits=value.replace(/\D/g,'').slice(0,14);
  if(!digits) return '';
  const cents=BigInt(digits);
  return `${(cents/100n).toLocaleString('pt-BR')},${String(cents%100n).padStart(2,'0')}`;
}
