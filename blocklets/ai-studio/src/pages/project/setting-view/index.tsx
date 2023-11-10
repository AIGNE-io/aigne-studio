import { Stack, typographyClasses } from '@mui/material';

import { TemplateYjs } from '../../../../api/src/store/projects';
import { useReadOnly } from '../../../contexts/session';
import Dataset from './dataset';
import Model from './model';
import Next from './next';
import Parameters from './parameters';
import Settings from './settings';

export default function SettingView({
  projectId,
  gitRef,
  template,
  compareValue,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
  compareValue?: TemplateYjs;
  disabled?: boolean;
}) {
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <Stack
      py={2}
      sx={{
        '> div > *:last-child': { mb: 4 },
        [`.${typographyClasses.subtitle1}`]: { mb: 1 },
      }}>
      <Parameters readOnly={readOnly} template={template} compareValue={compareValue} />

      <Settings
        projectId={projectId}
        gitRef={gitRef}
        readOnly={readOnly}
        template={template}
        compareValue={compareValue}
      />

      <Model
        projectId={projectId}
        gitRef={gitRef}
        readOnly={readOnly}
        template={template}
        compareValue={compareValue}
      />

      <Dataset readOnly={readOnly} template={template} compareValue={compareValue} />

      {template.type !== 'image' && (
        <Next
          projectId={projectId}
          gitRef={gitRef}
          readOnly={readOnly}
          template={template}
          compareValue={compareValue}
        />
      )}
    </Stack>
  );
}
