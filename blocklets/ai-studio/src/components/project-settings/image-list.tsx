import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, styled } from '@mui/material';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import { useRequest, useResponsive } from 'ahooks';
import uniqBy from 'lodash/uniqBy';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { joinURL } from 'ufo';

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

function createImageUrl(filename: string, width = 0, height = 0) {
  const mountPoint = getMountPoint('image-bin');
  // @ts-ignore
  const { CDN_HOST = '' } = window?.blocklet || {};
  const obj = new URL(CDN_HOST || window.location.origin);
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

  const { data } = useRequest(() => api.get('/api/projects/icons').then((res) => res.data));

  // @ts-ignore
  const uploads = uniqBy(data?.icons || [], 'filename');

  const cols = responsive.xl ? 4 : responsive.md ? 3 : 2;
  const gap = 4;

  useImperativeHandle(ref, () => ({}), []);

  const list = useMemo(() => {
    return [{ add: true }, ...uploads.map((x: any) => ({ ...x, img: createImageUrl(x.filename) }))];
  }, [uploads]);

  return (
    <List cols={cols} gap={gap}>
      {list.map((item) => {
        if (item.add) {
          return (
            <Box className="image-container" key="add">
              <UploaderButton
                onChange={({ response }: any) => {
                  const url = response?.data?.url || response?.data?.fileUrl;
                  onChange(url);
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
                className={selectedImage === item.img ? 'selected' : ''}
                srcSet={`${item.img}`}
                src={`${item.img}`}
                alt={item.filename}
                loading="lazy"
              />

              {selectedImage === item.img && (
                <CheckCircleIcon sx={{ color: '#1976d2', position: 'absolute', bottom: 1, right: 1 }} />
              )}
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
  }

  .image-container {
    img,
    button {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
`;

export default GalleryImageList;
