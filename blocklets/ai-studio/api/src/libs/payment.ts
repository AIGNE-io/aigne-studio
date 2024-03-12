import Release from '@api/store/models/release';
import { getAssistantFromRepository, getRepository } from '@api/store/repository';
import payment from '@blocklet/payment-js';
import { fromTokenToUnit, fromUnitToToken } from '@ocap/util';

export async function getPriceFromPaymentLink({ paymentLinkId }: { paymentLinkId: string }) {
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
  const assistant = await getAssistantFromRepository({ repository, ref: projectRef, assistantId, rejectOnEmpty: true });

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
