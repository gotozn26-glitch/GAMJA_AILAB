declare global {
  interface Window {
    __APP_CONFIG__?: {
      ADSENSE_CLIENT_ID?: string;
      ADSENSE_HOME_SLOT_ID?: string;
    };
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_SCRIPT_ATTR = 'data-gamja-adsense';

export function getAdSenseConfig() {
  const clientId = window.__APP_CONFIG__?.ADSENSE_CLIENT_ID?.trim() || '';
  const homeSlotId = window.__APP_CONFIG__?.ADSENSE_HOME_SLOT_ID?.trim() || '';
  return { clientId, homeSlotId };
}

export function loadAdSenseScript(clientId: string) {
  if (!clientId || document.querySelector(`script[${ADSENSE_SCRIPT_ATTR}]`)) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.setAttribute(ADSENSE_SCRIPT_ATTR, 'true');
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  document.head.appendChild(script);
}

export function pushAdSenseSlot() {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (error) {
    console.error('AdSense render error:', error);
  }
}

export {};
