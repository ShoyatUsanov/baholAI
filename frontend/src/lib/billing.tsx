import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { api } from './api';
import { useAuth } from './auth';
import type { MySubscription, PlanFeatures } from './types';

interface BillingCtx {
  planCode: string;
  features: MySubscription['features'] | null;
  data: MySubscription | null;
  loading: boolean;
  hasFeature: (f: keyof PlanFeatures) => boolean;
  reload: () => void;
}

const Ctx = createContext<BillingCtx>({
  planCode: 'free', features: null, data: null, loading: true,
  hasFeature: () => false, reload: () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      setData(await api.get<MySubscription>('/billing/me/subscription'));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const hasFeature = (f: keyof PlanFeatures): boolean => Boolean(data?.features?.[f]);

  return (
    <Ctx.Provider value={{ planCode: data?.plan_code ?? 'free', features: data?.features ?? null, data, loading, hasFeature, reload }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSubscription = () => useContext(Ctx);
