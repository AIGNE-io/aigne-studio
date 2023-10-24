import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  Alert,
  Box,
  Button,
  ButtonProps,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  tabScrollButtonClasses,
} from '@mui/material';
import { useLocalStorageState, useRequest } from 'ahooks';
import equal from 'fast-deep-equal';
import cloneDeep from 'lodash/cloneDeep';
import differenceBy from 'lodash/differenceBy';
import intersectionBy from 'lodash/intersectionBy';
import isUndefined from 'lodash/isUndefined';
import omit from 'lodash/omit';
import omitBy from 'lodash/omitBy';
import pick from 'lodash/pick';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { TemplateYjs } from '../../../api/src/store/projects';
import WithAwareness from '../../components/awareness/with-awareness';
import TemplateFormView from '../../components/template-form';
import { useComponent } from '../../contexts/component';
import { useReadOnly } from '../../contexts/session';
import { getTemplates } from '../../libs/template';
import ColumnsLayout, { ImperativeColumnsLayout } from './columns-layout';
import DebugView from './debug-view';
import DiscussView from './discuss-view';
import FileTree, { ImperativeFileTree } from './file-tree';
import Add from './icons/add';
import DeveloperTools from './icons/developer-tools';
import Empty from './icons/empty';
import FolderAdd from './icons/folder-add';
import Import from './icons/import';
import PanelLeft from './icons/panel-left';
import PanelRight from './icons/panel-right';
import SettingView from './setting-view';
import { useProjectState } from './state';
import TestView from './test-view';
import { TokenUsage } from './token-usage';
import { isTemplate, templateYjsFromTemplate, useStore } from './yjs-state';

const defaultBranch = 'main';

const PREVIOUS_FILE_PATH = (projectId: string) => `ai-studio.previousFilePath.${projectId}`;
const CURRENT_TAB = (projectId: string) => `ai-studio.currentTab.${projectId}`;

const useProjects = (projectId: string, ref: string) => {
  const { data } = useRequest(() => getTemplates(projectId, ref), { refreshDeps: [projectId, ref] });
  const templates = (data?.templates || []).map((i) =>
    omit(omitBy(templateYjsFromTemplate(i), isUndefined), 'ref', 'projectId')
  );

  const { store } = useStore(projectId, ref, true);

  const files = Object.values(cloneDeep(store.files)).filter((x) => (x as TemplateYjs)?.id);

  const news = useMemo(() => {
    return differenceBy(files, templates, 'id');
  }, [files, templates]);

  const deleted = useMemo(() => {
    return differenceBy(templates, files, 'id');
  }, [files, templates]);

  const modify = useMemo(() => {
    const duplicateItems = intersectionBy(templates, files, 'id');

    const keys = [
      'id',
      'createdBy',
      'updatedBy',
      'name',
      'description',
      'tags',
      'prompts',
      'parameters',
      'mode',
      'status',
      'public',
      'datasets',
      'next',
      'tests',
    ];

    return duplicateItems.filter((i) => {
      const item = omitBy(pick(i, ...keys), isUndefined);
      const found = files.find((f) => item.id === (f as TemplateYjs)?.id);
      if (!found) {
        return false;
      }
      const file = omitBy(pick(found, ...keys), isUndefined);

      return !equal(item, file);
    });
  }, [files, templates]);

  console.log({ news, deleted, modify });

  return { news, deleted, modify };
};

