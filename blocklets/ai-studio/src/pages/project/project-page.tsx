import { AddRounded, CreateNewFolderOutlined, MenuOpenRounded, TuneRounded } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  buttonClasses,
} from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { TemplateYjs } from '../../../api/src/store/projects';
import WithAwareness from '../../components/awareness/with-awareness';
import TemplateFormView from '../../components/template-form';
import Popper from '../../components/template-form/popper';
import TemplateSettings from '../../components/template-form/template-settings';
import { useComponent } from '../../contexts/component';
import { useIsAdmin } from '../../contexts/session';
import ColumnsLayout, { ImperativeColumnsLayout } from './columns-layout';
import DebugView from './debug-view';
import FileTree, { ImperativeFileTree } from './file-tree';
import { useProjectState } from './state';
import { isTemplate, useStore } from './yjs-state';

const defaultBranch = 'main';

const PREVIOUS_FILE_PATH = (projectId: string) => `ai-studio.previousFilePath.${projectId}`;

export default function ProjectPage() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const { store, synced } = useStore(projectId, gitRef, true);

  const id = Object.entries(store.tree).find((i) => i[1] === filepath)?.[0];
  const file = id ? store.files[id] : undefined;
  const template = isTemplate(file) ? file : undefined;

  const { refetch } = useProjectState(projectId, gitRef);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const isAdmin = useIsAdmin();
  const disableMutation = gitRef === defaultBranch && !isAdmin;

  const location = useLocation();
  const navigate = useNavigate();

  const [previousFilePath, setPreviousFilePath] = useLocalStorageState<{ [key: string]: string } | undefined>(
    PREVIOUS_FILE_PATH(projectId)
  );

  useEffect(() => {
    if (filepath) return;

    const filepathState = location.state?.filepath;

    const p =
      (typeof filepathState === 'string' ? filepathState : undefined) ||
      (gitRef === defaultBranch ? previousFilePath?.[gitRef] : undefined);

    const filename = p?.split('/').slice(-1)[0];

    const path = filename && Object.values(store.tree).find((i) => i?.endsWith(filename));

    if (path) navigate(path, { replace: true });
  }, [gitRef, synced, location]);

  useEffect(() => {
    if (filepath) setPreviousFilePath((v) => ({ ...v, [gitRef]: filepath }));
  }, [gitRef, filepath, setPreviousFilePath]);

  const assistant = useComponent('ai-assistant');

  const onLaunch = useCallback(
    async (template: TemplateYjs) => {
      if (!assistant) {
        return;
      }

      const mode = `${template.mode === 'chat' ? 'chat' : 'templates'}`;

      window.open(
        `${assistant.mountPoint}/projects/${projectId}/${gitRef}/${mode}/${template.id}?source=studio`,
        '_blank'
      );
    },
    [assistant, projectId, gitRef]
  );

  const layout = useRef<ImperativeColumnsLayout>(null);
  const fileTree = useRef<ImperativeFileTree>(null);

  const settings = usePopupState({ variant: 'popper' });

  return (
    <ColumnsLayout
      ref={layout}
      left={
        <Stack sx={{ height: '100%', overflow: 'auto' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: (theme) => theme.zIndex.appBar,
              borderBottom: (theme) => `1px dashed ${theme.palette.grey[200]}`,
            }}>
            <Toolbar variant="dense">
              <Button
                startIcon={<MenuOpenRounded />}
                onClick={() => layout.current?.collapseLeft()}
                sx={{ [`.${buttonClasses.startIcon}`]: { ml: 0 }, flexShrink: 0 }}>
                Files
              </Button>

              <Box flex={1} />

              <IconButton disabled={disableMutation} color="primary" onClick={() => fileTree.current?.newFolder()}>
                <CreateNewFolderOutlined fontSize="small" />
              </IconButton>

              <IconButton disabled={disableMutation} color="primary" onClick={() => fileTree.current?.newFile()}>
                <AddRounded fontSize="small" />
              </IconButton>
            </Toolbar>
          </Box>

          <FileTree
            ref={fileTree}
            projectId={projectId}
            gitRef={gitRef}
            mutable={!disableMutation}
            current={filepath}
            onLaunch={assistant ? onLaunch : undefined}
            sx={{ flexGrow: 1 }}
          />
        </Stack>
      }
      right={
        <Stack sx={{ height: '100%' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: (theme) => theme.zIndex.appBar,
              borderBottom: (theme) => `1px dashed ${theme.palette.grey[200]}`,
            }}>
            <Toolbar variant="dense" sx={{ gap: 1 }}>
              <Tabs variant="fullWidth" value={0}>
                <Tab label="Debug" />
                <Tab label="Test" disabled />
                <Tab label="Discuss" disabled />
              </Tabs>

              <Box flex={1} />

              <Button
                startIcon={<MenuOpenRounded sx={{ transform: 'rotate(180deg)' }} />}
                onClick={() => layout.current?.collapseRight()}>
                Tools
              </Button>
            </Toolbar>
          </Box>

          {template && <DebugView projectId={projectId} gitRef={gitRef} template={template} />}
        </Stack>
      }>
      {({ leftOpen, rightOpen }) => (
        <Box sx={{ height: '100%', overflow: 'auto' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: (theme) => theme.zIndex.appBar,
              borderBottom: (theme) => `1px dashed ${theme.palette.grey[200]}`,
            }}>
            <Toolbar variant="dense">
              {!leftOpen && (
                <Button
                  startIcon={<MenuOpenRounded sx={{ transform: 'rotate(-180deg)' }} />}
                  onClick={() => (leftOpen ? layout.current?.collapseLeft() : layout.current?.expandLeft())}
                  sx={{ [`.${buttonClasses.startIcon}`]: { ml: 0 } }}>
                  Files
                </Button>
              )}

              <Box flex={1} />

              <IconButton
                {...bindTrigger(settings)}
                sx={{ bgcolor: settings.isOpen ? (theme) => theme.palette.action.selected : undefined }}>
                <TuneRounded />
              </IconButton>

              {template && (
                <Popper {...bindPopper(settings)} onClose={settings.close}>
                  <Paper elevation={3} sx={{ mt: -1, p: 4, maxWidth: 'sm', borderRadius: 3 }}>
                    <TemplateSettings projectId={projectId} gitRef={gitRef} value={template} />
                  </Paper>
                </Popper>
              )}

              {!rightOpen && (
                <Button
                  startIcon={<MenuOpenRounded />}
                  onClick={() => (rightOpen ? layout.current?.collapseRight() : layout.current?.expandRight())}>
                  Tools
                </Button>
              )}
            </Toolbar>
          </Box>

          <Box mx={{ xs: 3, sm: 4 }} my={{ xs: 1, sm: 2 }}>
            {!synced ? (
              <Box sx={{ textAlign: 'center', mt: 10 }}>
                <CircularProgress size={32} />
              </Box>
            ) : template ? (
              <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id]} onMount>
                <TemplateFormView projectId={projectId} gitRef={gitRef} value={template} />
              </WithAwareness>
            ) : id ? (
              <Alert color="error">Not Found</Alert>
            ) : null}
          </Box>
        </Box>
      )}
    </ColumnsLayout>
  );
}
