import ServiceShell from '../components/renewal/ServiceShell';
import MultiViewApp from '../../Service/MultiView/App';

export default function MultiViewPage() {
  return (
    <ServiceShell>
      <div className="gamja-multiview min-h-screen overflow-hidden">
        <MultiViewApp />
      </div>
    </ServiceShell>
  );
}
