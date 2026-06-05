import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

import { Card } from '@/components/ui';
import { getToken } from '@/lib/api';
import type { RubricCriterion } from '@/lib/types';

type Originality = { similarity: number; ai_likelihood: number };
type Confidence = { confidence: number; needs_review: boolean };
type Done = { total: number; max_total: number; score: number; max_score: number; percent: number; status: string };

function FadeIn({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 20);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={`transition-all duration-500 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
      {children}
    </div>
  );
}

function CriterionRow({ c }: { c: RubricCriterion }) {
  const pct = c.max_points ? Math.round((c.points_given / c.max_points) * 100) : 0;
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 60);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <CheckCircle2 size={18} className="text-green-500 shrink-0" />
      <span className="flex-1 text-sm">{c.criterion}</span>
      <div className="w-28 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-[width] duration-700 ease-out" style={{ width: `${w}%` }} />
      </div>
      <span className="text-sm font-semibold w-12 text-right">{c.points_given}/{c.max_points}</span>
    </div>
  );
}

export default function GradingLive() {
  const { submissionId } = useParams();
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [orig, setOrig] = useState<Originality | null>(null);
  const [conf, setConf] = useState<Confidence | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    const es = new EventSource(`/api/submissions/${submissionId}/grade-stream?token=${getToken() ?? ''}`);
    es.addEventListener('criterion', (e) => setCriteria((prev) => [...prev, JSON.parse((e as MessageEvent).data)]));
    es.addEventListener('originality', (e) => setOrig(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('confidence', (e) => setConf(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('done', (e) => {
      setDone(JSON.parse((e as MessageEvent).data));
      finished.current = true;
      es.close();
    });
    es.onerror = () => {
      es.close();
      if (!finished.current) setError(true);
    };
    return () => es.close();
  }, [submissionId]);

  return (
    <div className="max-w-xl mx-auto py-4">
      <div className="flex items-center gap-2 mb-1">
        {done ? (
          <Sparkles className="text-indigo-600" size={22} />
        ) : (
          <Loader2 className="text-indigo-600 animate-spin" size={22} />
        )}
        <h1 className="text-xl font-bold">{done ? 'Baholash yakunlandi' : 'Tahlil qilinmoqda…'}</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        {done ? 'Quyida AI bahosi keltirilgan.' : 'AI javobingizni rubrika mezonlari bo‘yicha baholamoqda.'}
      </p>

      {error ? (
        <Card className="p-5 text-sm text-slate-500">
          Stream uzildi.{' '}
          <Link to={`/student/result/${submissionId}`} className="text-indigo-600 hover:underline">
            Natijani ko‘rish
          </Link>
          .
        </Card>
      ) : (
        <div className="space-y-3">
          {criteria.length > 0 && (
            <Card className="p-4">
              <div className="text-xs font-semibold text-slate-500 mb-1">Rubrika mezonlari</div>
              {criteria.map((c, i) => (
                <FadeIn key={i}>
                  <CriterionRow c={c} />
                </FadeIn>
              ))}
            </Card>
          )}

          {orig && (
            <FadeIn>
              <Card className="p-4 flex items-center gap-3">
                <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
                <div className="text-sm flex-1">
                  <div className="font-medium">Original‘lik tekshirildi</div>
                  <div className="text-slate-500">
                    O‘xshashlik {orig.similarity}% · AI-yozilgan ehtimoli {orig.ai_likelihood}%
                  </div>
                </div>
              </Card>
            </FadeIn>
          )}

          {conf && (
            <FadeIn>
              <Card className="p-4 flex items-center gap-3">
                <CheckCircle2 className="text-indigo-500 shrink-0" size={20} />
                <div className="text-sm flex-1">
                  <div className="font-medium">Ishonch hisoblandi: {conf.confidence}%</div>
                  <div className="text-slate-500">
                    {conf.needs_review ? 'Past ishonch — o‘qituvchi ko‘rib chiqadi.' : 'Yuqori ishonch.'}
                  </div>
                </div>
              </Card>
            </FadeIn>
          )}

          {done && (
            <FadeIn>
              <Card className="p-5 text-center">
                <div className="text-5xl font-bold text-indigo-600">{done.percent}%</div>
                <div className="text-sm text-slate-500 mt-1">
                  {done.score} / {done.max_score} ball
                </div>
                <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                  ⏳ Natija o‘qituvchi tasdig‘ini kutmoqda. Yakuniy bahoni inson tasdiqlaydi.
                </div>
                <div className="flex gap-2 justify-center mt-4">
                  <Link
                    to={`/student/result/${submissionId}`}
                    className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Natijani ko‘rish
                  </Link>
                  <Link
                    to="/student/assignments"
                    className="text-sm border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Vazifalarga qaytish
                  </Link>
                </div>
              </Card>
            </FadeIn>
          )}
        </div>
      )}
    </div>
  );
}
