import React, { useState } from 'react'

interface EchoBalance {
    credits: number;
    currency: string;
}

export declare interface EchoUser {
    id: string;
    email: string;
    name?: string;
    picture?: string;
}


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


interface EchoProviderProps {
    children: React.ReactNode,
}



export const EchoProvider: React.FC<EchoProviderProps> = ({ children }) => {
    const [user, setUser] = useState<EchoUser | null>(null);
    const [balance, setBalance] = useState<EchoBalance | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);


    const signIn = async () => {
    };

    const signOut = async () => {
    };

    const refreshBalance = async () => {
    };

    const createPaymentLink = async (_amount: number, _description: string, _successUrl?: string): Promise<string> => {
        return '';
    };

    const getToken = async (): Promise<string | null> => {
        return null;
    };

    const clearAuth = async (): Promise<void> => {
    };

    const contextValue: EchoContextValue = {
        user,
        balance,
        isAuthenticated,
        isLoading,
        error,
        token,
        signIn,
        signOut,
        refreshBalance,
        createPaymentLink,
        getToken,
        clearAuth,
    };
    return (
        <EchoContext.Provider value={contextValue}>
            {children}
        </EchoContext.Provider>
    );
}