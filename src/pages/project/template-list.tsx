import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { WarningRounded } from '@mui/icons-material';
import { Box } from '@mui/material';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import joinUrl from 'url-join';

import { Template } from '../../../api/src/store/templates';
import { useComponent } from '../../contexts/component';
import { getErrorMessage } from '../../libs/api';
import useDialog from '../../utils/use-dialog';
import FileTree, { TreeNode } from './file-tree';
import { useProjectState } from './state';

export default function TemplateList({
  title,
  projectId,
  _ref: ref,
  filepath,
  disableMutation,
  onExport,
  onImport,
  onLaunch,
  onClick,
}: {
  title?: ReactNode;
  projectId: string;
  _ref: string;
  filepath?: string;
  disableMutation: boolean;
  onExport: (node: TreeNode) => any;
  onImport: (path: string[]) => any;
  onLaunch: (template: Template) => any;
  onClick: (template: Template, path: string[]) => any;
}) {
  const { t } = useLocaleContext();

  const { dialog, showDialog } = useDialog();

  const navigate = useNavigate();

  const assistant = useComponent('ai-assistant');

  const {
    state: { files, branches },
    createFile,
    deleteFile,
  } = useProjectState(projectId, ref);

  return (
    <>
      {dialog}

      <FileTree
        title={title}
        sx={{ overflowY: 'auto', overflowX: 'hidden', pt: 8, px: { xs: 1, sm: 2 } }}
        disabled={!branches.includes(ref)}
        current={filepath}
        projectId={projectId}
        _ref={ref}
        onCreate={
          disableMutation
            ? undefined
            : async (data, path) => {
                try {
                  const res = await createFile({
                    projectId,
                    branch: ref,
                    path: path?.join('/') || '',
                    input: { type: 'file', data: data ?? {} },
                  });
                  navigate(joinUrl('.', ...(path ?? []), `${res.id}.yaml`));
                } catch (error) {
                  Toast.error(getErrorMessage(error));
                  throw error;
                }
              }
        }
        onExport={onExport}
        onImport={disableMutation ? undefined : onImport}
        onRemoveFolder={
          disableMutation
            ? undefined
            : (path, children) => {
                showDialog({
                  maxWidth: 'xs',
                  fullWidth: true,
                  title: (
                    <Box>
                      <WarningRounded color="warning" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />

                      {t('alert.deleteTemplates')}
                    </Box>
                  ),
                  content: (
                    <Box component="ul" sx={{ pl: 2, my: 0 }}>
                      <Box component="li">
                        <Box>{path.join('/')}</Box>

                        <Box component="ul">
                          {children.map((item) => (
                            <Box key={item.id} component="li" sx={{ wordWrap: 'break-word' }}>
                              {(item.data?.type === 'file' && item.data.meta.name) || item.text}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  ),
                  okText: t('alert.delete'),
                  okColor: 'error',
                  cancelText: t('alert.cancel'),
                  onOk: async () => {
                    try {
                      await deleteFile({ projectId, branch: ref, path: path.join('/') });
                      if (children.some((i) => i.data && i.data.parent.concat(i.data.name).join('/') === filepath)) {
                        navigate('.');
                      }
                      Toast.success(t('alert.deleted'));
                    } catch (error) {
                      Toast.error(getErrorMessage(error));
                      throw error;
                    }
                  },
                });
              }
        }
        onDelete={
          disableMutation
            ? undefined
            : (template, path) => {
                const referrers = files.filter(
                  (i): i is typeof i & { type: 'file' } =>
                    i.type === 'file' &&
                    i.meta.type === 'branch' &&
                    !!i.meta.branch?.branches.some((j) => j.template?.id === template.id)
                );

                showDialog({
                  maxWidth: 'xs',
                  fullWidth: true,
                  title: (
                    <Box sx={{ wordWrap: 'break-word' }}>
                      <WarningRounded color="warning" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />

                      {t('alert.deleteTemplate', { template: template.name || template.id })}
                    </Box>
                  ),
                  content: referrers.length ? (
                    <>
                      {t('alert.deleteTemplateContent', { references: referrers.length })}
                      <ul>
                        {referrers.map((file) => (
                          <Box key={file.meta.id} component="li">
                            {file.meta.name || file.meta.id}
                          </Box>
                        ))}
                      </ul>
                    </>
                  ) : undefined,
                  okText: t('alert.delete'),
                  okColor: 'error',
                  cancelText: t('alert.cancel'),
                  onOk: async () => {
                    try {
                      const p = joinUrl(...path);
                      await deleteFile({ projectId, branch: ref, path: p });
                      if (p === filepath) navigate('.');
                      Toast.success(t('alert.deleted'));
                    } catch (error) {
                      Toast.error(getErrorMessage(error));
                      throw error;
                    }
                  },
                });
              }
        }
        onClick={onClick}
        onLaunch={assistant && onLaunch}
      />
    </>
  );
}
