import { discussionBoards } from '@app/libs/discussion';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import LinkIcon from '@iconify-icons/tabler/link';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Theme,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Tab from '@mui/material/Tab';
import { useReactive, useRequest } from 'ahooks';
import { groupBy, uniqWith } from 'lodash';
import { useEffect, useState } from 'react';
import { joinURL } from 'ufo';

import { CreateDiscussionItem } from '../../../libs/knowledge';
import DiscussList from './discuss';

const types = ['discussion', 'blog', 'doc'] as ['discussion', 'blog', 'doc'];

export default function Discussion({ onChange }: { onChange: (value: CreateDiscussionItem[]) => void }) {
  const { t } = useLocaleContext();
  const state = useReactive<{ data: CreateDiscussionItem['data'][] }>({ data: [] });

  const result = useRequest(() => discussionBoards());
  const [boards, setBoards] = useState<{ id: string; title: string; type: 'discussion' | 'blog' | 'doc' }[]>([]);
  const [value, setValue] = useState('discussion');
  const isMdOrAbove = useMediaQuery<Theme>((theme) => theme.breakpoints.up('md'));

  const onChangeDiscussion = (checked: boolean, data: CreateDiscussionItem['data']) => {
    const newCheckedValues = checked
      ? [...state.data, data]
      : state.data.filter((value) => !(value.id === data.id && value.from === data.from));
    state.data = uniqWith(newCheckedValues, (x, y) => `${x.from}_${x.id}` === `${y.from}_${y.id}`);
  };

  const onChangeTable = (type: string, data: CreateDiscussionItem['data'][]) => {
    const list = uniqWith(
      state.data.filter((x) => {
        return !(x.from === 'discussion' && x.type === type);
      }),
      (x, y) => `${x.from}_${x.id}` === `${y.from}_${y.id}`
    );

    state.data = uniqWith([...list, ...data], (x, y) => `${x.from}_${x.id}` === `${y.from}_${y.id}`);
  };

  useEffect(() => {
    if (!result.loading) {
      const list: { id: string; title: string; type: 'discussion' | 'blog' | 'doc' }[] = (
        result?.data?.data || []
      ).filter((x) => ['discussion', 'blog', 'doc'].includes(x.type));

      setBoards(list);
    }
  }, [result.loading]);

  useEffect(() => {
    const data = uniqWith(state.data, (x, y) => `${x.from}_${x.id}` === `${y.from}_${y.id}`).map((x) => ({
      name: x.title,
      data: x,
    }));

    onChange(data);
  }, [JSON.stringify(state.data)]);

  if (result.loading) {
    return (
      <Box
        className="center"
        sx={{
          width: 1,
          height: 1,
        }}>
        <CircularProgress />
      </Box>
    );
  }

  const isChecked = (id: string) => {
    return Boolean(state.data.find((x) => x.id === id));
  };

  const group = groupBy(boards, (x) => x.type);

  const getDiscussionValue = (type: string) => {
    const data = uniqWith(
      state.data.filter((x) => {
        return x.from === 'discussion' && x.type === type;
      }),
      (x, y) => `${x.from}_${x.id}` === `${y.from}_${y.id}`
    );

    return data;
  };

  return (
    <Box
      component="form"
      sx={{
        maxWidth: '900px',
      }}>
      <Stack
        sx={{
          gap: 1,
        }}>
        <Typography
          sx={{
            fontWeight: 500,
            fontSize: 16,
            lineHeight: '28px',
            color: '#030712',
          }}>
          {t('importFromDiscussion')}
        </Typography>

        <Box>
          <Typography variant="subtitle2">{t('discussionType')}</Typography>
          <Stack
            sx={{
              gap: 1.5,
              flexDirection: isMdOrAbove ? 'row' : 'column',
            }}>
            {types.map((name: 'discussion' | 'blog' | 'doc') => (
              <Box
                key={name}
                sx={{
                  borderRadius: 1,
                  p: 2,
                  border: '1px solid #E5E7EB',
                  flex: 1,
                }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isChecked(name)}
                      onChange={(e) => {
                        const { name, checked } = e.target;
                        onChangeDiscussion(checked, {
                          id: name,
                          title: name,
                          from: 'discussionType',
                        });
                      }}
                      name={name}
                    />
                  }
                  label={`${t('all')}${t(name)}${t('data')}`}
                />
              </Box>
            ))}
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2">{t('discussionBoards')}</Typography>
          <Stack
            sx={{
              gap: 1,
            }}>
            {Object.entries(group).map(([key, value]) => {
              const prefix = (window.blocklet?.componentMountPoints || []).find(
                (x) => x.name === 'did-comments'
              )?.mountPoint;
              let url = joinURL(window.blocklet?.appUrl || '', prefix || '/', 'discussions');

              const map: any = {
                discussion: 'discussions/boards',
                doc: 'docs',
                blog: 'blog/boards',
              };

              return (
                <Box key={key}>
                  <Typography variant="subtitle3">{t(key)}</Typography>
                  <Stack
                    sx={{
                      gap: 1.5,
                      flexDirection: 'row',
                      borderRadius: 1,
                      p: 2,
                      border: '1px solid #E5E7EB',
                      flex: 1,
                      flexWrap: 'wrap',
                    }}>
                    {value.map(({ id, title, type }) => {
                      url = joinURL(window.blocklet?.appUrl || '', prefix || '/', map[type], id);

                      return (
                        <Tooltip
                          key={id}
                          title={
                            <Stack
                              onClick={() => window.open(url, '_blank')}
                              sx={{
                                flexDirection: 'row',
                                gap: 1,
                                alignItems: 'center',
                                cursor: 'pointer',
                              }}>
                              {t('visitLink')}
                              <Box component={Icon} icon={LinkIcon} />
                            </Stack>
                          }>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={isChecked(id)}
                                onChange={(e) => {
                                  const { name, checked } = e.target;
                                  onChangeDiscussion(checked, { id: name, title, type, from: 'board' });
                                }}
                                name={id}
                              />
                            }
                            label={title}
                          />
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2">{t('discussionData')}</Typography>
          <Box sx={{ width: '100%', typography: 'body1' }}>
            <TabContext value={value}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <TabList onChange={(_event: React.SyntheticEvent, newValue: string) => setValue(newValue)}>
                  {types.map((x) => {
                    return <Tab label={t(x)} value={x} key={x} />;
                  })}
                </TabList>
              </Box>

              {types.map((x) => {
                return (
                  <TabPanel value={x} sx={{ p: 0, height: 1 }} key={x}>
                    <DiscussList type={x} value={getDiscussionValue(x)} onChange={(d) => onChangeTable(x, d)} />
                  </TabPanel>
                );
              })}
            </TabContext>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
