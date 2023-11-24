import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import ConstructionIcon from '@mui/icons-material/Construction';
import { Box, Button, Stack, Tooltip, Typography, alpha, buttonClasses } from '@mui/material';
import { useState } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import Edit from '../../pages/project/icons/edit';
import Trash from '../../pages/project/icons/trash';
import { useFunctionsState } from '../../pages/project/prompt-state';
import ToolsButton from './tools-button';
import FunctionCallDialog from './tools-calling-dialog';

export default function FunctionCallings({
  projectId,
  gitRef,
  template,
  readOnly,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
  readOnly: boolean;
}) {
  const { t } = useLocaleContext();
  if (!template.functions || !Object.keys(template.functions).length) {
    return null;
  }

  return (
    <Box>
      <Box
        sx={{
          borderRadius: 2,
          bgcolor: (theme) => theme.palette.action.hover,
          overflow: 'hidden',
          px: 2,
        }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ my: 1, gap: 1 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <ConstructionIcon fontSize="small" color="primary" />
            <Typography variant="subtitle1">{t('functionCall.title')}</Typography>
          </Stack>

          <ToolsButton projectId={projectId} gitRef={gitRef} template={template} readOnly={Boolean(readOnly)} />
        </Stack>

        <Stack mb={2} gap={0.5}>
          {Object.keys(template.functions).map((funcId) => {
            return (
              <FunctionItemContainer
                key={funcId}
                funcId={funcId}
                projectId={projectId}
                gitRef={gitRef}
                template={template}
                readOnly={readOnly}
              />
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}

function FunctionItemContainer({
  projectId,
  gitRef,
  template,
  funcId,
  readOnly,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
  funcId: string;
  readOnly: boolean;
}) {
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);

  const { deleteFunc } = useFunctionsState({ projectId, gitRef, templateId: template.id });
  const functionCallInfo = template.functions && template.functions[funcId];

  return (
    <>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: (theme) => `${theme.shape.borderRadius}px`,

          ':hover .hover-visible': {
            maxHeight: '100%',
          },
        }}>
        <Stack sx={{ position: 'relative', justifyContent: 'center', minHeight: '48px', p: 1 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Box
              sx={{
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: 1,
                mt: '-2px',
                color: (theme) => theme.palette.grey[800],
              }}>
              {functionCallInfo?.data?.function?.description}
            </Box>
            <Box sx={{ fontSize: '12px', lineHeight: 1, color: (theme) => theme.palette.grey[500] }}>
              {functionCallInfo?.data?.function?.name}
            </Box>
          </Stack>

          {!readOnly && (
            <Box
              className="hover-visible"
              sx={{
                maxHeight: 0,
                overflow: 'hidden',
                position: 'absolute',
                right: 0,
                top: 0,
              }}>
              <Stack
                direction="row"
                gap={1}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.grey[300], 0.9),
                  borderRadius: 1,
                  p: 0.5,
                  [`.${buttonClasses.root}`]: {
                    minWidth: 24,
                    width: 24,
                    height: 24,
                    p: 0,
                  },
                }}>
                <Tooltip title={t('functionCall.edit')} disableInteractive placement="top">
                  <Button onClick={() => setOpen(true)}>
                    <Edit sx={{ fontSize: '1.25rem', color: 'grey.500' }} />
                  </Button>
                </Tooltip>

                <Tooltip title={t('functionCall.delete')} disableInteractive placement="top">
                  <Button onClick={() => deleteFunc(funcId)}>
                    <Trash sx={{ fontSize: '1.25rem', color: 'grey.500' }} />
                  </Button>
                </Tooltip>
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>
      {open && functionCallInfo?.data && (
        <FunctionCallDialog
          projectId={projectId}
          gitRef={gitRef}
          template={template}
          state={{ call: functionCallInfo?.data }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
