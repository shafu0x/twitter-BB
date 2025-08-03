import React from 'react';
import type { EchoUser, EchoBalance } from '@/types/echo';



interface EchoContextValue {
    user: EchoUser | null;
    balance: EchoBalance | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    token: string | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshBalance: () => Promise<void>;
    createPaymentLink: (amount: number, description: string, successUrl?: string) => Promise<string>;
    getToken: () => Promise<string | null>;
    clearAuth: () => Promise<void>;
}

const EchoContext = React.createContext<EchoContextValue | null>(null);

export const useEcho = () => {
    const context = React.useContext(EchoContext);
    if (!context) {
        throw new Error('useEcho must be used within an EchoProvider');
    }
    return context;
};

export { EchoContext };
export type { EchoContextValue, EchoBalance }; 