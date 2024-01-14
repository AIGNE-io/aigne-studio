import { AppRegisterResult, AppStatusResult, aiKitRegister, getAIKitServiceStatus } from '@app/libs/payment';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface AIKitServiceStatus {
  fetchSubscribeStatus: () => Promise<void>;
  fetchRegisterStatus: () => Promise<void>;
}

export type AIKitServiceState = {
  loading: boolean;
  subscriptionState?: AppStatusResult;
  appRegisterState?: AppRegisterResult;
  computed: {
    isSubscriptionAvailable?: boolean;
  };
};

export type AIKitServiceActions = {
  fetchSubscribeStatus: () => Promise<void>;
  fetchRegisterStatus: () => Promise<void>;
};

export type AIKitServiceStore = AIKitServiceState & AIKitServiceActions;

const aiKitServiceStore = create<AIKitServiceStore>()(
  immer((set, get) => ({
    loading: true,
    fetchSubscribeStatus: async () => {
      set({ loading: true });
      try {
        const data = await getAIKitServiceStatus();
        set({ subscriptionState: data });
      } finally {
        set({ loading: false });
      }
    },
    fetchRegisterStatus: async () => {
      const data = await aiKitRegister();
      set({ appRegisterState: data });
    },
    computed: {
      get isSubscriptionAvailable() {
        const subscription = get().subscriptionState?.subscription;
        return subscription && ['active', 'trialing'].includes(subscription.status);
      },
    },
  }))
);

export default aiKitServiceStore;
