import { styled } from '@mui/material/styles';
import Switch, { SwitchProps } from '@mui/material/Switch';

interface IOSSwitchProps extends SwitchProps {
  fontSize?: number;
}

const IOSSwitch = styled((props: IOSSwitchProps) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme, fontSize = 16 }) => {
  const switchWidth = fontSize * 2.625; // 根据 fontSize 动态计算宽度
  const switchHeight = fontSize * 1.625; // 根据 fontSize 动态计算高度
  const thumbSize = fontSize * 1.375; // 根据 fontSize 动态计算 thumb 大小
  const translateX = fontSize; // 根据 fontSize 动态计算 transform 的位移

  return {
    width: switchWidth,
    height: switchHeight,
    padding: 0,
    '& .MuiSwitch-switchBase': {
      padding: 0,
      margin: fontSize * 0.125, // 动态计算 margin
      transitionDuration: '300ms',
      '&.Mui-checked': {
        transform: `translateX(${translateX}px)`,
        color: '#fff',
        '& + .MuiSwitch-track': {
          backgroundColor: theme.palette.mode === 'dark' ? '#2ECA45' : '#65C466',
          opacity: 1,
          border: 0,
        },
        '&.Mui-disabled + .MuiSwitch-track': {
          opacity: 0.5,
        },
      },
      '&.Mui-focusVisible .MuiSwitch-thumb': {
        color: '#33cf4d',
        border: `${fontSize * 0.375}px solid #fff`, // 动态计算边框厚度
      },
      '&.Mui-disabled .MuiSwitch-thumb': {
        color: theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[600],
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
      },
    },
    '& .MuiSwitch-thumb': {
      boxSizing: 'border-box',
      width: thumbSize,
      height: thumbSize,
    },
    '& .MuiSwitch-track': {
      borderRadius: switchHeight / 2,
      backgroundColor: theme.palette.mode === 'light' ? '#E9E9EA' : '#39393D',
      opacity: 1,
      transition: theme.transitions.create(['background-color'], {
        duration: 500,
      }),
    },
  };
});

export default IOSSwitch;
