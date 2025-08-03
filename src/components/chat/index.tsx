import { useEcho } from '@/hooks/useEcho';

import { Chat } from '@/pages/chat';
import { WelcomePage } from '@/pages/welcome';

export const MainChat: React.FC = () => {
  const { 
    isAuthenticated, 
  } = useEcho();

  return (
    <div className="flex h-full w-full items-center justify-center">
      {isAuthenticated ? <Chat /> : <WelcomePage />}
    </div>
  );
};

