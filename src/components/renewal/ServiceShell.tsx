import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApiKeyModal from './ApiKeyModal';
import ServiceMenuToggle from './ServiceMenuToggle';
import { hasGoogleApiKey, installApiKeyFetchInterceptor } from '../../lib/apiKeys';
import { serviceIdFromPath, type ServiceDef } from '../../lib/services';

type Props = {
  children: ReactNode;
};

/**
 * 서비스 화면 공통 셸:
 * - 햄버거 / 세로 토글 메뉴
 * - sessionStorage API 키를 /api 요청에 자동 주입
 * - Google 키 없으면 입력 모달 강제
 */
export default function ServiceShell({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = serviceIdFromPath(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [pendingService, setPendingService] = useState<ServiceDef | null>(null);

  useEffect(() => {
    return installApiKeyFetchInterceptor();
  }, []);

  useEffect(() => {
    if (!hasGoogleApiKey()) {
      setApiModalOpen(true);
    }
  }, [location.pathname]);

  const handleSelectService = (service: ServiceDef) => {
    if (!hasGoogleApiKey()) {
      setPendingService(service);
      setApiModalOpen(true);
      return;
    }

    setMenuOpen(false);
    if (service.id !== activeId) {
      navigate(service.route);
    }
  };

  return (
    <div className="relative min-h-screen">
      <ServiceMenuToggle
        open={menuOpen}
        activeId={activeId}
        onToggle={() => setMenuOpen((prev) => !prev)}
        onSelectService={handleSelectService}
      />

      {children}

      <ApiKeyModal
        open={apiModalOpen}
        onClose={() => {
          setApiModalOpen(false);
          setPendingService(null);
          if (!hasGoogleApiKey()) {
            navigate('/main', { replace: true });
          }
        }}
        onRegistered={() => {
          if (!hasGoogleApiKey()) return;
          setApiModalOpen(false);
          if (pendingService) {
            const next = pendingService;
            setPendingService(null);
            setMenuOpen(false);
            if (next.route !== location.pathname) {
              navigate(next.route);
            }
          }
        }}
      />
    </div>
  );
}
