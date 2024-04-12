import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import { LoadingButton } from '@mui/lab';
import TabContext from '@mui/lab/TabContext';
import TabPanel from '@mui/lab/TabPanel';
import { Box, Checkbox, CircularProgress, FormControlLabel, Stack, TextField, Typography, styled } from '@mui/material';
import { useRequest } from 'ahooks';
import { useState } from 'react';
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

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
const CardContainer = styled(Stack)`
  border: 1px solid #e5e7eb;
  padding: 16px;
  width: 380px;
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
    <CardContainer onClick={onClick} flexDirection="row" gap={1.5} className={classNames.join(',')}>
      {icon}

      <Box flex={1} width={0}>
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

  const { refetch } = useDocuments(datasetId);
  const navigate = useNavigate();

  const onInputChange = (e: any) => {
    e.preventDefault();
    let files;
    if (e.dataTransfer) {
      files = e.dataTransfer.files;
    } else if (e.target) {
      files = e.target.files;
    }

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
                <Box component={Icon} icon="tabler:file-description" color="#3B82F6" />
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
              sx={{ border: '1px dashed #E5E7EB' }}
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
                sx={{ cursor: 'pointer' }}>
                <Box className="center" gap={1}>
                  <Box component={Icon} icon="tabler:arrow-bar-to-up" />
                  <Typography>Import Files</Typography>
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
                accept=".md, .txt, .pdf, .doc"
                component="input"
                display="none"
              />
            </Box>
          )}
        </Box>

        <Box>
          <LoadingButton
            type="submit"
            variant="contained"
            disabled={!file}
            startIcon={loading ? <CircularProgress sx={{ color: '#fff' }} size={16} /> : null}
            onClick={async () => {
              try {
                setLoading(true);

                if (file) {
                  const form = new FormData();
                  form.append('data', file);
                  form.append('type', 'file');

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
            {t('save')}
          </LoadingButton>
        </Box>
      </Stack>
    </Box>
  );
}

const types = ['discussion', 'blog', 'doc'] as ['discussion', 'blog', 'doc'];

function Discussion({ datasetId }: { datasetId: string }) {
  const { t } = useLocaleContext();
  const [checkedValues, setCheckedValues] = useState<('discussion' | 'blog' | 'doc')[]>(types);
  const [loading, setLoading] = useState(false);

  const handleChange = (event: any) => {
    const { name, checked } = event.target;
    const newCheckedValues: ('discussion' | 'blog' | 'doc')[] = checked
      ? [...checkedValues, name]
      : checkedValues.filter((value) => value !== name);

    setCheckedValues(newCheckedValues);
  };

  const { refetch } = useDocuments(datasetId);
  const navigate = useNavigate();

  return (
    <Box maxWidth="900px" component="form">
      <Stack gap={1}>
        <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#030712">
          {t('Import from Discussion')}
        </Typography>

        <Stack gap={1.5} flexDirection="row">
          {types.map((name) => (
            <Box borderRadius={1} p={2} border="1px solid #E5E7EB" flex={1} key={name}>
              <FormControlLabel
                control={<Checkbox checked={checkedValues.includes(name)} onChange={handleChange} name={name} />}
                label={t(name)}
              />
            </Box>
          ))}
        </Stack>

        <Box>
          <LoadingButton
            variant="contained"
            disabled={!checkedValues.length}
            startIcon={loading ? <CircularProgress sx={{ color: '#fff' }} size={16} /> : null}
            onClick={async () => {
              try {
                setLoading(true);

                await createDatasetDocuments(datasetId, [
                  {
                    name: 'Discussion Full Site',
                    data: { type: 'discussion', fullSite: true, id: '', types: checkedValues },
                  },
                ]);
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
          <Box component={Icon} icon="tabler:file-description" fontSize={20} color="#3B82F6" />
        </Box>
      ),
      title: t('knowledge.documents.file.title'),
      subtitle: t('knowledge.documents.file.description'),
    },
    {
      id: 'discussion',
      icon: (
        <Box width={48} height={48} borderRadius={1} border="1px solid #E5E7EB" className="center">
          <Discuss sx={{ width: '100%', height: '100%' }} />
        </Box>
      ),
      title: t('knowledge.documents.discussion.title'),
      subtitle: t('knowledge.documents.discussion.description'),
    },
    {
      id: 'custom',
      icon: (
        <Box width={48} height={48} borderRadius={1} border="1px solid #E5E7EB" className="center">
          <Box component={Icon} icon="tabler:pencil" fontSize={20} color="#3B82F6" />
        </Box>
      ),
      title: t('knowledge.documents.custom.title'),
      subtitle: t('knowledge.documents.custom.description'),
    },
  ];

  return (
    <Stack bgcolor="background.paper" p={2.5} height={1} gap={2.5}>
      <Stack flexDirection="row" className="between">
        <Box>
          <Box
            display="flex"
            alignItems="center"
            sx={{ cursor: 'pointer' }}
            onClick={() => {
              navigate(joinURL('..', datasetId || ''));
            }}>
            <Box component={Icon} icon="tabler:chevron-left" width={20} />
            <Typography variant="subtitle2" mb={0}>
              {state.dataset?.name}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center">
            <Box width={20} />
            <Typography variant="subtitle2" color="#4B5563" fontWeight={400} mb={0}>
              {state.dataset?.name}
            </Typography>
          </Box>
        </Box>
      </Stack>

      <TabContext value={value}>
        <Stack flex={1} height={0} gap={2.5}>
          <Box display="flex" gap={1}>
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

          <TabPanel value="file" sx={{ p: 0 }}>
            <File datasetId={datasetId || ''} id={id || ''} />
          </TabPanel>
          <TabPanel value="discussion" sx={{ p: 0 }}>
            <Discussion datasetId={datasetId || ''} />
          </TabPanel>
          <TabPanel value="custom" sx={{ p: 0 }}>
            <Custom datasetId={datasetId || ''} id={id || ''} value={document?.document} />
          </TabPanel>
        </Stack>
      </TabContext>
    </Stack>
  );
}
