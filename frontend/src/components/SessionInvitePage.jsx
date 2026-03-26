import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from './EmptyState';
import { useAppState } from '../lib/app-state';
import { resolveSessionInvite } from '../lib/sessionLinksApi';
import { getSessionUiText } from '../lib/sessionUiText';


export function SessionInvitePage() {
  const navigate = useNavigate();
  const { accessToken = '' } = useParams();
  const { language } = useAppState();
  const text = getSessionUiText(language);
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
          setErrorMessage(error instanceof Error ? error.message : text.invite.unavailableDescription);
        }
      }
    }

    if (!accessToken) {
      setErrorMessage(text.invite.unavailableDescription);
      return () => {
        isCancelled = true;
      };
    }

    resolveInvite();

    return () => {
      isCancelled = true;
    };
  }, [accessToken, navigate, text.invite.unavailableDescription]);

  if (errorMessage) {
    return (
      <EmptyState
        title={text.invite.unavailableTitle}
        description={errorMessage}
        actionLabel={text.common.backToHome}
        onAction={() => navigate('/')}
        tone="warning"
      />
    );
  }

  return (
    <section className="surface px-6 py-8 text-sm font-semibold text-slate-600">
      {text.invite.opening}
    </section>
  );
}