export default function ProjectPage() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const { t } = useLocaleContext();

  const { store, synced } = useStore(projectId, gitRef, true);

  useProjects(projectId, gitRef);

  const id = Object.entries(store.tree).find((i) => i[1] === filepath)?.[0];
  const file = id ? store.files[id] : undefined;
  const template = isTemplate(file) ? file : undefined;

  const {
    state: { error },
    refetch,
  } = useProjectState(projectId, gitRef);
  if (error) throw error;

  useEffect(() => {
    refetch();
  }, [refetch]);

  const readOnly = useReadOnly({ ref: gitRef });

  const location = useLocation();
  const navigate = useNavigate();

  const [currentTab, setCurrentTab] = useLocalStorageState(CURRENT_TAB(projectId), { defaultValue: 'debug' });

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
    else {
      const first = Object.values(store.tree)[0];
      if (first) navigate(first, { replace: true });
    }
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
            <Toolbar variant="dense" sx={{ px: { xs: 1 } }}>
              <PanelToggleButton placement="left" collapsed={false} onClick={() => layout.current?.collapseLeft()} />

              <Box flex={1} />

              <Tooltip title={t('newObject', { object: t('folder') })}>
                <span>
                  <Button disabled={readOnly} sx={{ minWidth: 0 }} onClick={() => fileTree.current?.newFolder()}>
                    <FolderAdd />
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title={t('newObject', { object: t('file') })}>
                <span>
                  <Button disabled={readOnly} sx={{ minWidth: 0 }} onClick={() => fileTree.current?.newFile()}>
                    <Add />
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title={t('import.title')}>
                <span>
                  <Button disabled={readOnly} sx={{ minWidth: 0 }} onClick={() => fileTree.current?.importFrom()}>
                    <Import />
                  </Button>
                </span>
              </Tooltip>
            </Toolbar>
          </Box>

          <FileTree
            ref={fileTree}
            projectId={projectId}
            gitRef={gitRef}
            mutable={!readOnly}
            current={filepath}
            onLaunch={assistant ? onLaunch : undefined}
            sx={{ flexGrow: 1 }}
          />
        </Stack>
      }
      right={
        <Stack sx={{ height: '100%', overflow: 'auto' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: (theme) => theme.zIndex.appBar,
              borderBottom: (theme) => `1px dashed ${theme.palette.grey[200]}`,
            }}>
            <Toolbar variant="dense" sx={{ gap: 1, px: { xs: 1 } }}>
              <Tabs
                variant="scrollable"
                value={currentTab}
                onChange={(_, tab) => setCurrentTab(tab)}
                sx={{
                  [`.${tabScrollButtonClasses.disabled}`]: {
                    opacity: 1,
                    color: (theme) => theme.palette.action.disabled,
                  },
                }}>
                <Tab value="setting" label={t('setting')} />
                <Tab value="debug" label={t('debug')} />
                <Tab value="test" label={t('test')} />
                <Tab value="discuss" label={t('discuss')} />
              </Tabs>

              <Box flex={1} />

              <PanelToggleButton placement="right" collapsed={false} onClick={() => layout.current?.collapseRight()} />
            </Toolbar>
          </Box>

          {!template ? (
            <DebugEmptyView />
          ) : currentTab === 'setting' ? (
            <SettingView projectId={projectId} gitRef={gitRef} template={template} />
          ) : currentTab === 'debug' ? (
            <DebugView projectId={projectId} gitRef={gitRef} template={template} setCurrentTab={setCurrentTab} />
          ) : currentTab === 'test' ? (
            <TestView projectId={projectId} gitRef={gitRef} template={template} setCurrentTab={setCurrentTab} />
          ) : currentTab === 'discuss' ? (
            <DiscussView projectId={projectId} gitRef={gitRef} template={template} />
          ) : null}
        </Stack>
      }>
      {({ leftOpen, rightOpen }) => (
        <Stack sx={{ height: '100%', overflow: 'auto' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: (theme) => theme.zIndex.appBar,
              borderBottom: (theme) => `1px dashed ${theme.palette.grey[200]}`,
            }}>
            <Toolbar variant="dense" sx={{ px: { xs: 1 } }}>
              {!leftOpen && (
                <PanelToggleButton
                  placement="left"
                  collapsed
                  onClick={() => (leftOpen ? layout.current?.collapseLeft() : layout.current?.expandLeft())}
                />
              )}

              <Box flex={1} />

              {!rightOpen && (
                <PanelToggleButton
                  placement="right"
                  collapsed
                  onClick={() => (rightOpen ? layout.current?.collapseRight() : layout.current?.expandRight())}
                />
              )}
            </Toolbar>
          </Box>

          <Box m={{ xs: 2 }} flexGrow={1}>
            {!synced ? (
              <Box sx={{ textAlign: 'center', mt: 10 }}>
                <CircularProgress size={32} />
              </Box>
            ) : template ? (
              <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id]} onMount>
                <TemplateFormView projectId={projectId} gitRef={gitRef} value={template} />
              </WithAwareness>
            ) : filepath ? (
              <Alert color="error">Not Found</Alert>
            ) : (
              <EmptyView />
            )}
          </Box>

          {template && (
            <Box
              sx={{
                position: 'sticky',
                bottom: 0,
                bgcolor: 'background.paper',
                zIndex: (theme) => theme.zIndex.appBar,
                borderTop: (theme) => `1px dashed ${theme.palette.grey[200]}`,
              }}>
              <Toolbar variant="dense" sx={{ px: { xs: 1 } }}>
                <TokenUsage template={template} />
                <Box />
              </Toolbar>
            </Box>
          )}
        </Stack>
      )}
    </ColumnsLayout>
  );
}

function PanelToggleButton({
  placement,
  collapsed,
  ...props
}: ButtonProps & { placement: 'left' | 'right'; collapsed?: boolean }) {
  const { t } = useLocaleContext();

  return (
    <Tooltip title={collapsed ? t('showSidebar') : t('hideSidebar')}>
      <Button {...props} sx={{ minWidth: 0, flexShrink: 0, ...props.sx }}>
        {placement === 'left' ? <PanelLeft /> : <PanelRight />}
      </Button>
    </Tooltip>
  );
}

function EmptyView() {
  const { t } = useLocaleContext();

  return (
    <Stack color="text.disabled" alignItems="center" my={8} gap={3}>
      <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
      <Typography variant="body2">{t('notOpenFile')}</Typography>
    </Stack>
  );
}

function DebugEmptyView() {
  const { t } = useLocaleContext();

  return (
    <Stack color="text.disabled" alignItems="center" my={8} gap={3}>
      <DeveloperTools sx={{ fontSize: 54, color: 'grey.300' }} />
      <Typography variant="body2">{t('notOpenFile')}</Typography>
    </Stack>
  );
}
