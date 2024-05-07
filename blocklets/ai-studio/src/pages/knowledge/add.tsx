import { CreateDiscussionItem } from '@api/routes/dataset/documents';
import { useIsAdmin } from '@app/contexts/session';
import { discussionBoards, getDiscussionStatus } from '@app/libs/discussion';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import ArrowLeft from '@iconify-icons/tabler/chevron-left';
import FileDiscIcon from '@iconify-icons/tabler/file-description';
import LinkIcon from '@iconify-icons/tabler/link';
import PencilIcon from '@iconify-icons/tabler/pencil';
import UploadIcon from '@iconify-icons/tabler/upload';
import { LoadingButton } from '@mui/lab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  TextField,
  Tooltip,
  Typography,
  styled,
  useMediaQuery,
} from '@mui/material';
import Tab from '@mui/material/Tab';
import { useReactive, useRequest } from 'ahooks';
import { groupBy, uniqWith } from 'lodash';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useDatasets } from '../../contexts/datasets/datasets';
import { useDocuments } from '../../contexts/datasets/documents';
import { getErrorMessage } from '../../libs/api';
import {
  createDatasetDocuments,
  createFileDocument,
  getDocument,
  updateFileDocument,
  updateTextDocument,
} from '../../libs/dataset';
import Discuss from '../project/icons/discuss';
import DiscussList from './discuss';

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
const CardContainer = styled(Stack)`
  border: 1px solid #e5e7eb;
  padding: 16px;
  max-width: 380px;
  border-radius: 8px;
  cursor: pointer;

  &.disabled {
    background: #f9fafb;
  }

  &.selected {
    background: #fff;
    border-color: #3b82f6;
    position: relative;
  }
`;

function Card({
  icon,
  selected,
  disabled,
  title,
  subtitle,
  onClick,
}: {
  icon: string;
  selected: boolean;
  disabled: boolean;
  title: string;
  subtitle: string;
  onClick: any;
}) {
  const classNames = [disabled ? 'disabled' : '', selected ? 'selected' : ''].filter((x) => x);
  return (
    <CardContainer onClick={onClick} gap={1.5} width={1} alignItems="center" className={classNames.join(',')}>
      {icon}

      <Box textAlign="center">
        <Box fontSize={16} fontWeight={500} lineHeight="28px" color="#030712">
          {title}
        </Box>
        <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Typography variant="subtitle3">{subtitle}</Typography>
        </Box>
      </Box>
    </CardContainer>
  );
}

function File({ datasetId, id }: { datasetId: string; id?: string }) {
  const { t } = useLocaleContext();
  const [file, setFile] = useState<File | undefined>();
  const [loading, setLoading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const { refetch } = useDocuments(datasetId);
  const navigate = useNavigate();

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const { files } = event.dataTransfer;
    setFile(files[0]);
  };

  const onInputChange = (event: any) => {
    event.preventDefault();
    const { files } = event.target;
    setFile(files[0]);
  };

  return (
    <Box maxWidth="720px">
      <Stack gap={1}>
        <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#030712">
          {id ? t('knowledge.documents.update') : t('knowledge.documents.add')}
        </Typography>

        <Box>
          {file ? (
            <Box
              width={1}
              display="flex"
              alignItems="center"
              sx={{ border: '1px dashed #E5E7EB' }}
              bgcolor="#F9FAFB"
              p={2}
              borderRadius={1}>
              <Box className="center" gap={1}>
                <Box component={Icon} icon={FileDiscIcon} color="#3B82F6" />
                <Typography>{file.name}</Typography>
                <Typography>{formatBytes(file.size)}</Typography>
              </Box>
            </Box>
          ) : (
            <Box
              width={1}
              height={200}
              display="flex"
              justifyContent="center"
              alignItems="center"
              sx={{ border: isDraggingOver ? '1px dashed #007bff' : '1px dashed #E5E7EB' }}
              bgcolor="#F9FAFB"
              borderRadius={1}>
              <Stack
                htmlFor="upload"
                component="label"
                gap={1}
                width={1}
                height={1}
                justifyContent="center"
                alignItems="center"
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragLeave={() => setIsDraggingOver(false)}
                sx={{ cursor: 'pointer' }}>
                <Box className="center" gap={1}>
                  <Box component={Icon} icon={UploadIcon} />
                  <Typography>{t('importFiles')}</Typography>
                </Box>

                <Box
                  sx={{
                    fontSize: '14px',
                    color: 'rgba( 56,55,67,1)',
                    textAlign: 'center',
                    whiteSpace: 'break-spaces',
                  }}>
                  {t('knowledge.file.content')}
                </Box>
              </Stack>

              <Box
                id="upload"
                type="file"
                onChange={onInputChange}
                accept=".md, .txt, .doc, .docx, .pdf"
                component="input"
                display="none"
              />
            </Box>
          )}
        </Box>

        <Box>
          <LoadingButton
            sx={{ mb: 2 }}
            type="submit"
            variant="contained"
            disabled={!file || loading}
            startIcon={loading ? <CircularProgress sx={{ color: '#fff' }} size={16} /> : null}
            onClick={async () => {
              try {
                setLoading(true);

                if (file) {
                  const form = new FormData();
                  form.append('data', file);
                  form.append('type', 'file');

                  const limit: number = window?.blocklet?.preferences?.uploadFileLimit || 1;
                  if (file.size > limit * 1000 * 1000) {
                    Toast.error(t('maxUploadFileLimit', { limit }));
                    return;
                  }

                  if (id) {
                    await updateFileDocument(datasetId, id, form);
                  } else {
                    await createFileDocument(datasetId, form);
                  }

                  await refetch();

                  navigate(`../${datasetId}`, { replace: true });
                }
              } catch (error) {
                Toast.error(getErrorMessage(error));
              } finally {
                setLoading(false);
              }
            }}>
            {loading ? t('processing') : t('save')}
          </LoadingButton>
        </Box>
      </Stack>
    </Box>
  );
}

