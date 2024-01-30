import IndicatorTextField from '@app/components/awareness/indicator-text-field';
import { MenuItem, TextFieldProps } from '@mui/material';

type Props = {
  projectId: string;
  gitRef: string;
  path: string[];
} & TextFieldProps;

export default function RoleSelectField({ projectId, gitRef, path, ...props }: Props) {
  return (
    <IndicatorTextField
      projectId={projectId}
      path={path}
      gitRef={gitRef}
      TextFiledProps={{
        select: true,
        hiddenLabel: true,
        ...props,
        SelectProps: {
          autoWidth: true,
          ...props.SelectProps,
        },
        children: [
          <MenuItem key="system" value="system">
            System
          </MenuItem>,
          <MenuItem key="user" value="user">
            User
          </MenuItem>,
          <MenuItem key="assistant" value="assistant">
            Assistant
          </MenuItem>,
        ],
      }}
    />
  );
}
