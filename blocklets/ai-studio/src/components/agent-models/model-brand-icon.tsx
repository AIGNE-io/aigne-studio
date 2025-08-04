import { Icon } from '@iconify-icon/react';
import CubeIcon from '@iconify-icons/tabler/cube';
import { Box, SxProps } from '@mui/material';

import { brandIcon } from '../selector/model-select-field';
import { useModelBrand } from './use-models';

interface ModelIconProps {
  model: string;
  url?: string;
  size?: 'small' | 'medium' | 'large';
  sx?: SxProps;
}

const sizeMap = {
  small: 20,
  medium: 32,
  large: 48,
};

export function ModelBrandIcon({ model, size = 'medium', sx = undefined, url = undefined }: ModelIconProps) {
  const brand = useModelBrand(model);
  const computedSize = sizeMap[size];
  const mergedSx = [
    {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: computedSize,
      height: computedSize,
      fontSize: computedSize,
      borderRadius: '25%',
    },
    ...(Array.isArray(sx) ? sx : [sx]),
  ];
  const renderIcon = () => {
    if (url) {
      return (
        <Box
          component="img"
          src={url}
          alt={model}
          sx={{
            width: '0.85em',
            height: '0.85em',
            objectFit: 'cover',
          }}
        />
      );
    }
    return brand ? (
      brandIcon(brand)
    ) : (
      <Box component={Icon} icon={CubeIcon} sx={{ fontSize: computedSize, color: 'grey.400' }} />
    );
  };
  return <Box sx={mergedSx}>{renderIcon()}</Box>;
}
