// import MdViewer from '@app/components/md-viewer';
import { useKnowledge } from '@app/contexts/knowledge/knowledge';
import UploaderProvider, { useUploader } from '@app/contexts/uploader';
import useSubscription from '@app/hooks/use-subscription';
import { getErrorMessage } from '@app/libs/api';
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
import { useLocalStorageState, useReactive, useRequest, useUpdate } from 'ahooks';
import bytes from 'bytes';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL, withQuery } from 'ufo';

import { refreshEmbedding, searchKnowledge } from '../../libs/knowledge';
import EmptyDocuments from './document/empty';
import KnowledgeDocuments, { DocumentIcon } from './document/list';
import ImportKnowledge from './import';

function PanelToggleButton({
  placement,
  collapsed = undefined,
  ...props
}: ButtonProps & { placement: 'left' | 'right'; collapsed?: boolean }) {
  const { t } = useLocaleContext();

  return (
    <Tooltip title={collapsed ? t('showSidebar') : t('hideSidebar')}>
      <Button {...props} sx={{ minWidth: 0, flexShrink: 0, ...props.sx }}>
        <Box
          component={Icon}
          icon={placement === 'left' ? SidebarLeft : SidebarRight}
          sx={{
            fontSize: 20,
            color: 'info.main',
          }}
        />
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
  const [editDocumentId, setEditDocumentId] = useState<string | undefined>(undefined);

  const { getKnowledge, getDocuments, deleteDocument } = useKnowledge();
  const navigate = useNavigate();
  const embeddings = useReactive<{ [key: string]: { [key: string]: any } }>({});

  const {
    data: knowledgeData,
    loading: knowledgeLoading,
    mutate: mutateKnowledge,
  } = useRequest(() => getKnowledge(knowledgeId), {
    refreshDeps: [knowledgeId],
    onSuccess: (data) => setShowImportDialog(!data?.docs),
    onError: (e) => Toast.error(getErrorMessage(e)),
  });

  const {
    data: document,
    loading: documentsLoading,
    mutate: mutateDocuments,
    run,
  } = useRequest((page = 1) => getDocuments(knowledgeId, { page, size: 10 }), {
    refreshDeps: [knowledgeId],
    onError: (e) => Toast.error(getErrorMessage(e)),
  });

  const runAsync = useCallback(async () => {
    const [newKnowledge, newDocuments] = await Promise.all([
      getKnowledge(knowledgeId),
      getDocuments(knowledgeId, { page: 1, size: 10 }),
    ]);

    mutateKnowledge(newKnowledge);
    mutateDocuments(newDocuments);
  }, []);

  const sub = useSubscription(knowledgeId);
  useEffect(() => {
    const fn = (data: { response: { eventType: string; documentId: string; [key: string]: any } }) => {
      const value = data.response;

      if (value) {
        switch (value.eventType) {
          case 'change': {
            embeddings[value.documentId] = value;
            break;
          }
          case 'complete': {
            embeddings[value.documentId] = value;
            break;
          }
          case 'error': {
            embeddings[value.documentId] = value;
            Toast.error(value.error);
            break;
          }
          default:
            console.warn('Unsupported event', value);
        }
      }
    };

    if (sub) {
      sub.on('embedding-change', fn);
    }

    return () => {
      if (sub) {
        sub.off('embedding-change', fn);
      }
    };
  }, [sub, knowledgeId]);

  const loading = knowledgeLoading || documentsLoading;
  const disabled = knowledgeData?.resourceBlockletDid && knowledgeData?.knowledgeId;
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
                borderBottom: '1px solid',
                borderColor: 'divider',
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
                      color: 'primary.main',
                    },
                  },

                  '.MuiTabs-indicator': {
                    span: {
                      background: (theme) => `${theme.palette.primary.main} !important`,
                    },
                  },
                }}>
                <Tabs
                  variant="scrollable"
                  scrollButtons={false}
                  value={currentTab}
                  onChange={(_, tab) => setCurrentTab(tab)}
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
                  }}
                  slotProps={{
                    indicator: { children: <Box component="span" /> },
                  }}>
                  <Tab value="playground" label={t('knowledge.playground')} data-testid="debug-preview-view" />
                </Tabs>

                <Box
                  sx={{
                    flex: 1,
                  }}
                />

                {/* <PanelToggleButton placement="right" collapsed={false} onClick={() => layout.current?.collapseRight()} /> */}
              </Box>
            </Box>

            <Suspense>{currentTab === 'playground' ? <PlaygroundView knowledgeId={knowledgeId} /> : null}</Suspense>
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

                  <Box
                    sx={{
                      flex: 1,
                    }}
                  />

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

            <Box
              sx={{
                flexGrow: 1,
                overflow: 'hidden',
              }}>
              <Stack
                sx={{
                  p: 2.5,
                  height: 1,
                }}>
                <Header
                  knowledgeId={knowledgeId}
                  disabled={loading ? true : Boolean(disabled)}
                  title={loading ? '' : knowledgeData?.name}
                  description={loading ? '' : knowledgeData?.description}
                  docs={loading ? 0 : knowledgeData?.docs}
                  totalSize={loading ? 0 : knowledgeData?.totalSize}
                  icon={loading ? '' : knowledgeData?.icon}
                  onAdd={() => setShowImportDialog(true)}
                  onBack={() => navigate('../')}
                />

                {loading ? (
                  <Box
                    className="center"
                    sx={{
                      flexGrow: 1,
                      width: 1,
                      height: 1,
                    }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      flexGrow: 1,
                    }}>
                    {document?.items?.length ? (
                      <KnowledgeDocuments
                        disabled={Boolean(disabled)}
                        rows={document.items || []}
                        total={document.total ?? 0}
                        page={document.page ?? 1}
                        onChangePage={(page) => run(page)}
                        onRemove={(documentId) =>
                          deleteDocument(knowledgeId, documentId).catch((e) => Toast.error(e?.message))
                        }
                        onRefetch={runAsync}
                        onEmbedding={(documentId) => refreshEmbedding(knowledgeId, documentId)}
                        embeddings={embeddings}
                        onEdit={(documentId) => {
                          setEditDocumentId(documentId);
                          setShowImportDialog(true);
                        }}
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
      {showImportDialog && !disabled && (
        <ImportKnowledge
          documentId={editDocumentId}
          knowledgeId={knowledgeId}
          onClose={() => {
            setEditDocumentId(undefined);
            setShowImportDialog(false);
          }}
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

const PlaygroundView = ({ knowledgeId }: { knowledgeId: string }) => {
  const { t } = useLocaleContext();
  const [search, setSearch] = useLocalStorageState<string>(`knowledge-${knowledgeId}-search`);
  const [data, setData] = useLocalStorageState<{ docs: { content: any; metadata: any }[] }>(
    `knowledge-${knowledgeId}-data`
  );
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  const { loading, runAsync } = useRequest(
    async (s: string) => {
      const results = await searchKnowledge({ knowledgeId, message: s });
      setData(results);
      return results;
    },
    {
      manual: true,
      refreshDeps: [],
      onError: (e) => Toast.error(getErrorMessage(e)),
    }
  );

  const results = (data?.docs || [])
    .map((doc) => {
      try {
        const parsedContent = JSON.parse(doc.content);

        if (typeof parsedContent.content === 'string') {
          try {
            const content = JSON.parse(parsedContent.content);

            return {
              content: content?.content || content,
              metadata: doc.metadata,
            };
          } catch (e) {
            return {
              content: parsedContent.content,
              metadata: doc.metadata,
            };
          }
        }

        return {
          content: parsedContent.content,
          metadata: doc.metadata,
        };
      } catch (err) {
        return doc;
      }
    })
    .filter((x) => x?.content);

  return (
    <Stack
      sx={{
        height: 1,
      }}>
      <Box
        component="form"
        onSubmit={async (e) => {
          try {
            e.preventDefault();
            await runAsync(search!);
            setLoaded(true);
          } catch (error) {
            Toast.error(error?.message);
          }
        }}
        sx={{
          m: 2.5,
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'grey.100',
          borderRadius: 1,
          gap: '8px',
          p: 1,
          mb: 0,
        }}>
        <InputBase
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
          disabled={!search}
          sx={{
            bgcolor: 'primary.main',
            borderRadius: 1,
            padding: '8px 16px',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.main',
            },
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
          onClick={async (e) => {
            try {
              e.preventDefault();
              await runAsync(search!);
              setLoaded(true);
            } catch (error) {
              Toast.error(error?.message);
            }
          }}>
          <Box
            component={Icon}
            icon={SearchIcon}
            sx={{
              fontSize: 15,
            }}
          />
          <Box>{t('search')}</Box>
        </IconButton>
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          height: 0,
          overflow: 'auto',
        }}>
        {loading ? (
          <Box
            className="center"
            sx={{
              width: 1,
              height: 1,
            }}>
            <CircularProgress size={20} />
          </Box>
        ) : results.length ? (
          <Box
            sx={{
              px: 2.5,
            }}>
            {results.map((result, index) => {
              const title = result?.metadata?.document?.name || result?.metadata?.metadata?.title;
              const relevanceScore = result?.metadata?.metadata?.relevanceScore;

              return (
                <Box
                  key={index}
                  onClick={() => {
                    if (!result?.metadata?.document?.id) return;
                    navigate(joinURL('document', result?.metadata?.document?.id, 'segments'));
                  }}
                  sx={{
                    py: 2.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    cursor: result?.metadata?.document?.id ? 'pointer' : 'default',

                    pre: {
                      border: '1px solid',
                      borderColor: 'divider',
                      borderTop: 0,
                      whiteSpace: 'pre-wrap',
                    },

                    h4: {
                      marginBottom: 1,
                    },

                    'div > p': {
                      padding: 0,
                    },
                  }}>
                  <Box>
                    {(typeof result.content === 'string'
                      ? result.content
                      : JSON.stringify(result.content, null, 2)
                    ).replace(/\\n+/g, '<br />')}
                  </Box>
                  {title && (
                    <Stack
                      sx={{
                        width: 'fit-content',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 1,
                        mt: 1.5,
                        py: 1,
                        px: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}>
                      <Stack
                        direction="row"
                        sx={{
                          gap: 1,
                          alignItems: 'center',
                          flex: 1,
                        }}>
                        <DocumentIcon document={result.metadata.document} />
                        <Box
                          sx={{
                            flexGrow: 1,
                            color: 'text.primary',
                          }}>
                          {title}
                        </Box>
                      </Stack>

                      {!!relevanceScore && (
                        <>
                          <Divider orientation="vertical" variant="middle" flexItem sx={{ my: 0.5 }} />

                          <Stack
                            direction="row"
                            sx={{
                              gap: 1,
                              alignItems: 'center',
                            }}>
                            <Typography
                              sx={{
                                fontSize: 13,
                                color: result?.metadata?.metadata?.relevanceScore > 0.5 ? 'success.main' : 'error.main',
                              }}>
                              {Number((result?.metadata?.metadata?.relevanceScore || 0) * 100).toFixed(2)}%
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t('similarity')}</Typography>
                          </Stack>
                        </>
                      )}
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box
            className="center"
            sx={{
              width: 1,
              height: 1,
            }}>
            {loaded ? <Typography variant="subtitle3">{t('noResults')}</Typography> : null}
          </Box>
        )}
      </Box>
    </Stack>
  );
};

const Header = ({
  disabled,
  knowledgeId,
  title = undefined,
  description = undefined,
  docs = undefined,
  totalSize = undefined,
  icon = undefined,
  onBack,
  onAdd,
}: {
  disabled: boolean;
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

  useEffect(() => {
    setState({ title: title || t('unnamed'), description });
  }, [title, description, t]);

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
      <Stack
        sx={{
          gap: 2.5,
        }}>
        <Stack
          direction="row"
          onClick={onBack}
          sx={{
            gap: 0.5,
            alignItems: 'center',
            color: 'primary.main',
            cursor: 'pointer',
          }}>
          <Box
            component={Icon}
            icon={ArrowLeftCircleIcon}
            sx={{
              fontSize: 15,
            }}
          />
          <Typography>{t('back')}</Typography>
        </Stack>

        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'self-end',
          }}>
          <Stack
            direction="row"
            sx={{
              gap: 1,
            }}>
            <KnowledgeIcon knowledgeId={knowledgeId} icon={icon} disabled={disabled} />

            <Stack sx={{ alignSelf: 'flex-end' }}>
              <Typography
                inputProps={{ readOnly: disabled }}
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
                      color: 'text.primary',
                      lineHeight: '28px',
                      fontSize: 18,
                    },
                  },
                }}
              />

              <Typography
                inputProps={{ readOnly: disabled }}
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
                      color: 'text.secondary',
                      fontSize: 13,
                      lineHeight: '20px',
                    },
                  },
                }}
              />
            </Stack>
          </Stack>

          <Stack
            direction="row"
            sx={{
              gap: 1.25,
              alignItems: 'center',
              mt: 2.5,
              color: 'text.secondary',
            }}>
            <Stack
              direction="row"
              sx={{
                gap: 0.5,
                alignItems: 'center',
              }}>
              <Box component={Icon} icon={FileIcon} />
              <Typography variant="subtitle5">{`${docs || 0} ${t('knowledge.docs')}`}</Typography>
            </Stack>

            <Stack
              direction="row"
              sx={{
                gap: 0.5,
                alignItems: 'center',
              }}>
              <Box component={Icon} icon={DatabaseIcon} />
              <Typography variant="subtitle5">{bytes.format(totalSize || 0)}</Typography>
            </Stack>

            {!disabled && (
              <Stack
                direction="row"
                onClick={onAdd}
                sx={{
                  gap: 0.5,
                  alignItems: 'center',
                  cursor: 'pointer',
                }}>
                <Box component={Icon} icon={PlusIcon} sx={{ color: 'primary.main', fontSize: 15 }} />
                <Typography variant="subtitle3" sx={{ color: 'primary.main' }}>
                  {t('addObject', { object: t('knowledge.knowledge') })}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Stack>

        <Divider />
      </Stack>
    </UploaderProvider>
  );
};

const KnowledgeIcon = ({
  knowledgeId,
  icon = undefined,
  disabled,
}: {
  knowledgeId: string;
  icon?: string;
  disabled: boolean;
}) => {
  const uploaderRef = useUploader();
  const [localIcon, setIcon] = useState<string | undefined>(icon);
  const url = joinURL(AIGNE_RUNTIME_MOUNT_POINT, `/api/datasets/${knowledgeId}/icon.png?icon=${localIcon}`);
  const update = useUpdate();
  const { updateKnowledge } = useKnowledge();

  useEffect(() => setIcon(icon), [icon, knowledgeId]);

  return (
    <Box
      sx={{
        overflow: 'hidden',
        position: 'relative',
        '&:hover .edit-overlay': { opacity: disabled ? 0 : 1 },
      }}>
      <Box
        className="center"
        sx={{
          width: 50,
          height: 50,
          bgcolor: 'grey.50',
          borderRadius: 1,

          img: {
            width: 1,
            height: 1,
            borderRadius: 1,
            objectFit: 'cover',
          },
        }}>
        {localIcon ? (
          <Box
            component="img"
            src={url}
            alt="knowledge icon"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as any).style.display = 'block';
              }
            }}
          />
        ) : null}
        <Typography
          style={{ display: localIcon ? 'none' : 'block' }}
          sx={{
            fontSize: 24,
          }}>
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
          if (disabled) return;
          const uploader = uploaderRef?.current?.getUploader();
          uploader?.open();
          uploader.onceUploadSuccess(async ({ response }: any) => {
            const hashFileName = response?.data?.runtime?.hashFileName;
            await updateKnowledge(knowledgeId, { icon: hashFileName }).catch(() => {});
            setIcon(hashFileName);
            update();
          });
        }}>
        <Box
          component={Icon}
          icon={PencilIcon}
          sx={{
            fontSize: 15,
            color: 'text.contrast',
          }}
        />
      </Box>
    </Box>
  );
};
