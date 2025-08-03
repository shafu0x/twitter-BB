import { useEcho } from '@/hooks/useEcho';
import { cn } from '@/lib/utils';
import { CmdkLogo } from './cmdk-logo';
import { EchoSignin } from '@/components/ui/echo-sign-in';

export function Navbar() {
    const { 
        user,
        isAuthenticated,
      } = useEcho();

    return (
        <>
          {isAuthenticated && (
            <header
              className={cn(
                "px-2 md:px-4 pt-2 border-b flex flex-col gap-1",
                "pb-2"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CmdkLogo />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm">{user?.name || user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <EchoSignin />
                </div>
              </div>
            </header>
          )}
        </>
      );
}