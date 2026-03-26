import { useEffect, useState } from 'react';

import { useAppState } from '../lib/app-state';
import { getActiveSessionStatus } from '../lib/sessionLinksApi';


export function useSessionAccessGuard() {
  const { activeSessionKey } = useAppState();
  const [isChecking, setIsChecking] = useState(activeSessionKey !== 'default');
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionDetails, setSessionDetails] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function validateSession() {
      if (activeSessionKey === 'default') {
        setIsChecking(false);
        setErrorMessage('A valid session link is required. New session links can only be created by an admin.');
        setSessionDetails(null);
        return;
      }

      setIsChecking(true);
      setErrorMessage('');

      try {
        const result = await getActiveSessionStatus(activeSessionKey);
        if (!isCancelled) {
          setErrorMessage('');
          setSessionDetails(result);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'This session is not active.');
          setSessionDetails(null);
        }
      } finally {
        if (!isCancelled) {
          setIsChecking(false);
        }
      }
    }

    validateSession();

    return () => {
      isCancelled = true;
    };
  }, [activeSessionKey]);

  return {
    isChecking,
    errorMessage,
    sessionDetails
  };
}
