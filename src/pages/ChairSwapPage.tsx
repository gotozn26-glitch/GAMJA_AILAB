import ServiceShell from '../components/renewal/ServiceShell';
import ChairSwapApp from '../../Service/ChairSwap/App';

export default function ChairSwapPage() {
  return (
    <ServiceShell>
      <div className="gamja-chair min-h-screen overflow-x-hidden bg-white" style={{ colorScheme: 'light' }}>
        <ChairSwapApp />
      </div>
    </ServiceShell>
  );
}
