import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { ArrowDropDown, Download, History, InfoOutlined, Upload } from '@mui/icons-material';
import { Box, BoxProps, Button, TextField, Tooltip, Typography } from '@mui/material';
import { uniqBy } from 'lodash';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import joinUrl from 'url-join';
import { parse } from 'yaml';

import { Template } from '../../../api/src/store/templates';
import CommitsTip from '../../components/template-form/commits-tip';
import { useIsAdmin } from '../../contexts/session';
import { getErrorMessage } from '../../libs/api';
import { importBodySchema } from '../../libs/import';
import { commitFromWorking } from '../../libs/working';
import useDialog from '../../utils/use-dialog';
import usePickFile, { readFileAsText } from '../../utils/use-pick-file';
import BranchButton from './branch-button';
import { useExportFiles } from './export-files';
import MenuButton from './menu-button';
import SaveButton from './save-button';
import { defaultBranch, useProjectState } from './state';
import { importFiles, isTemplate, useStore } from './yjs-state';

export default function HeaderActions() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const {
    state: { branches, loading, commits },
    refetch,
  } = useProjectState(projectId, gitRef);

  const { store } = useStore(projectId, gitRef);

  const isAdmin = useIsAdmin();
  const disableMutation = gitRef === defaultBranch && !isAdmin;

  const [committing, setCommitting] = useState(false);

  const { dialog, showDialog } = useDialog();
  const { dialog: createBranchDialog, showDialog: showCreateBranchDialog } = useDialog();

  const showCreateBranch = useCallback(async () => {
    return new Promise<string | null>((resolve) => {
      let name = '';

      showCreateBranchDialog({
        maxWidth: 'sm',
        fullWidth: true,
        title: `${t('form.new')} ${t('form.branch')}`,
        content: (
          <Box>
            <TextField label={t('form.name')} onChange={(e) => (name = e.target.value)} />
          </Box>
        ),
        okText: t('form.save'),
        cancelText: t('alert.cancel'),
        onOk: async () => {
          try {
            resolve(name);
          } catch (error) {
            Toast.error(getErrorMessage(error));
            throw error;
          }
        },
        onCancel: () => resolve(null),
      });
    });
  }, [showCreateBranchDialog, t]);

  const save = useCallback(
    async ({ newBranch }: { newBranch?: boolean } = {}) => {
      setCommitting(true);
      try {
        const branch = !newBranch ? gitRef : await showCreateBranch();
        if (!branch) return;

        const message = await new Promise<string | null>((resolve) => {
          let message = '';

          showDialog({
            maxWidth: 'sm',
            fullWidth: true,
            title: t('form.save'),
            content: (
              <Box>
                <TextField
                  fullWidth
                  multiline
                  label={t('alert.message')}
                  onChange={(e) => (message = e.target.value)}
                />
              </Box>
            ),
            okText: t('form.save'),
            cancelText: t('alert.cancel'),
            onOk: async () => {
              resolve(message.trim());
            },
            onCancel: () => resolve(null),
          });
        });

        if (typeof message !== 'string') return;

        await commitFromWorking({
          projectId,
          ref: gitRef,
          input: {
            branch,
            message: message || new Date().toLocaleString(),
          },
        });

        refetch();
        Toast.success(t('alert.saved'));
        if (branch !== gitRef) navigate(joinUrl('..', branch), { replace: true });
      } catch (error) {
        Toast.error(getErrorMessage(error));
        throw error;
      } finally {
        setCommitting(false);
      }
    },
    [gitRef, navigate, projectId, showCreateBranch, t]
  );

  const { exporter, exportFiles } = useExportFiles({ projectId, gitRef });

  const pickFile = usePickFile();

  const onImport = useCallback(
    async (path?: string[]) => {
      try {
        const list = await pickFile({ accept: '.yaml,.yml', multiple: true }).then((files) =>
          Promise.all(
            files.map((i) =>
              readFileAsText(i).then((i) => {
                const obj = parse(i);

                // 用于兼容比较旧的导出数据
                // {
                //   templates: {
                //     folderId?: string
                //   }[]
                //   folders: {
                //     _id: string
                //     name?: string
                //   }[]
                // }
                if (Array.isArray(obj?.templates) && Array.isArray(obj?.folders)) {
                  obj.templates.forEach((template: any) => {
                    if (template.folderId) {
                      const folder = obj.folders.find((f: any) => f._id === template.folderId);
                      if (folder.name) {
                        template.path = folder.name;
                      }
                    }
                  });
                }

                return importBodySchema.validateAsync(obj, { stripUnknown: true });
              })
            )
          )
        );

        const templates = uniqBy(
          list.flatMap((i) => i.templates ?? []),
          'id'
        ).map((i) => ({ ...i, path: i.path?.split('/') }));

        const existedTemplateIds = new Set(
          Object.values(store.files)
            .filter(isTemplate)
            .map((i) => i.id)
        );

        const renderTemplateItem = ({
          template,
          ...props
        }: { template: Template & { path?: string[] } } & BoxProps) => {
          return (
            <Box {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexShrink: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Typography color="text.secondary" component="span">
                    {template.path?.length ? `${template.path.join('/')}/` : ''}
                  </Typography>

                  {template.name || t('alert.unnamed')}
                </Box>

                {existedTemplateIds.has(template.id) && (
                  <Tooltip
                    title={
                      <>
                        <Box component="span">{t('alert.overwrittenTip')}</Box>
                        <Box
                          component="a"
                          sx={{
                            ml: 1,
                            userSelect: 'none',
                            color: 'white',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            ':hover': { opacity: 0.6 },
                          }}
                          onClick={() => {
                            const path = Object.values(store.tree).find(
                              (i) => i?.split('/').slice(-1)[0] === `${template.id}.yaml`
                            );
                            if (path) {
                              exportFiles(path.split('/'), { quiet: true });
                            }
                          }}>
                          {t('alert.downloadBackup')}
                        </Box>
                      </>
                    }>
                    <InfoOutlined color="warning" fontSize="small" sx={{ mx: 1 }} />
                  </Tooltip>
                )}
              </Box>
            </Box>
          );
        };

        showDialog({
          fullWidth: true,
          maxWidth: 'sm',
          title: t('alert.import'),
          content: (
            <Box>
              <Typography>{t('alert.importTip')}</Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                {templates.map((template) =>
                  renderTemplateItem({
                    key: template.id,
                    component: 'li',
                    template,
                  })
                )}
              </Box>
            </Box>
          ),
          cancelText: t('alert.cancel'),
          okText: t('alert.import'),
          onOk: async () => {
            try {
              importFiles({ store, parent: path, files: templates });
              // await importTemplates({ projectId, branch: gitRef, path: path?.join('/') || '', templates });

              Toast.success(t('alert.imported'));
            } catch (error) {
              Toast.error(getErrorMessage(error));
              throw error;
            }
          },
        });
      } catch (error) {
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [pickFile, store, showDialog, t, exportFiles]
  );

  return (
    <>
      {exporter}
      {dialog}
      {createBranchDialog}

      <BranchButton projectId={projectId} gitRef={gitRef} filepath={filepath} />
      <CommitsTip
        loading={loading}
        commits={commits}
        hash={gitRef}
        onCommitSelect={(commit) => {
          navigate(joinUrl('..', commit.oid), { state: { filepath } });
        }}>
        <Button startIcon={<History />} endIcon={<ArrowDropDown fontSize="small" />}>
          {t('alert.history')}
        </Button>
      </CommitsTip>
      <SaveButton disabled={disableMutation || !branches.includes(gitRef)} loading={committing} changed onSave={save} />
      <MenuButton
        menus={[
          {
            icon: <Upload />,
            title: t('alert.import'),
            disabled: disableMutation,
            onClick: () => onImport(),
          },
          {
            icon: <Download />,
            title: t('alert.export'),
            onClick: () => exportFiles(),
          },
        ]}
      />
    </>
  );
}
