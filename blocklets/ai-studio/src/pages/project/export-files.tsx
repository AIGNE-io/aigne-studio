import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Box, Typography } from '@mui/material';
import saveAs from 'file-saver';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { stringify } from 'yaml';

import useDialog from '../../utils/use-dialog';
import { isTemplate, useStore } from './yjs-state';

function ExportFiles({ path = [], quiet, onFinish }: { path?: string[]; quiet?: boolean; onFinish: () => any }) {
  const { t } = useLocaleContext();
  const { dialog, showDialog } = useDialog();

  const { store } = useStore();

  useEffect(() => {
    const files = Object.entries(store.tree)
      .map(([key, filepath]) => {
        const template = store.files[key];
        if (filepath?.endsWith('.yaml') && template && isTemplate(template)) {
          const paths = filepath.split('/');
          return {
            name: template.name || '',
            filename: paths.slice(-1)[0]!,
            parent: paths.slice(0, -1).join('/'),
            filepath,
            template,
          };
        }

        return undefined;
      })
      .filter((i): i is NonNullable<typeof i> => !!i);

    const p = path.join('/');
    const list = files.filter((i) => i.filepath.startsWith(p));

    for (let i = 0; i < list.length; i++) {
      const current = list[i]!;
      if (current.template.branch?.branches.length) {
        for (const { template } of current.template.branch.branches) {
          if (template && !list.some((i) => i.template.id === template.id)) {
            const t = files.find((i) => i.template.id === template.id);
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

    list.sort((a, b) => {
      const aName = a.template.name || '';
      const bName = b.template.name || '';

      if (a.parent && b.parent) {
        return a.parent !== b.parent ? a.parent.localeCompare(b.parent) : aName.localeCompare(bName);
      }
      if (!a.parent && !b.parent) {
        return aName.localeCompare(bName);
      }
      return a.parent ? -1 : 1;
    });

    const doExport = () => {
      const str = stringify({ templates: list.map((i) => ({ ...i.template, path: i.parent })) });
      const first = list[0];
      const filename =
        list.length === 1 && first ? first.template.name || first.template.id : `templates-${Date.now()}`;
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
            {list.map((file) => (
              <Box key={file.template.id} component="li" sx={{ wordWrap: 'break-word' }}>
                <Typography color="text.secondary" component="span">
                  {file.parent ? `${file.parent}/` : ''}
                </Typography>

                {file.template.name || t('alert.unnamed')}
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

  const exportFiles = useCallback((path?: string[], { quiet }: { quiet?: boolean } = {}) => {
    setExporter(<ExportFiles path={path} quiet={quiet} onFinish={() => setExporter(undefined)} />);
  }, []);

  return { exporter, exportFiles };
}
