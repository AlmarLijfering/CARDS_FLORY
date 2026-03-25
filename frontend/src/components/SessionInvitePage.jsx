import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from './EmptyState';
import { resolveSessionInvite } from '../lib/sessionLinksApi';


export function SessionInvitePage() {
  const navigate = useNavigate();
  const { accessToken = '' } = useParams();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isCancelled = false;

    async function resolveInvite() {
      try {
        const result = await resolveSessionInvite(accessToken);
        if (!isCancelled) {
          navigate(`/session/${result.session_key}`, { replace: true });
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'This session link is unavailable.');
        }
      }
    }

    if (!accessToken) {
      setErrorMessage('This session link is unavailable.');
      return () => {
        isCancelled = true;
      };
    }

    resolveInvite();

    return () => {
      isCancelled = true;
    };
  }, [accessToken, navigate]);

  if (errorMessage) {
    return (
      <EmptyState
        title="Session link unavailable"
        description={errorMessage}
        actionLabel="Back to home"
        onAction={() => navigate('/')}
        tone="warning"
      />
    );
  }

  return (
    <section className="surface px-6 py-8 text-sm font-semibold text-slate-600">
      Opening session link...
    </section>
  );
}
