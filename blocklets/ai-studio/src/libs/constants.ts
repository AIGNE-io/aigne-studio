const WELL_KNOWN_SERVICE_PATH = '/.well-known/service';

export const AI_STUDIO_COMPONENT_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';
export const PUBLISH_RESOURCE_PATH = `${WELL_KNOWN_SERVICE_PATH}/embed/resources/${AI_STUDIO_COMPONENT_DID}/publish?mode=dialog`;
export const RESOURCE_TYPE = 'ai';

export const AI_RUNTIME_COMPONENTS_COMPONENT_DID = 'z2qa6fvjmjew4pWJyTsKaWFuNoMUMyXDh5A1D';

export const AI_RUNTIME_COMPONENT_DID = 'z2qa38259h5QDs1wdzyQbRDRVHATAGUim3iss';

export const AI_RUNTIME_MOUNT_POINT =
  blocklet?.componentMountPoints.find((i) => i.did === AI_RUNTIME_COMPONENT_DID)?.mountPoint || '/';

export const PAGES_KIT_COMPONENT_DID = 'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o';

export const PAGES_KIT_MOUNT_POINT =
  blocklet?.componentMountPoints.find((i) => i.did === PAGES_KIT_COMPONENT_DID)?.mountPoint || '/';

export const TOOL_TIP_LEAVE_TOUCH_DELAY = 3000;
