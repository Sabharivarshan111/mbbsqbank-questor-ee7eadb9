import React, { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@/components/Dialog';
import {
  confirmDailyAd,
  subscribeDailyAd,
  type DailyAdPrompt,
} from '@/lib/dailyAd';

/**
 * Port of src/components/DailyAdConsent.tsx — the app asks before playing the
 * once-a-day rewarded ad rather than interrupting without warning.
 *
 * This is one of the few genuine dialogs in the app: it is an either/or the
 * user has to answer, and "Not now" is a real option, not a formality.
 */
export function DailyAdConsent() {
  const [prompt, setPrompt] = useState<DailyAdPrompt | null>(null);
  // Kept so the text does not vanish while the dialog animates out.
  const [shown, setShown] = useState<DailyAdPrompt | null>(null);

  useEffect(() => subscribeDailyAd(setPrompt), []);

  useEffect(() => {
    if (prompt) {
      setShown(prompt);
    }
  }, [prompt]);

  const decline = useCallback(() => setPrompt(null), []);

  const accept = useCallback(() => {
    const current = prompt;
    setPrompt(null);
    if (current) {
      confirmDailyAd(current.reason).catch(() => undefined);
    }
  }, [prompt]);

  return (
    <Dialog
      visible={prompt !== null}
      onDismiss={decline}
      title={shown?.title}
      message={shown?.message}
      actions={[
        { label: 'Not now', onPress: decline, tone: 'secondary' },
        { label: 'OK', onPress: accept, tone: 'primary' },
      ]}
    />
  );
}
