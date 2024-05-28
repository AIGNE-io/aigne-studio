import { Theme, Tooltip, TooltipProps, useMediaQuery } from '@mui/material';
import { ReactElement } from 'react';

export function AgentTooltip(props: { children: React.ReactElement<any, any> } & TooltipProps): ReactElement {
  const isMobile = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));

  // https://github.com/mui/material-ui/issues/14948
  // 根据官方建议，移动端使用 Tooltip 组件的时候，
  // 使用 enterTouchDelay 和 leaveTouchDelay 来控制 Tooltip 显示和隐藏
  function MoblieTooltip() {
    return (
      <Tooltip {...props} enterTouchDelay={0} leaveTouchDelay={1000}>
        {props.children}
      </Tooltip>
    );
  }

  return <> {isMobile ? MoblieTooltip() : <Tooltip {...props}>{props.children}</Tooltip>} </>;
}
