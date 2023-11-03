import Copy from '@arcblock/ux/lib/ClickToCopy';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import Confirm from './confirm';

export default function CancelConfirm({
  title,
  description,
  confirmPlaceholder,
  cancel,
  confirm,
  params: initialParams,
  onCancel,
  onConfirm,
  keyName,
}: {
  keyName: string;
  title: any;
  description?: any;
  confirmPlaceholder?: string;
  cancel: string;
  confirm: string;
  params?: object;
  onCancel: () => any;
  onConfirm: () => any;
}) {
  const { t } = useLocaleContext();

  const confirmSetting = {
    // eslint-disable-next-line react/no-unstable-nested-components
    title: () => (
      <div>
        {title}
        {` (${keyName})`}
      </div>
    ),
    // eslint-disable-next-line react/no-unstable-nested-components
    description: (params: any, setParams: any) => {
      const setValue = (value: any) => {
        // eslint-disable-next-line no-underscore-dangle
        setParams({ ...value, __disableConfirm: value.__disableConfirm });
      };

      return (
        <Box>
          <Box style={{ marginTop: 24, marginBottom: 24 }} dangerouslySetInnerHTML={{ __html: description }} />
          <Box style={{ marginBottom: 24 }}>
            {t('click')}：
            <Copy tip={t('copyTip')} copiedTip={t('copiedTip')}>
              {keyName}
            </Copy>
          </Box>
          <Typography component="div">
            <TextField
              label={confirmPlaceholder}
              autoComplete="off"
              data-cy="delete-confirm-input"
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
    params: {
      inputVal: '',
      __disableConfirm: true,
      ...initialParams,
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
    />
  );
}
