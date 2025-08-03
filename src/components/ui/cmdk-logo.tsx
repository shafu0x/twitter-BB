import React from 'react';

import { cn } from '@/lib/utils';

interface CmdkLogoProps {
    className?: string;
}

export const CmdkLogo: React.FC<CmdkLogoProps> = ({ className }) => {
    return (
        <img src="/logo.svg" alt="Cmdk" 
        className={cn(className)} 
        width={100}
        height={100}
        />
    );
};