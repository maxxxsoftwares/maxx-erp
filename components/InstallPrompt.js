'use client';
// "Add to Home Screen" prompt: shown only in a mobile browser, never inside the installed app or on a PC
import { useEffect, useState } from 'react';
import { useT } from '../lib/i18n';
const Share = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12 M8 7l4-4 4 4 M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" /></svg>;
export default function InstallPrompt() {
  const { t } = useT(); const [show, setShow] = useState(false); const [ios, setIos] = useState(false); const [ev, setEv] = useState(null); const [guide, setGuide] = useState(false); const [host, setHost] = useState('');
  useEffect(() => {
    const ua = navigator.userAgent, apple = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const mobile = /Android/i.test(ua) || apple, standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    let hidden = 0; try { hidden = +localStorage.getItem('a2hsHide') || 0; } catch {}
    const onPrompt = e => { e.preventDefault(); setEv(e); }, onInstalled = () => setShow(false);
    window.addEventListener('beforeinstallprompt', onPrompt); window.addEventListener('appinstalled', onInstalled);
    if (mobile && !standalone && Date.now() > hidden) { setIos(apple); setHost(location.host); setShow(true); }
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  const add = async () => { if (ev) { ev.prompt(); const r = await ev.userChoice; if (r.outcome === 'accepted') setShow(false); setEv(null); } else setGuide(true); };
  const later = () => { try { localStorage.setItem('a2hsHide', String(Date.now() + 7 * 864e5)); } catch {} setShow(false); };
  if (!show) return null;
  return (<>
    <div className="a2hs" role="region" aria-label={t('a2hsTitle')}>
      <img src="/icon-192.png" alt="" width="44" height="44" />
      <div className="a2hs-t"><b>{t('a2hsTitle')}</b><span>{t('a2hsSub')}</span></div>
      <div className="a2hs-b"><button onClick={add}>{t('a2hsAdd')}</button><button className="ghost" onClick={later}>{t('a2hsLater')}</button></div>
    </div>
    {guide && <div className="gd-back" role="dialog" aria-modal="true" onClick={() => setGuide(false)}><div className="gd" onClick={e => e.stopPropagation()}>
      <h2>{t('a2hsHow')}</h2>
      {ios ? <>
        <p>1. {t('iosS1')}</p><div className="mk mk-url"><span>{host}</span><span className="mk-hl"><Share /></span></div>
        <p>2. {t('iosS2')}</p><div className="mk mk-row"><span>Copy</span><span>Add to reading list</span><span className="mk-hl">View More ⌄</span></div>
        <p>3. {t('iosS3')}</p><div className="mk"><div className="mk-li">Print</div><div className="mk-li mk-hl">＋ Add to Home Screen</div><div className="mk-li">Add to New Quick Note</div></div>
        <p>4. {t('iosS4')}</p><div className="mk mk-row"><span>✕</span><b>Add to Home Screen</b><span className="mk-btn">Add</span></div>
        <p className="gd-done">{t('iosDone')}</p></> : <>
        <p>1. {t('andS1')}</p><div className="mk mk-url"><span>{host}</span><span className="mk-hl">⋮</span></div>
        <p>2. {t('andS2')}</p><div className="mk"><div className="mk-li mk-hl">Add to Home screen</div></div>
        <p>3. {t('andS3')}</p><div className="mk mk-row"><span /><b>Add to Home screen</b><span className="mk-btn">Add</span></div>
        <p className="gd-done">{t('iosDone')}</p></>}
      <button className="full" onClick={() => setGuide(false)}>{t('closeBtn')}</button>
    </div></div>}
  </>);
}
