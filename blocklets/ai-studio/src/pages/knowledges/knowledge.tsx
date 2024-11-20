import LoadingButton from '@app/components/loading/loading-button';
import { AIGNE_RUNTIME_MOUNT_POINT } from '@app/libs/constants';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { Icon } from '@iconify-icon/react';
import DatabaseIcon from '@iconify-icons/tabler/database';
import FileIcon from '@iconify-icons/tabler/file-text';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  Stack,
  StackProps,
  Theme,
  Typography,
  styled,
  useMediaQuery,
} from '@mui/material';
import { useRequest } from 'ahooks';
import bytes from 'bytes';
import dayjs from 'dayjs';
import { usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useFetchKnowledgeList, useKnowledge } from '../../contexts/datasets/datasets';
import backgroundIcon from '../../icons/background.png?url';
import checkDisabledIcon from '../../icons/check-disbaled.svg?url';
import checkBoxIcon from '../../icons/check.svg?url';
import type { KnowledgeCard as KnowledgeCardType } from '../../libs/dataset';

export default function Knowledge() {
  const { projectId } = useParams();
  if (!projectId) throw new Error('projectId not Found');

  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog' });
  const { createKnowledge } = useKnowledge();
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

  return (
    <>
      <Stack p={2.5} height={1} overflow="auto">
        <ListContainer gap={2.5}>
          <CreateCard onImport={dialogState.open} onCreate={onCreate} />

          {list.map((item) => {
            return (
              <CardContainer key={item.id} height={400}>
                <KnowledgeCard
                  emoji="📖"
                  title={item.name || t('unnamed')}
                  description={item.description || ''}
                  docsCount={item.docs}
                  size={item.totalSize}
                  author={item.user.fullName}
                  authorAvatar={item.user.avatar}
                  date={item.updatedAt?.toLocaleString()}
                  knowledgeId={item.id}
                  icon={item.icon}
                  onClick={() => navigate(`./${item.id}`)}
                />
              </CardContainer>
            );
          })}
        </ListContainer>

        {(dataState.loadingMore || dataState?.data?.next) && (
          <Box width={1} height={60} className="center" ref={loadingRef}>
            <Box display="flex" justifyContent="center">
              <CircularProgress size={24} />
            </Box>
          </Box>
        )}
      </Stack>

      <SelectKnowledgeModal
        list={list}
        open={dialogState.isOpen}
        onClose={dialogState.close}
        onConfirm={() => {
          dataState.reload();
          dialogState.close();
        }}
      />
    </>
  );
}

const CreateCard = ({ onImport, onCreate }: { onImport: () => void; onCreate: () => void }) => {
  const { t } = useLocaleContext();
  return (
    <CreateKnowledgeContainer>
      <Box className="image">
        <Box component="img" src={backgroundIcon} width={1} height={1} />
      </Box>
      <Box className="shadow" />

      <Stack p={2.5} gap={1} className="button">
        <LoadingButton variant="contained" size="large" onClick={onCreate} sx={{ fontSize: 16 }}>
          {`${t('create')} ${t('knowledge.knowledge')}`}
        </LoadingButton>
        <Button variant="outlined" size="large" onClick={onImport} sx={{ fontSize: 16 }}>
          {`${t('alert.import')} ${t('knowledge.knowledge')}`}
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
  disabled,
  icon,
  knowledgeId,
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
} & StackProps) => {
  const { t } = useLocaleContext();

  return (
    <Stack
      p={2}
      height={1}
      width={1}
      sx={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.8 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
      {...props}>
      <Box
        className="center"
        sx={{
          width: 48,
          height: 48,
          background: '#F1F3F5',
          borderRadius: 1,
          mb: 5,

          img: {
            width: 1,
            height: 1,
            borderRadius: 1,
            objectFit: 'cover',
          },
        }}>
        {icon ? (
          <img
            src={joinURL(AIGNE_RUNTIME_MOUNT_POINT, `/api/datasets/${knowledgeId}/icon.png?icon=${icon}`)}
            alt="knowledge icon"
          />
        ) : (
          <Typography fontSize={24}>{emoji}</Typography>
        )}
      </Box>

      <Stack flex={1} height={0} gap={0.5} justifyContent="flex-end">
        <Typography fontWeight={600} lineHeight="28px" fontSize={18}>
          {title || t('unnamed')}
        </Typography>

        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: maxLineClamp,
              WebkitBoxOrient: 'vertical',
            }}>
            {description}
          </Typography>
        )}
      </Stack>

      <Stack direction="row" gap={1.25} alignItems="center" mt={2.5} color="#9CA3AF">
        <Stack direction="row" gap={0.5} alignItems="center">
          <Box component={Icon} icon={FileIcon} />
          <Typography variant="caption">{`${docsCount} ${t('knowledge.docs')}`}</Typography>
        </Stack>

        <Stack direction="row" gap={0.5} alignItems="center">
          <Box component={Icon} icon={DatabaseIcon} />
          <Typography variant="caption">{bytes.format(size)}</Typography>
        </Stack>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1.25}>
        <Stack direction="row" alignItems="center" gap={0.75}>
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
          <Typography variant="subtitle5">{author}</Typography>
        </Stack>
        {date && <Typography variant="subtitle5">{dayjs(date).format('YYYY-MM-DD HH:mm:ss')}</Typography>}
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
      Toast.success(t('importKnowledgeSuccess'));
      props.onConfirm();
    },
    {
      manual: true,
      onError: (error: any) => {
        Toast.error(error.message);
      },
    }
  );

  return (
    <Dialog
      fullWidth
      maxWidth="xl"
      PaperProps={{ sx: { height: '100%' } }}
      fullScreen={useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'))}
      open={props.open}
      onClose={props.onClose}>
      <DialogTitle>{`${t('select')}${t('knowledge.knowledge')}`}</DialogTitle>

      <DialogContent>
        {resourceLoading && (
          <Box className="center" flex={1} height={1}>
            <CircularProgress size={36} />
          </Box>
        )}

        {!resources.length && (
          <Box className="center" flex={1} height={1}>
            <Stack alignItems="center">
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
                    !disabled[key] && setSelectedKnowledge({ ...selectedKnowledge, [key]: !selectedKnowledge[key] })
                  }
                />

                {selectedKnowledge[key] && (
                  <Box className="center" sx={{ position: 'absolute', top: 16, right: 16 }}>
                    <Box component="img" src={checkBoxIcon} width={20} height={20} />
                  </Box>
                )}

                {disabled[key] && (
                  <Box className="center" sx={{ position: 'absolute', top: 16, right: 16 }}>
                    <Box component="img" src={checkDisabledIcon} width={20} height={20} />
                  </Box>
                )}
              </CardContainer>
            );
          })}
        </KnowledgeListContainer>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button variant="outlined" component={Link} to="">
          {t('knowledge.installKnowledgeFromBlocklet')}
        </Button>

        <Stack direction="row" gap={1}>
          <Button variant="outlined" onClick={props.onClose}>
            {t('cancel')}
          </Button>

          <Button
            variant="contained"
            onClick={() => runImport(selectedKnowledgeIds)}
            disabled={!selectedKnowledgeIds.length || importLoading}>
            {importLoading && <CircularProgress size={14} />}
            {`Import Knowledge ${selectedKnowledgeIds.length ? `(${selectedKnowledgeIds.length})` : ''}`}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
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
