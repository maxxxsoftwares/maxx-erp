import './globals.css';
import { Hind, Poppins } from 'next/font/google';
import { LangProvider } from '../lib/i18n';
import Register from './register';
const hind = Hind({ subsets:['devanagari','latin'], weight:['400','600','700'], variable:'--hind' });
const jak = Poppins({ subsets:['latin'], weight:['400','500','600','700'], variable:'--jak' });
export const metadata = { title:'Maxx ERP', manifest:'/manifest.json', icons:{ icon:'/icon.svg', apple:'/icon-180.png' } };
export const viewport = { themeColor:'#0a1464', width:'device-width', initialScale:1 };
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${hind.variable} ${jak.variable}`}>
      <body style={{ '--font':'var(--jak), var(--hind)' }}>
        <LangProvider>{children}</LangProvider><Register />
      </body>
    </html>
  );
}
