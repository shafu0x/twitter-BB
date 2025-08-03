
import React from 'react';
import { useEcho } from '@/contexts/echo';

export const Chat: React.FC = () => {

    const { 
        isAuthenticated, 
      } = useEcho();

    return (
        <div className="relative flex h-full min-w-0 flex-col">
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
}