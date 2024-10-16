import { useIsAdmin, useSessionContext } from '@app/contexts/session';
import { AIGNE_STUDIO_MOUNT_POINT } from '@app/libs/constants';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import BuildingIcon from '@iconify-icons/tabler/building';
import BuildingCommunityIcon from '@iconify-icons/tabler/building-community';
import ArrowUpIcon from '@iconify-icons/tabler/circle-arrow-up';
import CircleMinusIcon from '@iconify-icons/tabler/circle-minus';
import CirclePlusIcon from '@iconify-icons/tabler/circle-plus';
import DiamondIcon from '@iconify-icons/tabler/diamond';
import HelpIcon from '@iconify-icons/tabler/help';
import HomeIcon from '@iconify-icons/tabler/home';
import { Close } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  SxProps,
  Theme,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useState } from 'react';
import { joinURL } from 'ufo';

import { PricingTable } from './pricing-table';
import { useIsProUser, useMultiTenantRestriction, useProPaymentLink } from './state';

interface Props {}

// const AI_STUDIO_STORE = 'https://registry.arcblock.io/blocklets/z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

export function PlanUpgrade({ ...rest }: Props) {
  const { hidePlanUpgrade, planUpgradeVisible, type } = useMultiTenantRestriction();
  const { t } = useLocaleContext();
  const { proPaymentLink, loading } = useProPaymentLink();
  const { session } = useSessionContext();
  const isProUser = useIsProUser();
  const isAdmin = useIsAdmin();
  const downSm = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'));
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const aignePlansEN = [
    {
      icon: HomeIcon,
      name: 'Free Plan',
      description: 'To discover AIGNE Studio and get started with AI',
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
            <Box component={Icon} icon={HelpIcon} sx={{ fontSize: 18 }} />
          </Tooltip>
        </Box>,
      ],
      price: 'FREE',
      buttonText: isProUser || session?.user ? '' : 'Sign up',
      buttonLink: joinURL('/', AIGNE_STUDIO_MOUNT_POINT),
      ...(!isAdmin && !isProUser && { active: true }),
    },
    {
      icon: BuildingIcon,
      name: 'PRO',
      description: 'The best plan for individual AI enthusiasts',
      featuresDescription: 'Everything in Free, plus',
      features: ['20 projects', '1000 requests per project', 'Unlimited agent deployments', 'Private agent publishing'],
      price: billingCycle === 'monthly' ? '10 ABT' : '8 ABT',
      priceSuffix: '/ month',
      discount: billingCycle === 'yearly' ? '20% OFF' : undefined,
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
      description: 'Run your own AIGNE Studio with your own brand',
      // featuresDescription: 'Full control and customization',
      featuresDescription: 'Run your own AIGNE Studio',
      features: [
        'Unlimited projects',
        'Unlimited requests per project',
        'Unlimited agent deployments',
        'Private agent publishing',
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>Pay as you go</span>
          <Tooltip title="Use your own API key or subscribe to our AI Kit Service">
            <Box component={Icon} icon={HelpIcon} sx={{ fontSize: 18 }} />
          </Tooltip>
        </Box>,
      ],
      price: '0.4 ABT',
      priceSuffix: '/ day',
      isStartingPrice: true,
      buttonText: 'Launch',
      buttonLink:
        'https://launcher.arcblock.io/app/?blocklet_meta_url=https%3A%2F%2Fstore.blocklet.dev%2Fapi%2Fblocklets%2Fz8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB%2Fblocklet.json&product_type=serverless',
    },
    // {
    //   icon: BuildingSkyscraperIcon,
    //   name: 'Dedicated',
    //   featuresDescription: 'Everything in Serverless, plus',
    //   features: ['Dedicated server instance'],
    //   price: '49 ABT',
    //   priceSuffix: '/month',
    //   buttonText: 'Launch',
    //   buttonLink:
    //     'https://launcher.arcblock.io/app/?blocklet_meta_url=https%3A%2F%2Fstore.blocklet.dev%2Fapi%2Fblocklets%2Fz8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB%2Fblocklet.json&product_type=dedicated',
    // },
  ] as any;

  return (
    <Dialog
      fullScreen={downSm}
      open={planUpgradeVisible}
      onClose={hidePlanUpgrade}
      PaperProps={{ sx: { width: { xs: '100%', md: 860, lg: 1100 }, maxWidth: '100%', pb: 2 } }}
      {...rest}>
      <DialogTitle className="between" sx={{ border: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Icon icon={ArrowUpIcon} />
          <span>Upgrade plan</span>
        </Box>

        <IconButton size="small" onClick={hidePlanUpgrade}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {type && (
          <Alert
            variant="outlined"
            severity="warning"
            icon={<span />}
            sx={{
              position: 'relative',
              px: 2.5,
              borderColor: 'divider',
              '.MuiAlert-icon': {
                display: 'inline-block',
                position: 'absolute',
                top: 8,
                bottom: 8,
                left: 8,
                width: 2,
                bgcolor: 'warning.main',
              },
            }}>
            {t(`multiTenantRestriction.${type}.desc`)}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: type ? 2 : 0 }}>
          {/* <Box sx={{ fontSize: 16, fontWeight: 'bold' }}>All plans</Box> */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 2,
              bgcolor: 'grey.100',
              borderRadius: 1,
            }}>
            <ToggleButtonGroup
              color="primary"
              size="small"
              value={billingCycle}
              exclusive
              onChange={(_, v) => setBillingCycle(v)}
              sx={{
                '.MuiToggleButtonGroup-grouped': {
                  width: 80,
                  border: 0,
                  fontWeight: 'bold',
                  bgcolor: '#fff',
                },
                '.MuiToggleButtonGroup-grouped.Mui-selected': {
                  bgcolor: '#000',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: '#000',
                  },
                },
              }}>
              <ToggleButton value="monthly">Monthly</ToggleButton>
              <ToggleButton value="yearly">Yearly</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <PricingTable plans={aignePlansEN} />

          <Typography variant="h3" sx={{ fontSize: 18, fontWeight: 'medium', mt: 5, textAlign: 'center' }}>
            Frequently asked questions
          </Typography>
          <Box>
            <StyledAccordion title="What is AI Kit Service?">
              <Link href="https://www.arcblock.io/docs/ai-service/en/ai-service-introduction" target="_blank">
                https://www.arcblock.io/docs/ai-service/en/ai-service-introduction
              </Link>
              <br />
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit
              leo lobortis eget.
            </StyledAccordion>
            <StyledAccordion title='What does "Run your own AIGNE Studio" mean?'>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit
              leo
            </StyledAccordion>
            <StyledAccordion title="Serverless or Dedicated Server?">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit
              leo
            </StyledAccordion>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export function PlanUpgradeButton() {
  const { showPlanUpgrade } = useMultiTenantRestriction();
  return (
    <Button color="primary" startIcon={<Icon icon={DiamondIcon} />} onClick={() => showPlanUpgrade()}>
      Upgrade Plan
    </Button>
  );
}

function StyledAccordion({ children, title, sx }: { children: React.ReactNode; title: string; sx?: SxProps }) {
  const [expanded, setExpanded] = useState(false);
  const handleChange = () => {
    setExpanded(!expanded);
  };
  return (
    <Accordion
      onChange={handleChange}
      sx={{
        '& + &': { borderTop: 1, borderColor: 'divider' },
        '&.Mui-expanded': { m: 0, '&:before': { display: 'none' } },
        ...(Array.isArray(sx) ? sx : [sx]),
      }}
      elevation={0}>
      <AccordionSummary
        expandIcon={<Box component={Icon} icon={expanded ? CircleMinusIcon : CirclePlusIcon} sx={{ fontSize: 20 }} />}
        sx={{
          px: 0,
          '&, &.Mui-expanded': { minHeight: 0 },
          '.MuiAccordionSummary-content': { '&, &.Mui-expanded': { my: 1 } },
        }}>
        <Typography variant="subtitle2" sx={{}}>
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
