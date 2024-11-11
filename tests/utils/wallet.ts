import { ensureWallet } from '@blocklet/testlab/utils/wallet';

export const ownerRootSeed = 'gjyeIs+GgP5GLFlCokQjwPTdukJWbCsHRr0VUJBbeVeQH2AG6OV69Su2WS/Fgb4YnbCar2gSEui3jCB5Vq9Nqg==';
export const adminRootSeed = 'gjyeIs+GgP5GLFlCokQjwPTdukJWbCsHRr0VUJBbeVeQH2AG6OV69Su2WS/Fgb4YnbCar2gSEui3jCB5Vq9Nqg==';
export const guestRootSeed = '9QiaQE4pEzvUYAHMNaRNx/gIx7VXw48mb399bn6BhsNrT6mtf8NCwvbs0UteYgLxWKquyT4pX1mQD+ZQnN3Kgw==';

const getOwnerWallet = () => {
  return ensureWallet({ name: 'owner', rootSeed: ownerRootSeed });
};

const getAdminWallet = () => {
  return ensureWallet({ name: 'admin', rootSeed: adminRootSeed });
};

const getGuestWallet = () => {
  return ensureWallet({ name: 'guest', rootSeed: guestRootSeed });
};

export { getOwnerWallet, getAdminWallet, getGuestWallet };