const types = ['discussion', 'blog', 'doc'] as ['discussion', 'blog', 'doc'];

function Discussion({ datasetId }: { datasetId: string }) {
  const { t } = useLocaleContext();
  const [loading, setLoading] = useState(false);
  const state = useReactive<{
    data: CreateDiscussionItem['data'][];
  }>({ data: [] });

  const result = useRequest(() => discussionBoards());
  const [boards, setBoards] = useState<{ id: string; title: string; type: 'discussion' | 'blog' | 'doc' }[]>([]);
  const [value, setValue] = useState('discussion');
  const { refetch } = useDocuments(datasetId);
  const navigate = useNavigate();
  const isMdOrAbove = useMediaQuery((theme: any) => theme.breakpoints.up('md'));

  const onChange = (checked: boolean, data: CreateDiscussionItem['data']) => {
    const newCheckedValues = checked
      ? [...state.data, data]
      : state.data.filter((value) => !(value.id === data.id && value.from === data.from));
    state.data = uniqWith(newCheckedValues, (x, y) => `${x.from}_${x.id}` === `${y.from}_${y.id}`);
  };

  const onChangeTable = (type: string, data: CreateDiscussionItem['data'][]) => {
    const list = uniqWith(
      state.data.filter((x) => {
        return !(x.from === 'discussion' && x.type === type);
      }),
      (x, y) => `${x.from}_${x.id}` === `${y.from}_${y.id}`
    );

    state.data = uniqWith([...list, ...data], (x, y) => `${x.from}_${x.id}` === `${y.from}_${y.id}`);
  };

  useEffect(() => {
    if (!result.loading) {
      const list: { id: string; title: string; type: 'discussion' | 'blog' | 'doc' }[] = (
        result?.data?.data || []
      ).filter((x) => ['discussion', 'blog', 'doc'].includes(x.type));

      setBoards(list);
    }
  }, [result.loading]);

  if (result.loading) {
    return (
      <Box className="center" width={1} height={1}>
        <CircularProgress />
      </Box>
    );
  }

  const isChecked = (id: string) => {
    return Boolean(state.data.find((x) => x.id === id));
  };

  const group = groupBy(boards, (x) => x.type);

  const getDiscussionValue = (type: string) => {
    const data = uniqWith(
      state.data.filter((x) => {
        return x.from === 'discussion' && x.type === type;
      }),
      (x, y) => `${x.from}_${x.id}` === `${y.from}_${y.id}`
    );

    return data;
  };

  return (
    <Box maxWidth="900px" component="form">
      <Stack gap={1}>
        <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#030712">
          {t('importFromDiscussion')}
        </Typography>

        <Box>
          <Typography variant="subtitle2">{t('discussionType')}</Typography>
          <Stack gap={1.5} flexDirection={isMdOrAbove ? 'row' : 'column'}>
            {types.map((name: 'discussion' | 'blog' | 'doc') => (
              <Box borderRadius={1} p={2} border="1px solid #E5E7EB" flex={1} key={name}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isChecked(name)}
                      onChange={(e) => {
                        const { name, checked } = e.target;
                        onChange(checked, {
                          id: name,
                          title: name,
                          from: 'discussionType',
                        });
                      }}
                      name={name}
                    />
                  }
                  label={`${t('all')}${t(name)}${t('data')}`}
                />
              </Box>
            ))}
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2">{t('discussionBoards')}</Typography>
          <Stack gap={1}>
            {Object.entries(group).map(([key, value]) => {
              const prefix = (window?.blocklet?.componentMountPoints || []).find(
                (x) => x.name === 'did-comments'
              )?.mountPoint;
              let url = joinURL(window?.blocklet?.appUrl || '', prefix || '/', 'discussions');

              const map: any = {
                discussion: 'discussions/boards',
                doc: 'docs',
                blog: 'blog/boards',
              };

              return (
                <Box key={key}>
                  <Typography variant="subtitle3">{t(key)}</Typography>

                  <Stack
                    gap={1.5}
                    flexDirection="row"
                    borderRadius={1}
                    p={2}
                    border="1px solid #E5E7EB"
                    flex={1}
                    flexWrap="wrap">
                    {value.map(({ id, title, type }) => {
                      url = joinURL(window?.blocklet?.appUrl || '', prefix || '/', map[type], id);

                      return (
                        <Tooltip
                          key={id}
                          title={
                            <Stack
                              flexDirection="row"
                              gap={1}
                              alignItems="center"
                              sx={{ cursor: 'pointer' }}
                              onClick={() => window.open(url, '_blank')}>
                              {t('visitLink')}
                              <Box component={Icon} icon={LinkIcon} />
                            </Stack>
                          }>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={isChecked(id)}
                                onChange={(e) => {
                                  const { name, checked } = e.target;
                                  onChange(checked, { id: name, title, type, from: 'board' });
                                }}
                                name={id}
                              />
                            }
                            label={title}
                          />
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2">{t('discussionData')}</Typography>
          <Box sx={{ width: '100%', typography: 'body1' }}>
            <TabContext value={value}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <TabList
                  onChange={(_event: React.SyntheticEvent, newValue: string) => {
                    setValue(newValue);
                  }}>
                  {types.map((x) => {
                    return <Tab label={t(x)} value={x} key={x} />;
                  })}
                </TabList>
              </Box>

              {types.map((x) => {
                return (
                  <TabPanel value={x} sx={{ p: 0, height: 1 }} key={x}>
                    <DiscussList
                      type={x}
                      value={getDiscussionValue(x)}
                      onChange={(d) => {
                        onChangeTable(x, d);
                      }}
                    />
                  </TabPanel>
                );
              })}
            </TabContext>
          </Box>
        </Box>

        <Box>
          <LoadingButton
            sx={{ mb: 2 }}
            variant="contained"
            disabled={!state.data.length}
            startIcon={loading ? <CircularProgress sx={{ color: '#fff' }} size={16} /> : null}
            onClick={async () => {
              try {
                setLoading(true);

                const data = uniqWith(state.data, (x, y) => `${x.from}_${x.id}` === `${y.from}_${y.id}`).map((x) => {
                  return { name: x.title, data: x };
                });

                await createDatasetDocuments(datasetId, data);
                await refetch();
                Toast.success(t('alert.saved'));
                navigate(`../${datasetId}`, { replace: true });
              } catch (error) {
                Toast.error(getErrorMessage(error));
              } finally {
                setLoading(false);
              }
            }}>
            {t('save')}
          </LoadingButton>
        </Box>
      </Stack>
    </Box>
  );
}

function Custom({ datasetId, id, value }: { datasetId: string; id?: string; value?: any }) {
  const { t } = useLocaleContext();
  const form = useForm<{ name: string; content: string }>({
    defaultValues: { name: value?.name, content: value?.content },
  });
  const { createTextDocument } = useDatasets();
  const { refetch } = useDocuments(datasetId || '');
  const navigate = useNavigate();

  return (
    <Box
      maxWidth="720px"
      onSubmit={form.handleSubmit(async (data) => {
        try {
          if (id) {
            await updateTextDocument(datasetId || '', id, data);
          } else {
            await createTextDocument(datasetId || '', data);
          }

          form.reset({ name: '', content: '' });

          await refetch();
          navigate(`../${datasetId}`, { replace: true });
        } catch (error) {
          Toast.error(getErrorMessage(error));
        }
      })}
      component="form">
      <Stack gap={1}>
        <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#030712">
          {id ? t('knowledge.documents.update') : t('knowledge.documents.add')}
        </Typography>

        <Stack gap={2}>
          <Controller
            control={form.control}
            name="name"
            rules={{
              required: t('validation.fieldRequired'),
            }}
            render={({ field, fieldState }) => {
              return (
                <Box>
                  <Typography variant="subtitle2">{t('knowledge.documents.name')}</Typography>

                  <TextField
                    label={t('knowledge.documents.name')}
                    sx={{ width: 1 }}
                    {...field}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                </Box>
              );
            }}
          />

          <Controller
            control={form.control}
            name="content"
            rules={{
              required: t('validation.fieldRequired'),
            }}
            render={({ field, fieldState }) => {
              return (
                <Box>
                  <Typography variant="subtitle2">{t('knowledge.documents.content')}</Typography>

                  <TextField
                    label={t('knowledge.documents.content')}
                    placeholder={t('knowledge.documents.content')}
                    sx={{ width: 1 }}
                    multiline
                    rows={10}
                    {...field}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                </Box>
              );
            }}
          />
        </Stack>

        <Box>
          <LoadingButton
            sx={{ mb: 2 }}
            type="submit"
            variant="contained"
            startIcon={form.formState.isSubmitting ? <CircularProgress sx={{ color: '#fff' }} size={16} /> : null}>
            {t('save')}
          </LoadingButton>
        </Box>
      </Stack>
    </Box>
  );
}

export default function KnowledgeDocumentsAdd() {
  const { t } = useLocaleContext();
  const { datasetId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const isMdOrAbove = useMediaQuery((theme: any) => theme.breakpoints.up('md'));

  const type = searchParams.get('type');
  const editType = (type ? (type === 'text' ? 'custom' : type) : null) as 'file' | 'discussion' | 'custom' | null;
  const id = searchParams.get('id');

  const [value, setValue] = useState<'file' | 'discussion' | 'custom'>(editType || 'file');
  const { state } = useDocuments(datasetId || '');

  const { data: document, loading } = useRequest(() => {
    if (id) {
      return getDocument(datasetId || '', id);
    }
    return Promise.resolve(null);
  });

  if (state.loading || loading) {
    return (
      <Box width={1} height={1} className="center">
        <CircularProgress size={20} />
      </Box>
    );
  }

  const cards: { id: 'file' | 'discussion' | 'custom'; icon: any; title: string; subtitle: string }[] = [
    {
      id: 'file',
      icon: (
        <Box width={48} height={48} borderRadius={1} border="1px solid #E5E7EB" className="center">
          <Box component={Icon} icon={UploadIcon} fontSize={20} color="#3B82F6" />
        </Box>
      ),
      title: t('knowledge.documents.file.title'),
      subtitle: t('knowledge.documents.file.description'),
    },
    getDiscussionStatus() && isAdmin
      ? {
          id: 'discussion',
          icon: (
            <Box width={48} height={48} borderRadius={1} border="1px solid #E5E7EB" className="center">
              <Discuss sx={{ width: '100%', height: '100%' }} />
            </Box>
          ),
          title: t('knowledge.documents.discussion.title'),
          subtitle: t('knowledge.documents.discussion.description'),
        }
      : null,
    {
      id: 'custom',
      icon: (
        <Box width={48} height={48} borderRadius={1} border="1px solid #E5E7EB" className="center">
          <Box component={Icon} icon={PencilIcon} fontSize={20} color="#3B82F6" />
        </Box>
      ),
      title: t('knowledge.documents.custom.title'),
      subtitle: t('knowledge.documents.custom.description'),
    },
  ].filter((i): i is any => !!i);

  return (
    <Stack bgcolor="background.paper" p={2.5} height={1} gap={2.5} overflow="auto">
      <Stack flexDirection="row" className="between">
        <Box>
          <Box
            display="flex"
            alignItems="center"
            sx={{ cursor: 'pointer' }}
            onClick={() => {
              navigate(joinURL('..', datasetId || ''));
            }}>
            <Box component={Icon} icon={ArrowLeft} width={20} />
            <Typography variant="subtitle2" mb={0}>
              {t('addDocumentToDataset', { dataset: state.dataset?.name })}
            </Typography>
          </Box>

          {/* <Box display="flex" alignItems="center">
            <Box width={20} />
            <Typography variant="subtitle2" color="#4B5563" fontWeight={400} mb={0}>
              {state.dataset?.d}
            </Typography>
          </Box> */}
        </Box>
      </Stack>

      <TabContext value={value}>
        <Stack flex={1} height={0} gap={2.5}>
          <Box display="flex" gap={1} flexDirection={isMdOrAbove ? 'row' : 'column'}>
            {cards.map((card) => (
              <Card
                selected={card.id === value}
                disabled={Boolean(id && editType !== card.id)}
                key={card.id}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                onClick={() => setValue(editType || card.id)}
              />
            ))}
          </Box>

          <TabPanel value="file" sx={{ p: 0, height: 1 }}>
            <File datasetId={datasetId || ''} id={id || ''} />
          </TabPanel>
          <TabPanel value="discussion" sx={{ p: 0, height: 1 }}>
            <Discussion datasetId={datasetId || ''} />
          </TabPanel>
          <TabPanel value="custom" sx={{ p: 0, height: 1 }}>
            <Custom datasetId={datasetId || ''} id={id || ''} value={document?.document} />
          </TabPanel>
        </Stack>
      </TabContext>
    </Stack>
  );
}
