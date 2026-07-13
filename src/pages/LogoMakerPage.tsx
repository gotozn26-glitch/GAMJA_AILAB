import ServiceShell from '../components/renewal/ServiceShell';
import LogoMakerApp from '../../Service/LogoMaker/App';

export default function LogoMakerPage() {
  return (
    <ServiceShell>
      <div className="gamja-logomaker min-h-screen h-dvh w-full overflow-hidden bg-white">
        <LogoMakerApp />
      </div>
    </ServiceShell>
  );
}
