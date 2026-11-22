'use client';
import { useParams } from 'next/navigation';
import { useBooks } from '../../../../lib/acc';
import { useT } from '../../../../lib/i18n';
import Shell from '../../shell';
import Form from '../../voucher-form';
export default function Page() {
  const { type } = useParams(); const b = useBooks(); const { t } = useT();
  if (!b.ready) return <Shell title={t(type)}><p>{t('loading')}</p></Shell>;
  return <Form b={b} type={type} />;
}
