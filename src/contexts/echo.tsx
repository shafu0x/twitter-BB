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

export interface AuthenticateUserResponse {
    user: EchoUser;
    accessToken: string;
    accessTokenExpiresAt: number;
    refreshToken: string;
    refreshTokenExpiresAt: number;
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

    // Check initial authentication state on mount
    React.useEffect(() => {
        const checkAuthState = async () => {
            try {
                const authData = await chrome.storage.local.get([
                    'echo_user',
                    'echo_access_token',
                    'echo_refresh_token',
                    'echo_access_token_expires_at',
                    'echo_refresh_token_expires_at'
                ]);
                
                // Check if we have all required auth data
                if (!authData.echo_user || !authData.echo_access_token || !authData.echo_access_token_expires_at) {
                    // Clear any partial auth data
                    await chrome.storage.local.remove([
                        'echo_user',
                        'echo_access_token',
                        'echo_refresh_token',
                        'echo_access_token_expires_at',
                        'echo_refresh_token_expires_at'
                    ]);
                    setIsAuthenticated(false);
                    setUser(null);
                    setToken(null);
                    setBalance(null);
                    return;
                }

                // Check if access token is expired
                const now = Date.now();
                const accessTokenExpiresAt = authData.echo_access_token_expires_at;
                
                if (now >= accessTokenExpiresAt) {
                    // Access token is expired, check if refresh token is still valid
                    if (authData.echo_refresh_token && authData.echo_refresh_token_expires_at) {
                        const refreshTokenExpiresAt = authData.echo_refresh_token_expires_at;
                        
                        if (now < refreshTokenExpiresAt) {
                            // Refresh token is still valid, we can try to refresh the access token
                            // For now, we'll clear the expired access token and require re-authentication
                            await chrome.storage.local.remove(['echo_access_token', 'echo_access_token_expires_at']);
                            setIsAuthenticated(false);
                            setUser(null);
                            setToken(null);
                            setBalance(null);
                            return;
                        }
                    }
                    
                    // Both tokens are expired, clear all auth data
                    await chrome.storage.local.remove([
                        'echo_user',
                        'echo_access_token',
                        'echo_refresh_token',
                        'echo_access_token_expires_at',
                        'echo_refresh_token_expires_at'
                    ]);
                    setIsAuthenticated(false);
                    setUser(null);
                    setToken(null);
                    setBalance(null);
                    return;
                }

                // All checks passed, user is authenticated with valid tokens
                setUser(authData.echo_user);
                setIsAuthenticated(true);
                setToken(authData.echo_access_token);
                setError(null);
                
            } catch (error) {
                console.error('Error checking auth state:', error);
                // On error, clear auth state to be safe
                await chrome.storage.local.remove([
                    'echo_user',
                    'echo_access_token',
                    'echo_refresh_token',
                    'echo_access_token_expires_at',
                    'echo_refresh_token_expires_at'
                ]);
                setIsAuthenticated(false);
                setUser(null);
                setToken(null);
                setBalance(null);
            } finally {
                setIsLoading(false);
            }
        };
        
        checkAuthState();
    }, []);


    const signIn = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Authentication is handled by the background script
            const response = await new Promise<{ success: boolean; echoUser?: EchoUser; error?: string }>((resolve, reject) => {
                chrome.runtime.sendMessage({action: 'AUTHENTICATE'}, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(response);
                });
            });

            if (response.success && response.echoUser) {
                // Set authentication state
                setUser(response.echoUser);
                setIsAuthenticated(true);
                setError(null);
                
                // Get token from storage
                const tokenData = await chrome.storage.local.get(['echo_access_token']);
                if (tokenData.echo_access_token) {
                    setToken(tokenData.echo_access_token);
                }
            } else {
                throw new Error(response.error || 'Authentication failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            setIsAuthenticated(false);
            setToken(null);
            setUser(null);
            setBalance(null);
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setIsLoading(true);
            
            // Clear authentication from background script
            await new Promise<void>((resolve, reject) => {
                chrome.runtime.sendMessage({action: 'SIGN_OUT'}, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve();
                });
            });
            
            // Clear local state
            setUser(null);
            setIsAuthenticated(false);
            setToken(null);
            setBalance(null);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign out failed');
        } finally {
            setIsLoading(false);
        }
    };

    const refreshBalance = async () => {
    };

    const createPaymentLink = async (_amount: number, _description: string, _successUrl?: string): Promise<string> => {
        return '';
    };

    const getToken = async (): Promise<string | null> => {
        try {
            const tokenData = await chrome.storage.local.get(['echo_access_token']);
            return tokenData.echo_access_token || null;
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
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