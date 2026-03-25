import { useEffect, useState } from 'react';

import { useAppState } from '../lib/app-state';
import { getActiveSessionStatus } from '../lib/sessionLinksApi';


export function useSessionAccessGuard() {
  const { activeSessionKey } = useAppState();
  const [isChecking, setIsChecking] = useState(activeSessionKey !== 'default');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isCancelled = false;

    async function validateSession() {
      if (activeSessionKey === 'default') {
        setIsChecking(false);
        setErrorMessage('');
        return;
      }

      setIsChecking(true);
      setErrorMessage('');

      try {
        await getActiveSessionStatus(activeSessionKey);
        if (!isCancelled) {
          setErrorMessage('');
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'This session is not active.');
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
    errorMessage
  };
}
