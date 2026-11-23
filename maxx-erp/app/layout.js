import './globals.css';
import { Hind, Plus_Jakarta_Sans } from 'next/font/google';
import { LangProvider } from '../lib/i18n';
import Register from './register';
const hind = Hind({ subsets:['devanagari','latin'], weight:['400','600','700'], variable:'--hind' });
const jak = Plus_Jakarta_Sans({ subsets:['latin'], variable:'--jak' });
export const metadata = { title:'Maxx ERP', manifest:'/manifest.json', icons:{ icon:'/icon.svg', apple:'/icon.svg' } };
export const viewport = { themeColor:'#1f3a34', width:'device-width', initialScale:1 };
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${hind.variable} ${jak.variable}`}>
      <body style={{ '--font':'var(--jak), var(--hind)' }}>
        <LangProvider>{children}</LangProvider><Register />
      </body>
    </html>
  );
}
