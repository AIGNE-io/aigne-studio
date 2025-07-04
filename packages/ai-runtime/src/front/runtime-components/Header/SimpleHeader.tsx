import { cx } from '@emotion/css';
import { Stack, StackProps, Typography, TypographyProps } from '@mui/material';
import Balancer, { Provider } from 'react-wrap-balancer';

import { useEntryAgent } from '../../contexts/EntryAgent';
import { useProfile } from '../../hooks/use-appearances';

export default function SimpleHeader({
  TitleProps,
  DescriptionProps,
  ...props
}: { TitleProps?: TypographyProps; DescriptionProps?: TypographyProps } & StackProps) {
  const { aid } = useEntryAgent();
  const profile = useProfile({ aid });

  const { name, description } = profile;

  return (
    <Stack
      {...props}
      className={cx('aigne-header aigne-simple-header', props.className)}
      sx={[{
        gap: 2,
        mt: 8,
        mb: 4
      }, ...(Array.isArray(props.sx) ? props.sx : [props.sx])]}>
      <Provider>
        {name && (
          <Typography
            variant="h4"
            {...TitleProps}
            sx={[{
              width: "100%",
              fontSize: 30,
              fontWeight: 700,
              textAlign: "center"
            }, ...(Array.isArray(TitleProps.sx) ? TitleProps.sx : [TitleProps.sx])]}>
            <Balancer>{name}</Balancer>
          </Typography>
        )}
        {description && (
          <Typography
            {...DescriptionProps}
            sx={[{
              width: "100%",
              textAlign: "center"
            }, ...(Array.isArray(DescriptionProps.sx) ? DescriptionProps.sx : [DescriptionProps.sx])]}>
            <Balancer>{description}</Balancer>
          </Typography>
        )}
      </Provider>
    </Stack>
  );
}
