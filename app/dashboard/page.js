'use client';
// Blank desktop, plus the business's welcome image (if the owner set one) and the
// Add to Home Screen prompt, which only appears in a mobile browser.
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import InstallPrompt from '../../components/InstallPrompt';
export default function Dashboard() {
  const [img, setImg] = useState('');
  useEffect(() => { supabase.from('company_profile').select('welcome_image_url').maybeSingle().then(({ data }) => setImg(data?.welcome_image_url || '')); }, []);
  return (<div className="desk">
    {img && <img src={img} alt="" className="welcome-banner" />}
    <InstallPrompt />
  </div>);
}
