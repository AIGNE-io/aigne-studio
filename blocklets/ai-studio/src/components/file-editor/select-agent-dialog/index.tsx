import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import CloseIcon from '@iconify-icons/tabler/x';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  Divider,
  IconButton,
  Theme,
  useMediaQuery,
} from '@mui/material';

import Info from './components/info';
import SelectAgentList from './components/list';
import SelectAgentSearch from './components/search';
import SelectAgentTabs from './components/tabs';
import { SelectAgentProvider, useSelectAgentContext } from './select-agent-context';

interface SelectAgentDialogProps {
  currentAgent: AssistantYjs;
  DialogProps?: DialogProps;
  // TODO: fix any
  onSelect?: (tool: any) => void;
}

const SelectAgentDialog = ({ currentAgent, DialogProps, onSelect }: SelectAgentDialogProps) => {
  const downMd = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const paperPropsSx = downMd ? {} : { width: 'calc(100% - 64px)', height: 'calc(100% - 64px)' };

  const onClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    DialogProps?.onClose?.(e, 'escapeKeyDown');
  };

  return (
    <Dialog
      open={false}
      {...DialogProps}
      fullScreen={downMd}
      PaperProps={{ sx: { maxWidth: 'none', ...paperPropsSx } }}>
      <SelectAgentProvider currentAgent={currentAgent}>
        <Content onClose={onClose} onSelect={onSelect} />
      </SelectAgentProvider>
    </Dialog>
  );
};

const Content = ({
  onClose,
  onSelect,
}: {
  onClose: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSelect?: (tool: any) => void;
}) => {
  const { selectedAgent } = useSelectAgentContext();
  const { t } = useLocaleContext();
  const upMd = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

  const onOk = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (selectedAgent) {
      onClose(e);
      onSelect?.(selectedAgent);
    }
  };

  return (
    <>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 600 }}>
        {t('selectTool')}
        <IconButton sx={{ p: 0, minWidth: 32, minHeight: 32 }} onClick={onClose}>
          <Icon icon={CloseIcon} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', height: '100%' }}>
          <Box
            sx={{
              flex: 1,
              ...(selectedAgent && {
                height: '100%',
                overflowY: 'auto',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }),
            }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <SelectAgentTabs />
              <SelectAgentSearch />
            </Box>
            <SelectAgentList />
          </Box>
          {upMd && <DesktopContent />}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button variant="contained" onClick={onOk}>
          {t('ok')}
        </Button>
      </DialogActions>
    </>
  );
};

const DesktopContent = () => {
  const { selectedAgent } = useSelectAgentContext();

  return (
    <>
      <Divider
        orientation="vertical"
        flexItem
        sx={{
          borderColor: 'grey.200',
          width: selectedAgent ? '1px' : '0px',
          mx: selectedAgent ? 2 : 0,
          opacity: selectedAgent ? 1 : 0,
        }}
      />
      <Box
        sx={{
          flexShrink: 1,
          width: selectedAgent ? 420 : 0,
          overflow: 'hidden',
        }}>
        {selectedAgent && <Info agent={selectedAgent} />}
      </Box>
    </>
  );
};

export default SelectAgentDialog;
