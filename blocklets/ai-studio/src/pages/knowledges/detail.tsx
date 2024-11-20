import { useKnowledge } from '@app/contexts/datasets/datasets';
import UploaderProvider, { useUploader } from '@app/contexts/uploader';
import { AIGNE_RUNTIME_MOUNT_POINT } from '@app/libs/constants';
import ColumnsLayout, { ImperativeColumnsLayout } from '@app/pages/project/columns-layout';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import ArrowLeftCircleIcon from '@iconify-icons/tabler/chevron-left';
import DatabaseIcon from '@iconify-icons/tabler/database';
import FileIcon from '@iconify-icons/tabler/file-text';
import SidebarLeft from '@iconify-icons/tabler/layout-sidebar';
import SidebarRight from '@iconify-icons/tabler/layout-sidebar-right';
import PencilIcon from '@iconify-icons/tabler/pencil';
import PlusIcon from '@iconify-icons/tabler/plus';
import SearchIcon from '@iconify-icons/tabler/search';
import {
  Box,
  Button,
  ButtonProps,
  CircularProgress,
  Divider,
  IconButton,
  InputBase,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  tabClasses,
  tabsClasses,
} from '@mui/material';
import { useRequest } from 'ahooks';
import bytes from 'bytes';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL, withQuery } from 'ufo';

import { refreshEmbedding } from '../../libs/dataset';
import EmptyDocuments from './document/empty';
import KnowledgeDocuments from './document/list';
import ImportKnowledge from './import';

function PanelToggleButton({
  placement,
  collapsed,
  ...props
}: ButtonProps & { placement: 'left' | 'right'; collapsed?: boolean }) {
  const { t } = useLocaleContext();

  return (
    <Tooltip title={collapsed ? t('showSidebar') : t('hideSidebar')}>
      <Button {...props} sx={{ minWidth: 0, flexShrink: 0, ...props.sx }}>
        <Box component={Icon} icon={placement === 'left' ? SidebarLeft : SidebarRight} fontSize={20} color="#3B82F6" />
      </Button>
    </Tooltip>
  );
}

export default function KnowledgeDetail() {
  const { knowledgeId } = useParams();
  if (!knowledgeId) throw new Error('knowledgeId not found');
  const layout = useRef<ImperativeColumnsLayout>(null);
  const { t } = useLocaleContext();
  const [currentTab, setCurrentTab] = useState('playground');
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { getKnowledge, getDocuments, deleteDocument } = useKnowledge();
  const navigate = useNavigate();

  const {
    data: knowledgeData,
    loading: knowledgeLoading,
    mutate: mutateKnowledge,
  } = useRequest(() => getKnowledge(knowledgeId), {
    refreshDeps: [knowledgeId],
    onSuccess: (data) => setShowImportDialog(!data?.docs),
  });

  const {
    data: document,
    loading: documentsLoading,
    mutate: mutateDocuments,
    run,
  } = useRequest((page = 1) => getDocuments(knowledgeId, { page, size: 10 }), { refreshDeps: [knowledgeId] });

  const runAsync = useCallback(async () => {
    const [newKnowledge, newDocuments] = await Promise.all([
      getKnowledge(knowledgeId),
      getDocuments(knowledgeId, { page: 1, size: 10 }),
    ]);

    mutateKnowledge(newKnowledge);
    mutateDocuments(newDocuments);
  }, []);

  const loading = knowledgeLoading || documentsLoading;
  return (
    <>
      <ColumnsLayout
        ref={layout}
        left={null}
        right={
          <Stack sx={{ display: 'flex', height: '100%' }}>
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderBottom: '1px solid #E5E7EB',
                zIndex: 10,
              }}>
              <Box
                className="between"
                sx={{
                  px: 2.5,
                  '.MuiTab-root': {
                    py: 1.5,
                    lineHeight: '24px',
                    fontWeight: 500,
                    fontSize: 14,

                    '&.Mui-selected': {
                      color: '#3B82F6',
                    },
                  },

                  '.MuiTabs-indicator': {
                    span: {
                      background: '#3B82F6 !important',
                    },
                  },
                }}>
                <Tabs
                  variant="scrollable"
                  scrollButtons={false}
                  value={currentTab}
                  onChange={(_, tab) => setCurrentTab(tab)}
                  TabIndicatorProps={{ children: <Box component="span" /> }}
                  sx={{
                    ml: -1,
                    minHeight: 32,
                    [`.${tabClasses.root}`]: {
                      py: 1,
                      px: 1,
                      minHeight: 32,
                      minWidth: 32,
                      borderRadius: 1,
                    },
                    [`.${tabsClasses.indicator}`]: {
                      bgcolor: 'transparent',

                      span: {
                        display: 'block',
                        mx: 1,
                        bgcolor: 'primary.main',
                        height: '100%',
                      },
                    },
                  }}>
                  <Tab value="playground" label={t('knowledge.playground')} data-testid="debug-preview-view" />
                </Tabs>

                <Box flex={1} />

                {/* <PanelToggleButton placement="right" collapsed={false} onClick={() => layout.current?.collapseRight()} /> */}
              </Box>
            </Box>

            <Suspense>{currentTab === 'playground' ? <PlaygroundView /> : null}</Suspense>
          </Stack>
        }>
        {({ leftOpen, rightOpen }) => (
          <Stack sx={{ height: '100%', overflow: 'auto' }}>
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                bgcolor: 'background.paper',
                zIndex: 10,
              }}>
              {(!leftOpen || !rightOpen) && (
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
              )}
            </Box>

            <Box flexGrow={1} overflow="hidden">
              <Stack p={2.5} height={1}>
                <Header
                  knowledgeId={knowledgeId}
                  title={knowledgeData?.name}
                  description={knowledgeData?.description}
                  docs={knowledgeData?.docs}
                  totalSize={knowledgeData?.totalSize}
                  icon={knowledgeData?.icon}
                  onAdd={() => setShowImportDialog(true)}
                  onBack={() => navigate(-1)}
                />

                {loading ? (
                  <Box flexGrow={1} className="center" width={1} height={1}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box flexGrow={1}>
                    {document?.items?.length ? (
                      <KnowledgeDocuments
                        knowledgeId={knowledgeId}
                        rows={document.items || []}
                        total={document.total ?? 0}
                        page={document.page ?? 1}
                        onChangePage={(page) => run(page)}
                        onRemove={async (documentId) => {
                          await deleteDocument(knowledgeId, documentId).catch((e) => Toast.error(e?.message));
                        }}
                        onRefetch={runAsync}
                        onEmbedding={(documentId) => refreshEmbedding(knowledgeId, documentId)}
                      />
                    ) : (
                      <EmptyDocuments />
                    )}
                  </Box>
                )}
              </Stack>
            </Box>
          </Stack>
        )}
      </ColumnsLayout>

      {showImportDialog && (
        <ImportKnowledge
          knowledgeId={knowledgeId}
          onClose={() => setShowImportDialog(false)}
          onSubmit={async () => {
            try {
              await runAsync();
              setShowImportDialog(false);
            } catch (error) {
              Toast.error(error?.message);
            }
          }}
        />
      )}
    </>
  );
}

