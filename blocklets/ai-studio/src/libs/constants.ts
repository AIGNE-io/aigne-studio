import { AIGNE_RUNTIME_COMPONENT_DID } from '@blocklet/ai-runtime/constants';

export const AIGNE_RUNTIME_MOUNT_POINT =
  blocklet?.componentMountPoints.find((i) => i.did === AIGNE_RUNTIME_COMPONENT_DID)?.mountPoint || '/';

export const PAGES_KIT_COMPONENT_DID = 'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o';

export const PAGES_KIT_MOUNT_POINT =
  blocklet?.componentMountPoints.find((i) => i.did === PAGES_KIT_COMPONENT_DID)?.mountPoint || '/';

export const TOOL_TIP_LEAVE_TOUCH_DELAY = 3000;
