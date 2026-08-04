import { useEffect } from 'react';
import { isPremiumCached } from '@/hooks/use-premium';

interface AdBannerProps {
  adSlot: string;
  adFormat?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
}

export const AdBanner = ({ adSlot, adFormat = 'auto', className = '' }: AdBannerProps) => {
  const premium = isPremiumCached();

  useEffect(() => {
    if (premium) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, [premium]);

  if (premium) return null;

  return (

    <div className={`ad-container my-4 flex justify-center ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4166180324883917"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
};
