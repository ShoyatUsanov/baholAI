import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import HelpBanner from '@/components/HelpBanner';
import { PageHeader } from '@/components/Layout';
import { Card, Empty, Spinner, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import type { AiAgreement } from '@/lib/types';

function barColor(pct: number): string {
  if (pct >= 75) return '#16a34a';
  if (pct >= 50) return '#d97706';
  return '#dc2626';
}

export default function AiConfidence() {
  const [data, setData] = useState<AiAgreement | null>(null);

  useEffect(() => {
    api.get<AiAgreement>('/analytics/ai-agreement').then(setData);
  }, []);

  if (!data) return <Spinner />;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="AI Ishonch"
        description="Tizim baholarini o'qituvchi qanchalik tasdiqlaydi va qancha vaqt tejaladi"
      />
      <HelpBanner id="ai-confidence">
        💡 Bu yerda AI baholari bilan o'qituvchi qarori qanchalik <b>mos kelishini</b> ko'rasiz.
        Yuqori «ishonch» darajalarida kelishuv ham yuqori bo'lsa — AI to'g'ri ishlayotgan bo'ladi.
      </HelpBanner>

      {data.total_graded === 0 ? (
        <Card className="p-8">
          <Empty>
            Hali AI baholagan ochiq javoblar yo'q.
            <div className="mt-1 text-xs text-slate-400">
              O'quvchilar ochiq savolli vazifalarni topshirgach, bu yerda kelishuv tahlili paydo bo'ladi.
            </div>
          </Empty>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Stat label="Kelishuv darajasi" value={`${data.agreement_rate}%`} hint="o'zgartirilmasdan tasdiqlangan" />
            <Stat label="Tejalgan vaqt" value={`${data.time_saved_hours} soat`} hint="qo'lda baholashga nisbatan" />
            <Stat label="Baholangan jami" value={data.total_graded} hint={`${data.changed_count} ta tuzatilgan`} />
          </div>

          <Card className="p-5 mb-5">
            <div className="font-semibold mb-1">Ishonch kalibratsiyasi</div>
            <div className="text-xs text-slate-500 mb-4">
              Har confidence oralig'ida o'zgartirilmasdan tasdiqlangan baholar ulushi.
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={data.confidence_calibration} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Kelishuv']}
                    labelFormatter={(l) => `Confidence: ${l}`}
                    cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                  />
                  <Bar dataKey="agreement_rate" radius={[6, 6, 0, 0]} maxBarSize={72}>
                    <LabelList dataKey="agreement_rate" position="top" formatter={(v) => `${v}%`} fontSize={12} />
                    {data.confidence_calibration.map((b) => (
                      <Cell key={b.bucket} fill={barColor(b.agreement_rate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2 text-center text-xs text-slate-400">
              {data.confidence_calibration.map((b) => (
                <div key={b.bucket}>{b.count} ta baho</div>
              ))}
            </div>
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3">
              💡 Yuqori confidence baholarda kelishuv yuqori = AI o'zini to'g'ri baholaydi.
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="text-2xl">✍️</div>
            <div>
              <div className="text-sm text-slate-500">O'rtacha tuzatish</div>
              <div className="text-lg font-semibold">
                O'qituvchi o'rtacha {data.avg_delta} ball tuzatadi
              </div>
              <div className="text-xs text-slate-400">faqat o'zgartirilgan {data.changed_count} ta bahoda</div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
