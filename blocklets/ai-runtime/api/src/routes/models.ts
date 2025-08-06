import { Router } from 'express';
import { joinURL, withQuery } from 'ufo';

const AIGNE_HUB_DID = 'z8ia3xzq2tMq8CRHfaXj1BTYJyYnEcHbqP8cJ';
const router = Router();

router.get('/', async (req, res) => {
  const { type } = req.query;
  const apiURL = process.env.BLOCKLET_AIGNE_API_URL || '';
  const BLOCKLET_JSON_PATH = '__blocklet__.js?type=json';
  const blockletURL = joinURL(apiURL, BLOCKLET_JSON_PATH);

  const blockletInfo = await fetch(blockletURL);
  const blocklet = await blockletInfo.json();
  const aigneHubMount = (blocklet?.componentMountPoints || []).find((m: { did: string }) => m.did === AIGNE_HUB_DID);
  const url = withQuery(joinURL(apiURL, aigneHubMount?.mountPoint || '', '/api/ai-providers/models'), { type });

  const response = await fetch(url);
  const data = await response.json();
  res.json(data);
});

export default router;
