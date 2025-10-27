import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';

/**
 * Hook to get the Auth0 access token for making authenticated API calls
 */
export const useAccessToken = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const getToken = async () => {
      if (isAuthenticated) {
        try {
          const accessToken = await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            },
          });
          setToken(accessToken);
        } catch (error) {
          console.error('Error getting access token:', error);
          setToken(null);
        }
      }
    };

    getToken();
  }, [isAuthenticated, getAccessTokenSilently]);

  return token;
};

