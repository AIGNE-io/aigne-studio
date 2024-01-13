import axios from 'axios';

const AI_KIT_DID = 'z8ia3xzq2tMq8CRHfaXj1BTYJyYnEcHbqP8cJ';

export const AIKitBaseUrl =
  globalThis.blocklet?.componentMountPoints.find((i) => i.did === AI_KIT_DID)?.mountPoint || '/';

export const API_TIMEOUT = 120 * 1000;

export default axios.create({
  baseURL: AIKitBaseUrl,
  timeout: API_TIMEOUT,
});
