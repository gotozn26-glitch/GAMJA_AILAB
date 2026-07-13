import ServiceShell from '../components/renewal/ServiceShell';
import BongJoonHoApp from '../../Service/BongJoonHo/App';

export default function BongJoonHoPage() {
  return (
    <ServiceShell>
      <div className="gamja-bong min-h-screen overflow-hidden">
        <BongJoonHoApp />
      </div>
    </ServiceShell>
  );
}
