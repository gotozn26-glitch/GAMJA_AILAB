import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApiKeyModal from './ApiKeyModal';
import {
  hasAnyApiKey,
  INVALID_API_KEY_BANNER,
  installApiKeyFetchInterceptor,
  subscribeApiKeys,
  subscribeInvalidApiKey,
} from '../../lib/apiKeys';
import { DESIGN_BASE_WIDTH, useViewportScale } from '../../hooks/useViewportScale';

type Props = {
  children: ReactNode;
};

/**
 * 서비스 화면 공통 셸:
 * - sessionStorage API 키를 /api 요청에 자동 주입
 * - 키가 없으면 메인과 동일한 API Key 팝업 표시
 * - 키가 무효(401)면 팝업을 다시 띄우고 상단 안내 표시
 * - 좁은 뷰포트에서 서비스 본문을 비율 축소
 */
export default function ServiceShell({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { scale, width } = useViewportScale(DESIGN_BASE_WIDTH);
  const [apiModalOpen, setApiModalOpen] = useState(() => !hasAnyApiKey());
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  useEffect(() => {
    return installApiKeyFetchInterceptor();
  }, []);

  useEffect(() => {
    // 서비스 진입/이동 시 키가 없으면 팝업
    if (!hasAnyApiKey()) {
      setApiKeyError(null);
      setApiModalOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    return subscribeApiKeys((keys) => {
      if (keys.google || keys.openai) {
        // 무효 키로 팝업이 떠 있는 동안에는 기존 키 때문에 닫지 않음
        if (!apiKeyError) {
          setApiModalOpen(false);
        }
      }
    });
  }, [apiKeyError]);

  useEffect(() => {
    return subscribeInvalidApiKey(() => {
      setApiKeyError(INVALID_API_KEY_BANNER);
      setApiModalOpen(true);
    });
  }, []);

  const handleApiModalClose = () => {
    setApiModalOpen(false);
    setApiKeyError(null);
    // 키 없이 닫으면 서비스에 머물 수 없으므로 메인으로 이동
    if (!hasAnyApiKey()) {
      navigate('/');
    }
  };

  const needsStrongScale =
    location.pathname.startsWith('/service/creator-object') ||
    location.pathname.startsWith('/service/storyboard-director') ||
    location.pathname.startsWith('/service/bongjoonho') ||
    location.pathname.startsWith('/service/logo-maker') ||
    location.pathname.startsWith('/service/multiview');

  const contentScale =
    width >= DESIGN_BASE_WIDTH
      ? 1
      : needsStrongScale
        ? Math.max(0.45, scale)
        : Math.max(0.7, Math.min(1, scale + 0.15));

  const useZoom = contentScale < 0.999;

  const stageStyle: CSSProperties | undefined = useZoom
    ? {
        width: `${100 / contentScale}%`,
        minHeight: `${100 / contentScale}dvh`,
        transform: `scale(${contentScale})`,
        transformOrigin: 'top left',
      }
    : undefined;

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden">
      <div className="gamja-service-stage min-h-dvh w-full" style={stageStyle}>
        {children}
      </div>

      <ApiKeyModal
        open={apiModalOpen}
        errorBanner={apiKeyError}
        onClose={handleApiModalClose}
        onRegistered={(keys) => {
          if (keys.google || keys.openai) {
            setApiKeyError(null);
            setApiModalOpen(false);
          }
        }}
      />
    </div>
  );
}
