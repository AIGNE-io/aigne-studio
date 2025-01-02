import History from '@api/store/models/history';
import type Release from '@api/store/models/release';
import { getRepository } from '@api/store/repository';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import payment from '@blocklet/payment-js';
import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import { fromTokenToUnit, fromUnitToToken } from '@ocap/util';
import type { DebouncedFunc } from 'lodash';
import { throttle } from 'lodash';
import { Op } from 'sequelize';

import { Config } from './env';
import logger from './logger';

const isPaymentInstalled = () => !!getComponentWebEndpoint('z2qaCNvKMv5GjouKdcDWexv6WqtHbpNPQDnAk');

export async function getActiveSubscriptionOfAssistant({ aid, userId }: { aid: string; userId: string }) {
  const subscription = (
    await payment.subscriptions.list({
      // @ts-ignore TODO: remove ts-ignore after upgrade @did-pay/client
      'metadata.aid': aid,
      'metadata.userId': userId,
    })
  ).list.find((i) => ['active', 'trialing'].includes(i.status));

  return subscription;
}

export async function getPriceFromPaymentLink({ paymentLinkId }: { paymentLinkId: string }) {
  if (!isPaymentInstalled()) return undefined;
  const paymentLink = await payment.paymentLinks.retrieve(paymentLinkId);

  const unitAmount = paymentLink?.line_items[0]?.price.unit_amount;

  return unitAmount ? fromUnitToToken(unitAmount) : undefined;
}

export async function createOrUpdatePaymentForRelease(
  release: Release,
  { paymentUnitAmount }: { paymentUnitAmount: string }
) {
  const { projectId, projectRef, assistantId } = release;

  const repository = await getRepository({ projectId });
  const assistant = await repository.readAgent({
    ref: projectRef,
    agentId: assistantId,
    rejectOnEmpty: true,
  });

  let needRecreatePaymentLink = true;

  if (release.paymentLinkId) {
    const price = await getPriceFromPaymentLink({ paymentLinkId: release.paymentLinkId });
    if (price && fromTokenToUnit(price) === fromTokenToUnit(paymentUnitAmount)) {
      needRecreatePaymentLink = false;
    }
  }

  if (needRecreatePaymentLink) {
    let product: Awaited<ReturnType<typeof payment.products.create>>;
    let price: Awaited<ReturnType<typeof payment.prices.create>>;

    if (release.paymentProductId) {
      product = await payment.products.retrieve(release.paymentProductId);

      price = await payment.prices.create({
        product_id: product.id,
        type: 'recurring',
        unit_amount: paymentUnitAmount,
        recurring: {
          interval: 'day',
          interval_count: 1,
          usage_type: 'metered',
          aggregate_usage: 'sum',
        },
      });
    } else {
      product = await payment.products.create({
        name: release.title || assistant.name || 'Unnamed AI Application',
        description: release.description || assistant.description || '',
        images: release.icon ? [release.icon] : [],
        type: 'service',
        prices: [
          {
            type: 'recurring',
            unit_amount: paymentUnitAmount,
            recurring: {
              interval: 'day',
              interval_count: 1,
              usage_type: 'metered',
              aggregate_usage: 'sum',
            },
          },
        ],
      });

      price = product.prices[0]!;
    }

    const paymentLink = await payment.paymentLinks.create({
      line_items: [{ price_id: price.id, quantity: 1 }],
      name: product.name,
    });

    await release.update({ paymentProductId: product.id, paymentLinkId: paymentLink.id });
  }
}

const tasks: { [key: string]: DebouncedFunc<(options: { userId: string }) => Promise<void>> } = {};

export async function reportUsage({
  projectId,
  projectRef,
  assistantId,
  userId,
}: {
  projectId: string;
  projectRef: string;
  assistantId: string;
  userId: string;
}) {
  const key = `${userId}-${projectId}-${projectRef}-${assistantId}`;
  tasks[key] ??= throttle(
    async ({ userId }: { userId: string }) => {
      try {
        const start = await History.findOne({
          where: {
            userId,
            projectId,
            ref: projectRef,
            assistantId,
            usageReportStatus: { [Op.not]: null },
          },
          order: [['id', 'desc']],
          limit: 1,
        });
        const end = await History.findOne({
          where: {
            userId,
            projectId,
            ref: projectRef,
            assistantId,
            id: { [Op.gt]: start?.id || '' },
          },
          order: [['id', 'desc']],
          limit: 1,
        });

        if (!end) return;

        const count = await History.count({
          where: {
            userId,
            projectId,
            ref: projectRef,
            assistantId,
            id: { [Op.gt]: start?.id || '', [Op.lte]: end.id },
            error: { [Op.is]: null },
          },
        });

        const subscription = await getActiveSubscriptionOfAssistant({
          aid: stringifyIdentity({ projectId, projectRef, agentId: assistantId }),
          userId,
        });
        if (!subscription) throw new Error('Subscription not active');

        const subscriptionItem = subscription.items[0];
        if (!subscriptionItem) throw new Error('Subscription item not found');

        await end.update({ usageReportStatus: 'counted' });

        await payment.subscriptionItems.createUsageRecord({
          subscription_item_id: subscriptionItem.id,
          quantity: count || 0,
        });

        await end.update({ usageReportStatus: 'reported' });
      } catch (error) {
        logger.error('report usage error', { error });
      }
    },
    Config.usageReportThrottleTime,
    { leading: false, trailing: true }
  );

  tasks[key]!({ userId });
}
