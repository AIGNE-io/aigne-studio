import { Icon } from '@iconify-icon/react';
import { LoadingButton } from '@mui/lab';
import { Box, SxProps, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface Plan {
  name: string;
  featuresDescription?: string;
  features: ReactNode[];
  price?: ReactNode;
  priceSuffix?: string;
  discount?: string;
  isStartingPrice?: boolean;
  buttonText: string;
  buttonLink: string;
  buttonLoading?: boolean;
  active?: boolean;
  isFeatured?: boolean;
}

interface PricingTableProps {
  plans: Plan[];
  sx?: SxProps;
}

function PricingTablePlan({ plan }: { plan: Plan }) {
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
          {plan.name}

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
          <Box component="span" sx={{ fontSize: 36 }}>
            {plan.price}
          </Box>
          <Box
            sx={{
              display: 'inline-flex',
              flexDirection: 'column',
              ml: 1,
              verticalAlign: 'text-bottom',
            }}>
            {plan.discount && (
              <Box component="span" sx={{ lineHeight: 1, fontSize: 12, color: 'warning.main' }}>
                {plan.discount}
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
                {feature}
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ mt: 'auto' }}>
          {plan.buttonText && (
            <LoadingButton
              variant={plan.isFeatured ? 'contained' : 'outlined'}
              color="primary"
              loading={plan.buttonLoading}
              disabled={plan.active}
              sx={{
                width: 1,
                py: 0.75,
                ...(!plan.isFeatured && { bgcolor: '#fff' }),
              }}
              onClick={() => {
                window.open(plan.buttonLink, '_blank');
              }}>
              {plan.buttonText}
            </LoadingButton>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * TODO: 暂时仅考虑 plan 为 3 个的情况
 */
export function PricingTable({ plans, sx, ...rest }: PricingTableProps) {
  return (
    <Box sx={sx} {...rest}>
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
