import LoadingButton from '@app/components/loading/loading-button';
import { useIsAdmin } from '@app/contexts/session';
import useSubscription from '@app/hooks/use-subscription';
import { getErrorMessage } from '@app/libs/api';
import { AIGNE_RUNTIME_MOUNT_POINT } from '@app/libs/constants';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/aigne-sdk/constants';
import { AddComponent } from '@blocklet/ui-react/lib/ComponentManager';
import { Icon } from '@iconify-icon/react';
import DatabaseIcon from '@iconify-icons/tabler/database';
import FileIcon from '@iconify-icons/tabler/file-text';
import XIcon from '@iconify-icons/tabler/x';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  StackProps,
  Theme,
  Tooltip,
  Typography,
  styled,
  useMediaQuery,
} from '@mui/material';
import { useRequest } from 'ahooks';
import bytes from 'bytes';
import dayjs from 'dayjs';
import { usePopupState } from 'material-ui-popup-state/hooks';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useFetchKnowledgeList, useKnowledge } from '../../contexts/knowledge/knowledge';
import backgroundIcon from '../../icons/background.png?url';
import checkDisabledIcon from '../../icons/check-disabled.svg?url';
import checkBoxIcon from '../../icons/check.svg?url';
import type { KnowledgeCard as KnowledgeCardType } from '../../libs/knowledge';
import PopperMenuButton from '../project/menu-button';

export default function Knowledge() {
  const { projectId } = useParams();
  if (!projectId) throw new Error('projectId not Found');

  const { dialog, showDialog } = useDialog();
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog' });
  const { createKnowledge, getResourcesKnowledgeList, deleteKnowledge } = useKnowledge();
  const { loadingRef, dataState } = useFetchKnowledgeList(projectId);
  const navigate = useNavigate();
  const list = dataState?.data?.list || [];

  const onCreate = useCallback(async () => {
    try {
      const knowledge = await createKnowledge({ projectId });
      dataState.reload();
      navigate(`./${knowledge.id}`);
    } catch (error) {
      Toast.error(error.message);
    }
  }, [navigate, projectId]);

  const sub = useSubscription('resourceEvent');
  useEffect(() => {
    if (sub) {
      sub.on('component.update', async () => {
        await getResourcesKnowledgeList();
        dataState.reload();
      });
    }

    return () => {
      sub?.off('component.update');
    };
  }, [sub]);

  return (
    <>
      <Stack
        sx={{
          p: 2.5,
          height: 1,
          overflow: 'auto',
        }}>
        <ListContainer gap={2.5}>
          <CreateCard onImport={dialogState.open} onCreate={onCreate} />

          {list.map((item) => {
            return (
              <Tooltip key={item.id} title={item.installed ? undefined : 'This knowledge is not installed'}>
                <CardContainer height={400} sx={{ border: item.installed ? undefined : '1px solid #BE123C' }}>
                  <KnowledgeCard
                    emoji="📖"
                    title={item.name || t('unnamed')}
                    description={item.description || ''}
                    docsCount={item.docs ?? 0}
                    size={item.totalSize}
                    author={item.user.fullName}
                    authorAvatar={item.user.avatar}
                    date={item.createdAt?.toLocaleString()}
                    knowledgeId={item.id}
                    icon={item.icon}
                    disabled={!item.installed}
                    onClick={() => item.installed && navigate(`./${item.id}`)}
                    action={
                      <PopperMenuButton
                        component={IconButton}
                        PopperProps={{ placement: 'bottom-start', sx: { zIndex: 'snackbar' } }}
                        menus={
                          <MenuItem
                            color="error"
                            sx={{ color: '#E11D48' }}
                            onClick={(e) => {
                              e.stopPropagation();

                              showDialog({
                                formSx: {
                                  '.MuiDialogTitle-root': {
                                    border: 0,
                                  },
                                  '.MuiDialogActions-root': {
                                    border: 0,
                                  },
                                  '.save': {
                                    background: '#d32f2f',
                                  },
                                },
                                maxWidth: 'sm',
                                fullWidth: true,
                                title: (
                                  <Box sx={{ wordWrap: 'break-word' }}>
                                    {t('knowledge.deleteTitle', { object: t('knowledge.knowledgeBase') })}
                                  </Box>
                                ),
                                content: (
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontWeight: 500,
                                        fontSize: 16,
                                        lineHeight: '28px',
                                        color: '#4B5563',
                                      }}>
                                      {t('knowledge.deleteDescription')}
                                    </Typography>
                                  </Box>
                                ),
                                okText: t('alert.delete'),
                                okColor: 'error',
                                cancelText: t('cancel'),
                                onOk: async () => {
                                  try {
                                    await deleteKnowledge(item.id);
                                    dataState.reload();
                                  } catch (error) {
                                    Toast.error(error.message);
                                  }
                                },
                              });
                            }}>
                            {t('delete')}
                          </MenuItem>
                        }
                        sx={{ fontSize: 20, color: '#9CA3AF', cursor: 'pointer', p: '4px' }}>
                        <Icon icon="tabler:dots" />
                      </PopperMenuButton>
                    }
                  />
                </CardContainer>
              </Tooltip>
            );
          })}
        </ListContainer>

        {(dataState.loadingMore || dataState?.data?.next) && (
          <Box
            className="center"
            ref={loadingRef}
            sx={{
              width: 1,
              height: 60,
            }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
              }}>
              <CircularProgress size={24} />
            </Box>
          </Box>
        )}
      </Stack>
      <SelectKnowledgeModal
        list={list}
        open={dialogState.isOpen}
        onClose={() => dialogState.close()}
        onConfirm={() => {
          dataState.reload();
          dialogState.close();
        }}
      />
      {dialog}
    </>
  );
}

