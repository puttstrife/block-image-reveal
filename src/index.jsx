import { createRoot } from 'react-dom/client';
import './index.css';
import ZodiacRevealLoader from './views/ZodiacRevealLoader';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<ZodiacRevealLoader />);
