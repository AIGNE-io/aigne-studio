import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, Skeleton, styled } from '@mui/material';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import { useRequest, useResponsive } from 'ahooks';
import uniqBy from 'lodash/uniqBy';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { joinURL } from 'ufo';

import { useSessionContext } from '../../contexts/session';
import { UploaderButton } from '../../contexts/uploader';
import api from '../../libs/api';

export interface ImperativeImage {}

const getMountPoint = (name: string) => {
  const res = blocklet?.componentMountPoints.find((i) => i.name === name);

  if (res) {
    return res.mountPoint;
  }

  return '/';
};

export function createImageUrl(filename: string, width = 0, height = 0) {
  const mountPoint = getMountPoint('image-bin');
  const obj = new URL(window.location.origin);
  obj.pathname = joinURL(mountPoint, '/uploads/', filename);

  const extension = filename.split('.').pop() || '';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
    if (width) {
      obj.searchParams.set('imageFilter', 'resize');
      obj.searchParams.set('w', width.toString());
    }
    if (height) {
      obj.searchParams.set('imageFilter', 'resize');
      obj.searchParams.set('h', height.toString());
    }
  }

  return obj.href;
}

const GalleryImageList = forwardRef<
  ImperativeImage,
  { onSelected: (data: string) => void; onChange: (data: string) => void }
>(({ onChange, onSelected }: any, ref) => {
  const responsive = useResponsive();
  const [selectedImage, onSelectedImage] = useState('');
  const { session } = useSessionContext();
  const { t } = useLocaleContext();

  const { data, loading, mutate } = useRequest(() => api.get('/api/projects/icons').then((res) => res.data));

  // @ts-ignore
  const uploads = uniqBy(data?.icons || [], 'filename');

  const cols = responsive.xl ? 4 : responsive.md ? 3 : 2;
  const gap = 4;

  useImperativeHandle(ref, () => ({}), []);

  const list = useMemo(() => {
    if (loading) {
      return [{ add: true }, ...new Array(9).fill(0).map((_x, i) => ({ loading: true, i }))];
    }

    return [{ add: true }, ...uploads.map((x: any) => ({ ...x, img: createImageUrl(x.filename) }))];
  }, [uploads, loading]);

  const onDelete = async (id: string) => {
    try {
      await api.delete(`/api/projects/icon/${id}`);

      mutate((r: any) => {
        return { icons: (r?.icons || []).filter((x: { _id: string }) => x._id !== id) };
      });

      Toast.success(t('alert.deleted'));
    } catch (error) {
      Toast.error(error?.message);
    }
  };

  const renderDelete = (item: { _id: string; createdBy: string }) => {
    if (item?.createdBy === session.user?.did) {
      return (
        <Box
          sx={{ position: 'absolute', top: 1, right: 1 }}
          className="close-button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item._id);
          }}>
          <CancelRoundedIcon sx={{ color: (theme) => theme.palette.error.main }} />
        </Box>
      );
    }

    return null;
  };

  return (
    <List cols={cols} gap={gap}>
      {list.map((item) => {
        const selected = selectedImage === item.img;

        if (item.add) {
          return (
            <Box className="image-container" key="add">
              <UploaderButton
                allowedFileTypes={['image/png']}
                onChange={({ response }: any) => {
                  const url = response?.data?.url || response?.data?.fileUrl;
                  onChange(url);
                }}
              />
            </Box>
          );
        }

        if (item.loading) {
          return (
            <Box className="image-container" key={item.i}>
              <Skeleton
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  transform: 'none',
                  bgcolor: 'grey.100',
                }}
              />
            </Box>
          );
        }

        return (
          <ImageListItem
            key={item.img}
            onClick={() => {
              onSelectedImage(item.img);
              onSelected(item.img);
            }}>
            <Box className="image-container">
              <img
                className={selected ? 'selected' : ''}
                srcSet={`${item.img}`}
                src={`${createImageUrl(item.filename, 160, 160)}`}
                alt={item.filename}
                loading="lazy"
              />

              {selected && <CheckCircleIcon sx={{ color: '#1976d2', position: 'absolute', bottom: 1, right: 1 }} />}

              {!selected && renderDelete(item)}
            </Box>
          </ImageListItem>
        );
      })}
    </List>
  );
});

const List = styled(ImageList)`
  .selected {
    transform: scale(1.2);
  }

  .image-container {
    width: 100%;
    padding-bottom: 100%;
    position: relative;
    overflow: hidden;
    border-radius: 8px;

    .close-button {
      display: none;
      cursor: pointer;
    }

    &:hover {
      .close-button {
        display: flex;
      }
    }
  }

  .image-container {
    img,
    .upload-button {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
    }
  }
`;

export default GalleryImageList;