const CreateCard = ({ onImport, onCreate }: { onImport: () => void; onCreate: () => void }) => {
  const { t } = useLocaleContext();
  return (
    <CreateKnowledgeContainer>
      <Box className="image">
        <Box
          component="img"
          src={backgroundIcon}
          sx={{
            width: 1,
            height: 1,
          }}
        />
      </Box>
      <Box className="shadow" />
      <Stack
        className="button"
        sx={{
          p: 2.5,
          gap: 1,
        }}>
        <LoadingButton variant="contained" size="large" onClick={onCreate} sx={{ fontSize: 16 }}>
          {t('createObject', { object: t('knowledge.knowledgeBase') })}
        </LoadingButton>
        <Button variant="outlined" size="large" onClick={onImport} sx={{ fontSize: 16 }}>
          {t('importObject', { object: t('knowledge.knowledgeBase') })}
        </Button>
      </Stack>
    </CreateKnowledgeContainer>
  );
};

const KnowledgeCard = ({
  emoji,
  title,
  description,
  docsCount,
  size,
  author,
  authorAvatar,
  date,
  maxLineClamp = 10,
  disabled = undefined,
  icon = undefined,
  knowledgeId = undefined,
  action = undefined,
  ...props
}: {
  emoji: string;
  title: string;
  description: string;
  docsCount: number;
  size: number;
  author: string;
  authorAvatar: string;
  date: string;
  disabled?: boolean;
  maxLineClamp?: number;
  icon?: string;
  knowledgeId?: string;
  action?: ReactNode;
} & StackProps) => {
  const { t } = useLocaleContext();
  const url = joinURL(AIGNE_RUNTIME_MOUNT_POINT, `/api/datasets/${knowledgeId}/icon.png?icon=${icon}`);

  return (
    <Stack
      {...props}
      sx={[
        {
          p: 2,
          height: 1,
          width: 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.8 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        },
        ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
      ]}>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          width: 1,
        }}>
        <Box
          className="center"
          sx={{
            width: 48,
            height: 48,
            background: '#F1F3F5',
            borderRadius: 1,

            img: {
              width: 1,
              height: 1,
              borderRadius: 1,
              objectFit: 'cover',
            },
          }}>
          {icon ? (
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
            style={{ display: icon ? 'none' : 'block' }}
            sx={{
              fontSize: 24,
            }}>
            {emoji}
          </Typography>
        </Box>

        {action}
      </Stack>
      <Box
        className="center"
        sx={{
          height: 40,
          justifyContent: 'flex-start',
        }}
      />
      <Stack
        sx={{
          flex: 1,
          height: 0,
          gap: 0.5,
          justifyContent: 'flex-start',
        }}>
        <Typography
          sx={{
            fontWeight: 600,
            lineHeight: '28px',
            fontSize: 18,
            wordBreak: 'break-word',
          }}>
          {title || t('unnamed')}
        </Typography>

        {description && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: maxLineClamp,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
            }}>
            {description}
          </Typography>
        )}
      </Stack>
      <Stack
        direction="row"
        sx={{
          gap: 1.25,
          alignItems: 'center',
          mt: 2.5,
          color: '#9CA3AF',
        }}>
        <Stack
          direction="row"
          sx={{
            gap: 0.5,
            alignItems: 'center',
          }}>
          <Box component={Icon} icon={FileIcon} />
          <Typography variant="caption">{`${docsCount} ${t('knowledge.docs')}`}</Typography>
        </Stack>

        <Stack
          direction="row"
          sx={{
            gap: 0.5,
            alignItems: 'center',
          }}>
          <Box component={Icon} icon={DatabaseIcon} />
          <Typography variant="caption">{bytes.format(size)}</Typography>
        </Stack>
      </Stack>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1.25,
        }}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            gap: 0.75,
            flex: 1,
            width: 0,
          }}>
          <Box
            component="img"
            src={authorAvatar}
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
          <Typography variant="subtitle5" className="ellipsis">
            {author}
          </Typography>
        </Stack>
        {date && <Typography variant="subtitle5">{dayjs(date).format('YYYY-MM-DD')}</Typography>}
      </Stack>
    </Stack>
  );
};