const PlaygroundView = () => {
  const { t } = useLocaleContext();
  return (
    <Stack height={1}>
      <Box
        sx={{
          m: 2.5,
          display: 'flex',
          alignItems: 'center',
          bgcolor: '#F1F3F5',
          borderRadius: 1,
          gap: '8px',
          p: 1,
          mb: 0,
        }}>
        <InputBase
          placeholder="What is Arcblock and what are its key features?"
          sx={{
            flex: 1,
            fontSize: '14px',
            ml: 1,
            '& .MuiInputBase-input': {
              padding: '8px 0',
            },
          }}
        />
        <IconButton
          sx={{
            bgcolor: '#000',
            borderRadius: 1,
            padding: '8px 16px',
            color: '#fff',
            '&:hover': {
              bgcolor: '#000',
            },
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}>
          <Box component={Icon} icon={SearchIcon} fontSize={15} />
          <Box>{t('search')}</Box>
        </IconButton>
      </Box>
      <Box flexGrow={1} height={0} overflow="auto">
        <Box p={2.5} />
      </Box>
    </Stack>
  );
};

const Header = ({
  knowledgeId,
  title,
  description,
  docs,
  totalSize,
  icon,
  onBack,
  onAdd,
}: {
  knowledgeId: string;
  title?: string;
  description?: string;
  docs?: number;
  totalSize?: number;
  icon?: string;
  onBack: () => void;
  onAdd: () => void;
}) => {
  const { updateKnowledge } = useKnowledge();
  const { t } = useLocaleContext();

  const ref = useRef<{ title?: string; description?: string }>({ title, description });
  const [state, setState] = useState({ title: title || t('unnamed'), description });

  return (
    <UploaderProvider
      apiPathProps={{
        uploader: withQuery(joinURL(AIGNE_RUNTIME_MOUNT_POINT, '/api/datasets/upload-icon'), { knowledgeId }),
        disableMediaKitPrefix: true,
        disableAutoPrefix: true,
      }}
      restrictions={{
        maxFileSize: (Number(window.blocklet?.preferences?.uploadFileLimit) || 10) * 1024 * 1024,
      }}
      dashboardProps={{}}>
      <Stack gap={2.5}>
        <Stack
          direction="row"
          gap={0.5}
          alignItems="center"
          color="#3B82F6"
          sx={{ cursor: 'pointer' }}
          onClick={onBack}>
          <Box component={Icon} icon={ArrowLeftCircleIcon} fontSize={15} />
          <Typography>{t('back')}</Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="self-end">
          <Stack direction="row" gap={1}>
            <KnowledgeIcon knowledgeId={knowledgeId} icon={icon} />

            <Stack sx={{ alignSelf: 'flex-end' }}>
              <Typography
                placeholder={t('title')}
                variant="subtitle1"
                component={TextField}
                value={state.title}
                onChange={(e: any) => setState((prev) => ({ ...prev, title: e.target?.value }))}
                onBlur={async () => {
                  try {
                    if (state.title !== ref.current.title) {
                      await updateKnowledge(knowledgeId, { name: state.title });
                      ref.current.title = state.title;
                    }
                  } catch (error) {
                    Toast.error(error?.message);
                  }
                }}
                sx={{
                  '.MuiInputBase-root': {
                    border: 'none',
                    background: 'transparent !important',
                    width: '100%',

                    '&:focus': {
                      outline: 'none',
                    },

                    input: {
                      p: '0 !important',
                      color: '#030712',
                      lineHeight: '28px',
                      fontSize: 18,
                    },
                  },
                }}
              />

              <Typography
                placeholder={t('description')}
                variant="subtitle3"
                component={TextField}
                value={state.description}
                onChange={(e: any) => setState((prev) => ({ ...prev, description: e.target?.value }))}
                onBlur={async () => {
                  try {
                    if (state.description !== ref.current.description) {
                      await updateKnowledge(knowledgeId, { description: state.description });
                      ref.current.description = state.description;
                    }
                  } catch (error) {
                    Toast.error(error?.message);
                  }
                }}
                sx={{
                  '.MuiInputBase-root': {
                    border: 'none',
                    background: 'transparent !important',
                    width: '100%',

                    '&:focus': {
                      outline: 'none',
                    },

                    input: {
                      p: '0 !important',
                      color: '#4B5563',
                      fontSize: 13,
                      lineHeight: '20px',
                    },
                  },
                }}
              />
            </Stack>
          </Stack>

          <Stack direction="row" gap={1.25} alignItems="center" mt={2.5} color="#9CA3AF">
            <Stack direction="row" gap={0.5} alignItems="center">
              <Box component={Icon} icon={FileIcon} />
              <Typography variant="subtitle5">{`${docs || 0} ${t('knowledge.docs')}`}</Typography>
            </Stack>

            <Stack direction="row" gap={0.5} alignItems="center">
              <Box component={Icon} icon={DatabaseIcon} />
              <Typography variant="subtitle5">{bytes.format(totalSize || 0)}</Typography>
            </Stack>

            <Stack direction="row" gap={0.5} alignItems="center" sx={{ cursor: 'pointer' }} onClick={onAdd}>
              <Box component={Icon} icon={PlusIcon} sx={{ color: '#3B82F6', fontSize: 15 }} />
              <Typography variant="subtitle3" sx={{ color: '#3B82F6' }}>
                {`${t('add')}${t('knowledge.knowledge')}`}
              </Typography>
            </Stack>
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: '#EFF1F5' }} />
      </Stack>
    </UploaderProvider>
  );
};

