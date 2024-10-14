import { useIsAdmin } from '@app/contexts/session';
import { AIGNE_STUDIO_MOUNT_POINT } from '@app/libs/constants';
import { Icon, IconifyIcon } from '@iconify-icon/react';
import BuildingIcon from '@iconify-icons/tabler/building';
import BuildingCommunityIcon from '@iconify-icons/tabler/building-community';
import BuildingSkyscraperIcon from '@iconify-icons/tabler/building-skyscraper';
import HomeIcon from '@iconify-icons/tabler/home';
import InfoCircleIcon from '@iconify-icons/tabler/info-circle';
import { LoadingButton } from '@mui/lab';
import { Box, Tooltip } from '@mui/material';
import { ReactNode } from 'react';
import { joinURL } from 'ufo';

import { useIsProUser, useProPaymentLink } from './state';

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

const AI_STUDIO_STORE = 'https://registry.arcblock.io/blocklets/z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

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
function InnerPricingTable({ plans, ...rest }: PricingTableProps) {
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

export function PricingTable() {
  const { proPaymentLink, loading } = useProPaymentLink();
  const isProUser = useIsProUser();
  const isAdmin = useIsAdmin();

  const aignePlansEN = [
    {
      icon: HomeIcon,
      name: 'Hobby',
      featuresDescription: 'Includes',
      features: [
        '3 projects',
        '100 requests per project',
        'Dataset collection',
        'Testing and evaluation',
        'Prompt management',
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>Data sync with DID Space</span>
          <Tooltip title="DID Wallet required">
            <Box component={Icon} icon={InfoCircleIcon} sx={{ fontSize: 18 }} />
          </Tooltip>
        </Box>,
      ],
      price: 'FREE',
      buttonText: isProUser ? '' : 'Sign up',
      buttonLink: joinURL('/', AIGNE_STUDIO_MOUNT_POINT),
      ...(!isAdmin && !isProUser && { active: true }),
    },
    {
      icon: BuildingIcon,
      name: 'Pro',
      featuresDescription: 'Everything in Hobby, plus',
      features: ['20 projects', '1000 requests per project', 'Unlimited agent deployments', 'Private agent publishing'],
      price: '9.99 ABT',
      priceSuffix: '/month',
      buttonText: isProUser ? 'Subscribed' : 'Upgrade',
      buttonLink: proPaymentLink,
      buttonLoading: loading || !proPaymentLink,
      buttonDisabled: isProUser,
      isFeatured: true,
      ...(isProUser && { active: true }),
    },
    {
      icon: BuildingCommunityIcon,
      name: 'Serverless',
      featuresDescription: 'Everything in Pro, plus',
      features: [
        'Unlimited projects',
        'Unlimited requests per project',
        'Unlimited agent deployments',
        'Private agent publishing',
        'Pay as you go',
      ],
      price: '0.4 ABT',
      priceSuffix: '/day',
      buttonText: 'Launch',
      buttonLink: AI_STUDIO_STORE,
    },
    {
      icon: BuildingSkyscraperIcon,
      name: 'Dedicated',
      featuresDescription: 'Everything in Serverless, plus',
      features: ['Dedicated server instance'],
      price: '49 ABT',
      priceSuffix: '/month',
      buttonText: 'Launch',
      buttonLink: '#/',
    },
  ] as any;

  return <InnerPricingTable plans={aignePlansEN} />;
}
