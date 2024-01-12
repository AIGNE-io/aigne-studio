import { getPaymentKitStatus, getRegister } from '@app/libs/payment';
import { TSubscriptionExpanded } from '@did-pay/client';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface SubscriptionState {
  id: string;
  subscription?: TSubscriptionExpanded;
}

export interface AppRegisterState {
  appId: string;
  paymentLink: string;
}

export interface AIKitServiceStatus {
  fetchSubscribeStatus: () => Promise<void>;
  fetchRegisterStatus: () => Promise<void>;
}
export type AIKitServiceState = {
  loading: boolean;
  subscriptionState: SubscriptionState;
  appRegisterState?: AppRegisterState;
  isSubscriptionAvailable?: boolean;
};
export type AIKitServiceActions = {
  fetchSubscribeStatus: () => Promise<void>;
  fetchRegisterStatus: () => Promise<void>;
};

export type AIKitServiceStore = AIKitServiceState & AIKitServiceActions;
const DefaultState: AIKitServiceState = {
  loading: true,
  subscriptionState: {} as SubscriptionState,
};

const aiKitServiceStore = create<AIKitServiceStore>()(
  immer((set, get) => ({
    ...DefaultState,
    fetchSubscribeStatus: async () => {
      set({ loading: true });
      try {
        const data = await getPaymentKitStatus();
        set({ subscriptionState: data });
      } finally {
        set({ loading: false });
      }
    },
    fetchRegisterStatus: async () => {
      const data = await getRegister();
      set({ appRegisterState: data });
    },
    get isSubscriptionAvailable() {
      const subscription = get().subscriptionState?.subscription;
      return subscription && ['active', 'trialing'].includes(subscription.status);
    },
  }))
);

export default aiKitServiceStore;
