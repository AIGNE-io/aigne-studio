import Project from '@api/store/models/project';
import { checkProjectName, getProjectIconUrl } from '@app/libs/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { joinURL } from '@blocklet/ai-runtime/front/utils/mount-point';
import { Box, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

interface NameFieldProps {
  form: UseFormReturn<any & { name: string }>;
  triggerOnMount?: boolean;
  projectId?: string;
  beforeDuplicateProjectNavigate?: () => void;
}

const NameField = ({
  form,
  projectId = undefined,
  triggerOnMount = false,
  beforeDuplicateProjectNavigate = undefined,
}: NameFieldProps) => {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const [duplicateProject, setDuplicateProject] = useState<Project | undefined>();

  useEffect(() => {
    if (triggerOnMount) form.trigger('name');
  }, []);

  const onDuplicateProject = (project: Project) => {
    beforeDuplicateProjectNavigate?.();
    setTimeout(() => navigate(joinURL('/projects', project.id)), 100);
  };

  return (
    <Controller
      name="name"
      control={form.control}
      rules={{
        validate: async (name) => {
          const trimmedName = name.trim();
          if (!trimmedName) {
            setDuplicateProject(undefined);
            return t('validation.whitespace');
          }
          const res = await checkProjectName({ name: trimmedName, projectId });
          setDuplicateProject(res.project);
          return res.ok ? true : t('validation.nameExists');
        },
      }}
      render={({ field, fieldState }) => {
        return (
          <TextField
            data-testid="projectNameField"
            placeholder={t('newProjectNamePlaceholder')}
            hiddenLabel
            autoFocus
            sx={{ width: 1, '.MuiInputBase-root': { border: '1px solid #E5E7EB', borderRadius: '8px' } }}
            {...field}
            error={!!fieldState.error}
            helperText={
              <HelperText
                message={fieldState.error?.message}
                project={duplicateProject}
                onDuplicateProject={onDuplicateProject}
              />
            }
          />
        );
      }}
    />
  );
};

const HelperText = ({
  message = undefined,
  project = undefined,
  onDuplicateProject = undefined,
}: {
  message?: string;
  project?: Project;
  onDuplicateProject?: (project: Project) => void;
}) => {
  return (
    <Box
      component="span"
      sx={{
        height: message ? 24 : 0,
        transition: 'height 0.3s',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}>
      <Box component="span" sx={{ flexShrink: 0 }}>
        {message}
      </Box>
      {project && (
        <Box
          component="span"
          onClick={() => onDuplicateProject?.(project)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.2,
            fontWeight: 600,
            cursor: onDuplicateProject ? 'pointer' : 'auto',
            color: 'text.secondary',
            textDecoration: 'underline',
            minWidth: 0,
          }}>
          <Box component="img" alt="" src={getProjectIconUrl(project.id, {})} sx={{ width: 24, height: 24 }} />
          <Box component="span" className="ellipsis">
            {project.name}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default NameField;
