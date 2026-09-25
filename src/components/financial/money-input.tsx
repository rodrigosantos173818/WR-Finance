'use client';
import { Input } from '@/components/ui/input';
import { moneyMask } from '@/utils/money';
export function MoneyInput({value,onChange,id='amount',name='amount',large=false}:{value:string;onChange:(value:string)=>void;id?:string;name?:string;large?:boolean}) {
  return <div className="relative"><span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground ${large?'text-xl':'text-sm'}`}>R$</span><Input id={id} name={name} inputMode="numeric" autoComplete="off" required aria-label="Valor em reais" value={value} onChange={event=>onChange(moneyMask(event.target.value))} placeholder="0,00" className={large?'h-20 pl-14 text-3xl font-semibold tracking-tight md:text-3xl':'h-11 pl-11'}/></div>;
}
