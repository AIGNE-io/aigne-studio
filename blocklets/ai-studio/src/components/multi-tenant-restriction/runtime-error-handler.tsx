import { useSession } from '@blocklet/aigne-sdk/components/ai-runtime';
import { useCallback, useEffect, useRef } from 'react';

import { showPlanUpgrade } from './state';

export function RuntimeErrorHandler() {
  const sessionError = useSession((s) => s.error);
  const lastMessage = useSession((s) => s.messages?.at(0));
  const nowRef = useRef(Date.now());

  const handleError = useCallback((error: any) => {
    if (error.type === 'RequestExceededError') {
      showPlanUpgrade('requestLimit');
    }
  }, []);
  useEffect(() => {
    if (sessionError) {
      handleError(sessionError);
    }
    // 仅对新消息进行错误处理, 忽略过往消息的错误
    if (lastMessage && lastMessage.error && new Date(lastMessage.createdAt).getTime() > nowRef.current) {
      handleError(lastMessage.error);
    }
  }, [sessionError, lastMessage, handleError]);
  return null;
}