const KnowledgeIcon = ({ knowledgeId, icon }: { knowledgeId: string; icon?: string }) => {
  const uploaderRef = useUploader();
  const [localIcon, setIcon] = useState<string | undefined>(icon);
  const url = joinURL(AIGNE_RUNTIME_MOUNT_POINT, `/api/datasets/${knowledgeId}/icon.png?icon=${localIcon}`);

  useEffect(() => {
    setIcon(icon);
  }, [icon]);

  return (
    <Box
      sx={{
        overflow: 'hidden',
        position: 'relative',
        '&:hover .edit-overlay': {
          opacity: 1,
        },
      }}>
      <Box
        className="center"
        sx={{
          width: 50,
          height: 50,
          background: '#F1F3F5',
          borderRadius: 1,

          img: {
            width: 1,
            height: 1,
            borderRadius: 1,
            objectFit: 'cover',
          },
        }}>
        {localIcon ? (
          <img
            src={url}
            alt="knowledge icon"
            onError={(e) => {
              console.log(123);
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as any).style.display = 'block';
              }
            }}
          />
        ) : null}
        <Typography fontSize={24} style={{ display: localIcon ? 'none' : 'block' }}>
          📖
        </Typography>
      </Box>

      <Box
        className="center edit-overlay"
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'action.disabled',
          borderRadius: 1,
          opacity: 0,
          transition: 'opacity 0.2s',
          cursor: 'pointer',
        }}
        onClick={() => {
          const uploader = uploaderRef?.current?.getUploader();
          uploader?.open();
          uploader.onceUploadSuccess(({ response }: any) => {
            setIcon(response?.data?.runtime?.hashFileName);
          });
        }}>
        <Box component={Icon} icon={PencilIcon} fontSize={15} sx={{ color: '#fff' }} />
      </Box>
    </Box>
  );
};