const separator = '---&&&---';
const SelectKnowledgeModal = (
  props: DialogProps & { onClose: () => void; onConfirm: () => void; list: KnowledgeCardType[] }
) => {
  const { projectId } = useParams();
  if (!projectId) throw new Error('projectId not Found');
  const { t } = useLocaleContext();
  const { getResourcesKnowledgeList, createDatasetFromResources, resources, resourceLoading } = useKnowledge();
  const isAdmin = useIsAdmin();
  const addComponentRef = useRef<{ onClick?: () => void; loading?: boolean }>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (props.open) {
      getResourcesKnowledgeList();
    }
  }, [props.open]);

  const [selectedKnowledge, setSelectedKnowledge] = useState<{ [key: string]: boolean }>({});
  const selectedKnowledgeIds = Object.entries(selectedKnowledge)
    .filter(([, selected]) => selected)
    .map(([key]) => key);
  const disabled = (props.list || [])
    .filter((item) => item.resourceBlockletDid)
    .map((item) => `${item.resourceBlockletDid}${separator}${item.knowledgeId}`)
    .reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as { [key: string]: boolean }
    );

  const { loading: importLoading, run: runImport } = useRequest(
    async (selectedIds: string[]) => {
      const items = selectedIds
        .map((key) => {
          const found = resources.find((item) => `${item.blockletDid}${separator}${item.id}` === key);
          if (!found) return null;
          return {
            projectId,
            name: found.name,
            description: found.description,
            resourceBlockletDid: found.blockletDid,
            knowledgeId: found.id,
          };
        })
        .filter(isNonNullable);

      await createDatasetFromResources({ items });
      setSelectedKnowledge({});
      Toast.success(t('knowledge.importKnowledgeSuccess'));
      props.onConfirm();
    },
    {
      manual: true,
      onError: (error: any) => Toast.error(getErrorMessage(error)),
    }
  );

  return (
    <>
      <AddComponent
        componentDid={window.blocklet.appId}
        resourceDid={AIGNE_STUDIO_COMPONENT_DID}
        resourceType="knowledge"
        autoClose={false}
        render={({ onClick, loading }) => {
          addComponentRef.current = { onClick, loading };
          return <Box />;
        }}
        onClose={() => {}}
        onComplete={() => {
          setLoading(false);

          setTimeout(() => {
            getResourcesKnowledgeList();
            setLoading(false);
          }, 3000);
        }}
      />
      <Dialog
        fullWidth
        maxWidth="xl"
        fullScreen={useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'))}
        open={props.open}
        onClose={props.onClose}
        slotProps={{
          paper: { sx: { height: '100%' } },
        }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 500 }}>
              {`${t('select')}${t('knowledge.knowledge')}`}
            </Typography>

            <IconButton size="small" onClick={props.onClose}>
              <Box component={Icon} icon={XIcon} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {loading || resourceLoading ? (
            <Box
              className="center"
              sx={{
                flex: 1,
                height: 1,
              }}>
              <CircularProgress size={36} />
            </Box>
          ) : (
            <>
              {!resources.length && (
                <Box
                  className="center"
                  sx={{
                    flex: 1,
                    height: 1,
                  }}>
                  <Stack
                    sx={{
                      alignItems: 'center',
                    }}>
                    <Typography variant="subtitle1">📚</Typography>
                    <Typography variant="subtitle4">{t('knowledge.noKnowledge')}</Typography>
                    <Typography variant="subtitle5">{t('knowledge.noKnowledgeTip')}</Typography>
                  </Stack>
                </Box>
              )}

              <KnowledgeListContainer gap={2.5}>
                {resources.map((item) => {
                  const key = `${item.blockletDid}${separator}${item.id}`;
                  return (
                    <CardContainer
                      key={key}
                      height={327}
                      sx={{
                        border: '1px solid transparent',
                        borderColor: selectedKnowledge[key] ? '#3B82F6' : 'transparent',
                      }}>
                      <KnowledgeCard
                        disabled={disabled[key]}
                        emoji="📖"
                        title={item.name || t('unnamed')}
                        description={item.description || ''}
                        docsCount={item.docs}
                        size={item.totalSize}
                        author={item.user.fullName}
                        authorAvatar={item.user.avatar}
                        date={item.updatedAt?.toLocaleString()}
                        maxLineClamp={6}
                        knowledgeId={item.id}
                        onClick={() =>
                          !disabled[key] &&
                          setSelectedKnowledge({ ...selectedKnowledge, [key]: !selectedKnowledge[key] })
                        }
                      />
                      {selectedKnowledge[key] && (
                        <Box className="center" sx={{ position: 'absolute', top: 16, right: 16 }}>
                          <Box
                            component="img"
                            src={checkBoxIcon}
                            sx={{
                              width: 20,
                              height: 20,
                            }}
                          />
                        </Box>
                      )}
                      {disabled[key] && (
                        <Box className="center" sx={{ position: 'absolute', top: 16, right: 16 }}>
                          <Box
                            component="img"
                            src={checkDisabledIcon}
                            sx={{
                              width: 20,
                              height: 20,
                            }}
                          />
                        </Box>
                      )}
                    </CardContainer>
                  );
                })}
              </KnowledgeListContainer>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between' }}>
          {!!isAdmin && (
            <Button variant="outlined" onMouseDown={addComponentRef.current?.onClick}>
              {t('knowledge.installKnowledgeFromBlocklet')}
            </Button>
          )}

          <Stack
            direction="row"
            sx={{
              gap: 1,
            }}>
            <Button variant="outlined" onClick={props.onClose}>
              {t('cancel')}
            </Button>

            <LoadingButton
              variant="contained"
              onClick={() => runImport(selectedKnowledgeIds)}
              disabled={!selectedKnowledgeIds.length || importLoading}>
              {importLoading && <CircularProgress size={14} />}
              {`${t('importObject', { object: t('knowledge.knowledgeBase') })} ${
                selectedKnowledgeIds.length ? `(${selectedKnowledgeIds.length})` : ''
              }`}
            </LoadingButton>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
};

const CardContainer = styled(Box)`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0px 0px 0px 1px rgba(3, 7, 18, 0.08),
    0px 1px 2px -1px rgba(3, 7, 18, 0.08),
    0px 2px 4px 0px rgba(3, 7, 18, 0.04);
`;

const CreateKnowledgeContainer = styled(CardContainer)`
  height: 400px;

  .image {
    width: 100%;
    padding-top: 100%;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    z-index: 1;

    img {
      object-fit: cover;
      object-position: center;
      position: absolute;
      inset: 0;
      width: 100%;
    }
  }

  .shadow {
    width: 100%;
    padding-bottom: 100%;
    position: absolute;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 50%);
    z-index: 2;
  }

  .button {
    position: absolute;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 3;
  }
`;

const ListContainer = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
`;

const KnowledgeListContainer = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
`;
