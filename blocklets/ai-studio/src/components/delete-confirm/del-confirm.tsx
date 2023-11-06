import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import Confirm from './confirm';
import type { Params } from './confirm';

export type Props = {
  keyName: string;
  title: string;
  description?: string;
  confirmPlaceholder?: string;
  cancel: string;
  confirm: string;
  confirmProps?: {
    [key: string]: any;
  };
  params?: Params;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteConfirm({
  title,
  description,
  confirmPlaceholder,
  cancel,
  confirm,
  params: initialParams,
  onCancel,
  onConfirm,
  keyName,
  confirmProps,
}: Props) {
  const confirmSetting = {
    title: <Box>{title}</Box>,
    // eslint-disable-next-line react/no-unstable-nested-components
    description: (params: Params, setParams: React.Dispatch<React.SetStateAction<Params>>) => {
      const setValue = (value: Params) => {
        setParams({ ...value, __disableConfirm: value.__disableConfirm });
      };

      return (
        <Box>
          <Box style={{ marginTop: 24, marginBottom: 24 }} dangerouslySetInnerHTML={{ __html: description || '' }} />
          <Typography component="div">
            <TextField
              label={confirmPlaceholder}
              autoComplete="off"
              variant="outlined"
              fullWidth
              autoFocus
              value={params.inputVal}
              onChange={(e) => {
                setValue({ ...params, inputVal: e.target.value, __disableConfirm: keyName !== e.target.value });
              }}
            />
          </Typography>
        </Box>
      );
    },
    confirm,
    cancel,
    onConfirm,
    onCancel,
    confirmProps,
    params: {
      inputVal: '',
      __disableConfirm: true,
      ...(initialParams || {}),
    },
  };

  return (
    <Confirm
      title={confirmSetting.title}
      description={confirmSetting.description}
      confirm={confirmSetting.confirm}
      cancel={confirmSetting.cancel}
      params={confirmSetting.params}
      onConfirm={confirmSetting.onConfirm}
      onCancel={confirmSetting.onCancel}
      confirmProps={confirmSetting.confirmProps}
    />
  );
}
