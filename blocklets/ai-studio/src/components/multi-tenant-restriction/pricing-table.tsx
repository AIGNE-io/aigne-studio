import { Icon, IconifyIcon } from '@iconify-icon/react';
import { LoadingButton } from '@mui/lab';
import { Box } from '@mui/material';
import { ReactNode } from 'react';

interface Plan {
  icon: string | IconifyIcon;
  name: string;
  featuresDescription?: string;
  features: ReactNode[];
  price?: ReactNode;
  priceSuffix?: string;
  buttonText: string;
  buttonLink: string;
  buttonLoading?: boolean;
  active?: boolean;
  isFeatured?: boolean;
}

interface PricingTableProps {
  plans: Plan[];
}

function PricingTablePlan({ plan }: { plan: Plan }) {
  return (
    <Box
      sx={{
        flexBasis: { xs: '100%', md: '50%', lg: '25%' },
        maxWidth: { xs: '100%', md: '50%', lg: '25%' },
        p: 1,
      }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          height: '100%',
          p: 2,
          bgcolor: 'grey.100',
          borderRadius: 1,
          ...(plan.active && { border: 1, borderColor: 'success.light' }),
        }}>
        <Box component={Icon} icon={plan.icon} sx={{ fontSize: 36 }} />
        <Box sx={{ fontSize: 16, fontWeight: 'bold', color: 'grey.800' }}>{plan.name}</Box>
        <Box sx={{ fontWeight: 'bold' }}>
          <Box component="span" sx={{ fontSize: 24 }}>
            {plan.price}
          </Box>
          <Box component="span" sx={{ display: 'inline-block', ml: 1, fontSize: 14, verticalAlign: 'text-bottom' }}>
            {plan.priceSuffix}
          </Box>
        </Box>
        <Box sx={{ height: 36 }}>
          {plan.buttonText && (
            <LoadingButton
              variant={plan.isFeatured ? 'contained' : 'outlined'}
              color="primary"
              loading={plan.buttonLoading}
              disabled={plan.active}
              sx={{
                width: 1,
                py: 1,
                ...(!plan.isFeatured && { bgcolor: '#fff' }),
              }}
              onClick={() => {
                window.open(plan.buttonLink, '_blank');
              }}>
              {plan.buttonText}
            </LoadingButton>
          )}
        </Box>

        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 2 }}>
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
                lineHeight: 1.5,
              }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '1.5em' }}>
                <Box component={Icon} icon="tabler:check" sx={{ color: 'green' }} />
              </Box>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {feature}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * TODO: 暂时仅考虑 plan 为 4 个的情况
 */
export function PricingTable({ plans, ...rest }: PricingTableProps) {
  return (
    <Box
      sx={
        {
          // borderTop: '1px solid',
          // borderBottom: '1px solid',
          // borderColor: 'grey.100',
        }
      }
      {...rest}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          mx: -1,
        }}>
        {plans.map((plan) => (
          <PricingTablePlan key={plan.name} plan={plan} />
        ))}
      </Box>
    </Box>
  );
}
