import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = { title: { default: 'WR Finance', template: '%s · WR Finance' }, description: 'Controle financeiro simples, visual e inteligente para empresas.' };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR" suppressHydrationWarning><body><ThemeProvider>{children}</ThemeProvider></body></html>;
}
