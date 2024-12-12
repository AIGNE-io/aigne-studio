import { AIGNE_RUNTIME_COMPONENT_DID, AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { PAYMENT_KIT_DID } from '@blocklet/ai-runtime/front/constants';

export const AIGNE_RUNTIME_MOUNT_POINT =
  blocklet?.componentMountPoints.find((i) => i.did === AIGNE_RUNTIME_COMPONENT_DID)?.mountPoint || '/';

export const AIGNE_STUDIO_MOUNT_POINT =
  blocklet?.componentMountPoints.find((i) => i.did === AIGNE_STUDIO_COMPONENT_DID)?.mountPoint || '/';

export const PAGES_KIT_COMPONENT_DID = 'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o';

export const PAGES_KIT_MOUNT_POINT =
  blocklet?.componentMountPoints.find((i) => i.did === PAGES_KIT_COMPONENT_DID)?.mountPoint || '/';

export const PAYMENT_KIT_MOUNT_POINT =
  blocklet?.componentMountPoints.find((i) => i.did === PAYMENT_KIT_DID)?.mountPoint || '/';

export const TOOL_TIP_LEAVE_TOUCH_DELAY = 3000;

export const REMOTE_REACT_COMPONENT = 'blocklet-react-component';
