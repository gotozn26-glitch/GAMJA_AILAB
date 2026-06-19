import { useEffect, type CSSProperties } from 'react';
import { loadAdSenseScript, pushAdSenseSlot } from '../lib/adsense';

type AdSenseUnitProps = {
  clientId: string;
  slotId: string;
  className?: string;
  style?: React.CSSProperties;
  format?: 'auto' | 'horizontal' | 'rectangle';
  fullWidthResponsive?: boolean;
};

export default function AdSenseUnit({
  clientId,
  slotId,
  className = '',
  style,
  format = 'auto',
  fullWidthResponsive = true,
}: AdSenseUnitProps) {
  useEffect(() => {
    if (!clientId || !slotId) return;
    loadAdSenseScript(clientId);
    pushAdSenseSlot();
  }, [clientId, slotId]);

  if (!clientId || !slotId) {
    return null;
  }

  return (
    <ins
      className={`adsbygoogle ${className}`.trim()}
      style={style}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
    />
  );
}
