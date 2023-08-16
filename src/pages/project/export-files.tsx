import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Box, Typography } from '@mui/material';
import saveAs from 'file-saver';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { stringify } from 'yaml';

import useDialog from '../../utils/use-dialog';
import { TreeNode } from './file-tree';
import { useProjectState } from './state';

function Exporter({
  projectId,
  _ref: ref,
  node,
  quiet,
  onFinish,
}: {
  projectId: string;
  _ref: string;
  node?: TreeNode | string;
  quiet?: boolean;
  onFinish: () => any;
}) {
  const { t } = useLocaleContext();

  const { dialog, showDialog } = useDialog();

  const {
    state: { files },
  } = useProjectState(projectId, ref);

  useEffect(() => {
    const list = !node
      ? files.filter((i): i is typeof i & { type: 'file' } => i.type === 'file')
      : typeof node === 'string'
      ? files.filter((i): i is typeof i & { type: 'file' } => i.type === 'file' && i.meta.id === node)
      : node.data?.type === 'folder'
      ? files.filter((i): i is typeof i & { type: 'file' } => i.type === 'file' && i.parent.join('-') === node.id)
      : files.filter((i): i is typeof i & { type: 'file' } => i.type === 'file' && i.name === node.id);

    for (let i = 0; i < list.length; i++) {
      const current = list[i]!;
      if (current.meta.branch?.branches.length) {
        for (const { template } of current.meta.branch.branches) {
          if (template && !list.some((i) => i.meta.id === template.id)) {
            const t = files.find(
              (i): i is typeof i & { type: 'file' } => i.type === 'file' && i.meta.id === template.id
            );
            if (t) list.push(t);
          }
        }
      }
    }

    if (!list.length) {
      Toast.error('No templates to export');
      onFinish();
      return;
    }

    const doExport = () => {
      const str = stringify({ templates: list.map((i) => i.meta) });
      const first = list[0];
      const filename = list.length === 1 && first ? first.meta.name || first.meta.id : `templates-${Date.now()}`;
      saveAs(new Blob([str]), `${filename}.yml`);
      onFinish();
    };

    if (quiet) {
      doExport();
      return;
    }
    showDialog({
      fullWidth: true,
      maxWidth: 'sm',
      title: t('alert.export'),
      content: (
        <Box>
          <Typography>{t('alert.exportTip')}</Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            {list.map((template) => (
              <Box key={template.meta.id} component="li" sx={{ wordWrap: 'break-word' }}>
                {template.meta.name || template.meta.id}
              </Box>
            ))}
          </Box>
        </Box>
      ),
      cancelText: t('alert.cancel'),
      okText: t('alert.export'),
      onOk: () => doExport(),
      onCancel: () => onFinish(),
    });
  }, []);

  return dialog;
}

export function useExportFiles() {
  const [exporter, setExporter] = useState<ReactNode>();

  const exportFiles = useCallback(
    (projectId: string, ref: string, node?: TreeNode | string, { quiet }: { quiet?: boolean } = {}) => {
      setExporter(
        <Exporter projectId={projectId} _ref={ref} node={node} quiet={quiet} onFinish={() => setExporter(undefined)} />
      );
    },
    []
  );

  return { exporter, exportFiles };
}
