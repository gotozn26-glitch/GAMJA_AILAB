import ServiceShell from '../components/renewal/ServiceShell';
import UpscalerApp from '../../Service/Upscaler/App';
import '../../Service/Upscaler/index.css';

export default function UpscalerPage() {
  return (
    <ServiceShell>
      <div className="gamja-upscaler min-h-screen">
        <UpscalerApp />
      </div>
    </ServiceShell>
  );
}
