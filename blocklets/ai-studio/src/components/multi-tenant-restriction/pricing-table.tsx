import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import HelpIcon from '@iconify-icons/tabler/help';
import VerifiedIcon from '@mui/icons-material/Verified';
import { Box, Button, SxProps, Tooltip, Typography } from '@mui/material';
import { ReactNode } from 'react';

type BillingCycle = 'monthly' | 'yearly';
type CycleBasedValue = string | { monthly: string; yearly: string };
type Feature = string | { text: string; tooltip?: string };

export interface Plan {
  name: string;
  featuresDescription?: string;
  features: Feature[];
  price?: CycleBasedValue;
  priceSuffix?: string;
  discount?: CycleBasedValue;
  isStartingPrice?: boolean;
  buttonText: string | [string, string];
  link: CycleBasedValue;
  isFeatured?: boolean;
  qualified?: boolean;
  active?: boolean;
  billingLink?: ReactNode;
}

interface PricingTableProps {
  plans: Plan[];
  sx?: SxProps;
  billingCycle?: BillingCycle;
}

function PricingTablePlan({ plan, billingCycle }: { plan: Plan; billingCycle?: BillingCycle }) {
  const { t } = useLocaleContext();
  const renderFeature = (feature: Feature) => {
    if (typeof feature === 'string') {
      return (
        <Box component="span" sx={{ color: 'text.secondary' }}>
          {feature}
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <span>{feature.text}</span>
        {feature.tooltip && (
          <Tooltip title={feature.tooltip}>
            <Box component={Icon} icon={HelpIcon} sx={{ fontSize: 18 }} />
          </Tooltip>
        )}
      </Box>
    );
  };
  const link = typeof plan.link === 'string' ? plan.link : plan.link[billingCycle!];
  let buttonText =
    typeof plan.buttonText === 'string' ? plan.buttonText : plan.qualified ? plan.buttonText[1] : plan.buttonText[0];
  if (!link) {
    buttonText = 'Unavailable';
  }
  const buttonDisabled = !link || plan.qualified;
  return (
    <Box
      sx={{
        flexBasis: { xs: '100%', md: '33.33%' },
        maxWidth: { xs: '100%', md: '33.33%' },
        p: 1,
      }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          height: '100%',
          p: 4,
          pb: 5,
          bgcolor: 'grey.100',
          borderRadius: 1,
        }}>
        <Typography
          variant="h2"
          sx={{
            position: 'relative',
            fontSize: 18,
            fontWeight: 'bold',
            color: 'grey.800',
          }}>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {plan.name}
          </Box>

          {plan.isFeatured && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                px: 1,
                py: 0.25,
                color: 'primary.contrastText',
                bgcolor: 'primary.light',
                borderRadius: 0.75,
                fontSize: 12,
              }}>
              Most popular
            </Box>
          )}
        </Typography>
        <Box
          sx={{
            position: 'relative',
            mt: 2,
            fontWeight: 'bold',
          }}>
          {plan.isStartingPrice && (
            <Box
              component="span"
              sx={{
                position: 'absolute',
                top: -8,
                left: 0,
                fontSize: 13,
                color: 'text.secondary',
                fontWeight: 'medium',
              }}>
              Starting at
            </Box>
          )}
          {plan.price && (
            <Box component="span" sx={{ fontSize: 36 }}>
              {typeof plan.price === 'string' ? plan.price : plan.price[billingCycle!]}
            </Box>
          )}
          <Box
            sx={{
              display: 'inline-flex',
              flexDirection: 'column',
              ml: 1,
              verticalAlign: 'text-bottom',
            }}>
            {plan.discount && (
              <Box component="span" sx={{ lineHeight: 1, fontSize: 12, color: 'warning.main' }}>
                {typeof plan.discount === 'string' ? plan.discount : plan.discount[billingCycle!]}
              </Box>
            )}
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                fontSize: 14,
                color: 'text.secondary',
              }}>
              {plan.priceSuffix}
            </Box>
          </Box>
        </Box>

        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 2, mb: 6 }}>
          <Box component="li" sx={{ fontSize: 14, fontWeight: 'bold', mb: 1 }}>
            {plan.featuresDescription}
          </Box>
          {plan.features.map((feature, index) => (
            <Box
              component="li"
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                lineHeight: 1.65,
              }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '1.65em' }}>
                <Box component={Icon} icon="tabler:check" sx={{ color: 'green' }} />
              </Box>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {renderFeature(feature)}
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ mt: 'auto' }}>
          {buttonText && !plan.active && (
            <Button
              variant={plan.isFeatured ? 'contained' : 'outlined'}
              color="primary"
              disabled={buttonDisabled}
              sx={{
                width: 1,
                py: 0.75,
                ...(!plan.isFeatured && { bgcolor: '#fff' }),
              }}
              onClick={() => {
                window.open(link, '_blank');
              }}>
              {buttonText}
            </Button>
          )}
          {plan.active && (
            <Box sx={{ position: 'relative' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  py: 0.75,
                  border: 1,
                  borderColor: 'success.light',
                  borderRadius: 1,
                  color: 'success.light',
                  fontSize: 13,
                  textAlign: 'center',
                }}>
                {t('pricingAndPlans.currentPlan')}
                <Box component={VerifiedIcon} sx={{ fontSize: 18, color: 'success.light' }} />
              </Box>
              {plan.billingLink && <Box sx={{ position: 'absolute', bottom: -24 }}>{plan.billingLink}</Box>}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * TODO: 暂时仅考虑 plan 为 3 个的情况
 */
export function PricingTable({ plans, sx, billingCycle, ...rest }: PricingTableProps) {
  return (
    <Box sx={sx} {...rest}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          mx: -1,
        }}>
        {plans.map((plan) => (
          <PricingTablePlan key={plan.name} plan={plan} billingCycle={billingCycle} />
        ))}
      </Box>
    </Box>
  );
}
