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
        try {
            setIsLoading(true);
            setError(null);

            // Authentication is handled by the backkground script
            await new Promise<void>((resolve, reject) => {
                chrome.runtime.sendMessage({action: 'AUTHENTICATE'}, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    if (response?.success) {
                        resolve();
                    } else {
                        reject(new Error(response?.error || 'Authentication failed'));
                    }
                });
            });

            const pollAuth = async (attempts = 0): Promise<void> => {
                // 1 minute authentication timeout
                if (attempts > 60) {
                    throw new Error('Authentication timed out');
                }

                const response = await new Promise<{ isAuthenticated: boolean }>((resolve) => {
                    chrome.runtime.sendMessage({ action: 'IS_AUTHENTICATED'}, (response) => {
                        resolve(response || { isAuthenticated: false });
                    });
                });

                if (response.isAuthenticated) {
                    const data = await chrome.storage.local.get(['echo_access_token']);
                    if (data.echo_access_token) {
                        setToken(data.echo_access_token);
                        setIsAuthenticated(true);
                        return;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
                return pollAuth(attempts + 1);
            };

            await pollAuth();


            // Authentication is 
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            setIsLoading(false);
            setIsAuthenticated(false);
            setToken(null);
            setUser(null);
            setBalance(null);
        } finally {
            setIsLoading(false);
        }
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