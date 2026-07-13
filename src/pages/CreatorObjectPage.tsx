import ServiceShell from '../components/renewal/ServiceShell';
import CreatorObjectApp from '../../Service/CreatorObject/App';

export default function CreatorObjectPage() {
  return (
    <ServiceShell>
      <div className="gamja-creator min-h-screen overflow-hidden">
        <CreatorObjectApp />
      </div>
    </ServiceShell>
  );
}
