import { createRoot } from 'react-dom/client';
import { WrappedApp } from './appWrapper';

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
createRoot(document.getElementById('root') as HTMLElement).render(<WrappedApp />);
