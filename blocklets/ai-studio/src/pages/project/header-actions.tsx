import UploaderProvider from '@app/contexts/uploader';
import { Box, Button, ClickAwayListener, Grow, Paper, Popper, Stack } from '@mui/material';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import CommitsTip from '../../components/template-form/commits-tip';
import { getFileIdFromPath } from '../../utils/path';
import History from './icons/history';
import Publish from './icons/publish';
import PublishView from './publish-view';
import SaveButton from './save-button';
import { useProjectState } from './state';
import { useProjectStore } from './yjs-state';

export default function HeaderActions() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }

    setOpen(false);
  };

  const {
    state: { loading, commits },
  } = useProjectState(projectId, gitRef);
  const { getFileById } = useProjectStore(projectId, gitRef, true);

  const fileId = filepath && getFileIdFromPath(filepath);
  const file = fileId && getFileById(fileId);

  return (
    <Stack flexDirection="row" gap={1} alignItems="center">
      <CommitsTip
        loading={loading}
        commits={commits}
        hash={gitRef}
        onCommitSelect={(commit) => {
          navigate(joinURL('..', commit.oid), { state: { filepath } });
        }}>
        <Button sx={{ minWidth: 0, minHeight: 0, width: 32, height: 32, border: '1px solid #E5E7EB' }}>
          <History sx={{ fontSize: 20 }} />
        </Button>
      </CommitsTip>

      <SaveButton projectId={projectId} gitRef={gitRef} />

      {file && (
        <>
          <Box ref={anchorRef}>
            <Button variant="contained" onClick={handleToggle} startIcon={<Publish />} size="small">
              Publish
            </Button>
          </Box>

          <Popper
            sx={{ zIndex: 1101 }}
            open={open}
            anchorEl={anchorRef.current}
            role={undefined}
            transition
            placement="bottom-end"
            disablePortal>
            {({ TransitionProps }) => (
              <Grow style={{ transformOrigin: 'right top' }} {...TransitionProps}>
                <Paper sx={{ border: '1px solid #ddd', maxWidth: 350, maxHeight: '80vh', overflow: 'auto' }}>
                  <ClickAwayListener onClickAway={handleClose}>
                    <UploaderProvider>
                      <PublishView
                        projectId={projectId}
                        projectRef={gitRef}
                        assistant={file}
                        onSubmitChange={handleClose}
                      />
                    </UploaderProvider>
                  </ClickAwayListener>
                </Paper>
              </Grow>
            )}
          </Popper>
        </>
      )}
    </Stack>
  );
}
