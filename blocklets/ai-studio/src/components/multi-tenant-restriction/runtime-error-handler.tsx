import { useSession } from '@blocklet/ai-runtime/front/contexts/Session';
import { useCallback, useEffect } from 'react';

import { showPlanUpgrade } from './state';

export function RuntimeErrorHandler() {
  const sessionError = useSession((s) => s.error);
  const messageError = useSession((s) => s.messages?.at(0)?.error);
  const handleError = useCallback((error: any) => {
    if (error.type === 'ProjectRequestExceededError') {
      showPlanUpgrade('requestLimit');
    }
  }, []);
  useEffect(() => {
    if (sessionError) {
      handleError(sessionError);
    }
    if (messageError) {
      handleError(messageError);
    }
  }, [sessionError, messageError, handleError]);
  return null;
}
