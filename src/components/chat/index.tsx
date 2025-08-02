import { useEcho } from '@/contexts/echo';
import { Button } from '@/components/ui/button';

export const Chat: React.FC = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    error, 
    signIn, 
    signOut 
  } = useEcho();

  const handleAuthAction = async () => {
    if (isAuthenticated) {
      await signOut();
    } else {
      await signIn();
    }
  };

  return (
    <div className="relative flex h-full min-w-0 flex-col">
      {/* Auth Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-semibold">Chat Application</h1>
          {isAuthenticated && user && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span>•</span>
              <span>{user.name || user.email}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-red-400 text-sm">{error}</span>
          )}
          
          <Button
            onClick={handleAuthAction}
            disabled={isLoading}
            variant={isAuthenticated ? "destructive" : "success"}
            size="sm"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isAuthenticated ? (
              "Sign Out"
            ) : (
              "Sign In"
            )}
          </Button>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="absolute bottom-4 left-1/2 w-full max-w-3xl -translate-x-1/2 px-4">
          <div className="min-h-[100px] min-w-[200px] bg-gray-700 rounded-lg p-4">
            <p className="text-white">
              {isAuthenticated 
                ? "You are signed in and ready to chat!" 
                : "Please sign in to start chatting"
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};