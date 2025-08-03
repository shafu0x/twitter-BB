import React from 'react';
import { CmdkLogo } from '@/components/ui/cmdk-logo';
import { EchoSignin } from '@/components/ui/echo-sign-in';

export const WelcomePage: React.FC = () => {
    return (
        <div className="flex flex-col h-full w-full items-center justify-center gap-4">
            <CmdkLogo />
            <EchoSignin className="w-32 h-12 mb-4" />
        </div>
    );
};
