import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Stack } from '@mui/material';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import { useReactive } from 'ahooks';
import { useRef, useState } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import { ToolsMessage } from '../../../api/src/store/templates';
import Add from '../../pages/project/icons/add';
import { randomId } from '../../pages/project/prompt-state';
import ToolFunctionCallDialog, { useOptions } from './tools-calling-dialog';

export default function ToolsButton({
  readOnly,
  projectId,
  gitRef,
  template,
}: {
  readOnly?: boolean;
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
}) {
  const { t } = useLocaleContext();

  const state = useReactive<{ call?: ToolsMessage | null }>({});

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const { options } = useOptions();

  const handleMenuItemClick = (key: string) => {
    const id = randomId();
    const randomVariableNamePrefix = 'var-';
    const variable = `${randomVariableNamePrefix}${randomId(5)}`;

    const map: Record<(typeof options)[number]['key'], any> = {
      'call-prompt': { id, role: 'call-prompt', output: variable },
      'call-api': { id, role: 'call-api', output: variable, method: 'get', url: '' },
      'call-function': { id, role: 'call-function', output: variable },
    };

    state.call = {
      id,
      function: {
        name: '',
        description: '',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      extraInfo: map[key],
    };

    setOpen(false);
  };

  const handleClose = (event: Event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }
    setOpen(false);
  };

  return (
    <Stack direction="row" gap={2}>
      {!readOnly && (
        <ButtonGroup ref={anchorRef} size="small" variant="text">
          <Button size="small" startIcon={<Add />} onClick={() => setOpen((prevOpen) => !prevOpen)}>
            {t('add', { object: '' })}
          </Button>
        </ButtonGroup>
      )}

      <Popper sx={{ zIndex: 1 }} open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal>
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
            }}>
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="split-button-menu" autoFocusItem>
                  {options.map((option) => (
                    <MenuItem key={option.key} onClick={() => handleMenuItemClick(option.key)}>
                      {option.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>

      {state?.call && (
        <ToolFunctionCallDialog projectId={projectId} gitRef={gitRef} template={template} state={state} />
      )}
    </Stack>
  );
}
