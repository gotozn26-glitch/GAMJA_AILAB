import ServiceShell from '../components/renewal/ServiceShell';
import StoryboardApp from '../../Service/StoryboardDirector/App';

export default function StoryboardDirectorPage() {
  return (
    <ServiceShell>
      <div className="gamja-storyboard h-full min-h-screen bg-black text-white antialiased overflow-hidden font-sans">
        <StoryboardApp />
      </div>
    </ServiceShell>
  );
}
