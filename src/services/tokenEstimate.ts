// Match the Go checkout's integer arithmetic: floor to token base units.
// This preview never creates a quote, reserves inventory or authorizes payment.
export function usdCents(input:string):bigint|null {
  const normalized=input.trim().replace(',','.');
  if(!/^\d{1,25}(?:\.\d{1,2})?$/.test(normalized))return null;
  const [whole,fraction='']=normalized.split('.');
  return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
}

export function estimateTokens(input:string,priceUsd:string,decimals=18):string|null {
  const cents=usdCents(input);
  if(cents===null||cents<=0n||!/^\d{1,25}(?:\.\d{1,24})?$/.test(priceUsd)||!Number.isInteger(decimals)||decimals<0||decimals>18)return null;
  const [whole,fraction='']=priceUsd.split('.');
  const price=BigInt(whole+fraction);
  if(price<=0n)return null;
  const units=cents*10n**BigInt(fraction.length)*10n**BigInt(decimals)/(100n*price);
  if(units<=0n||units>=2n**256n)return null;
  if(decimals===0)return units.toString();
  const digits=units.toString().padStart(decimals+1,'0');
  return `${digits.slice(0,-decimals)}.${digits.slice(-decimals)}`.replace(/\.?0+$/,'');
}

export function formatTokenEstimate(amount:string,locale:string):string {
  const [whole,fraction='']=amount.split('.');
  // Keep the preview readable. Small positive amounts must never appear as zero.
  const shortFraction=fraction.slice(0,6).replace(/0+$/,'');
  const shownFraction=whole==='0'&&!shortFraction?fraction:shortFraction;
  const formatter=new Intl.NumberFormat(locale);
  const separator=formatter.formatToParts(1.1).find(part=>part.type==='decimal')?.value||'.';
  const localDigit=(digit:string)=>new Intl.NumberFormat(locale,{useGrouping:false}).format(Number(digit));
  return formatter.format(BigInt(whole))+(shownFraction?separator+shownFraction.replace(/\d/g,localDigit):'');
}
