import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, styled } from '@mui/material';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import { useRequest, useResponsive } from 'ahooks';
import axios from 'axios';
import uniqBy from 'lodash/uniqBy';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import joinUrl from 'url-join';

import { UploaderButton } from '../../contexts/uploader';

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
  // @ts-ignore
  const { CDN_HOST = '' } = window?.blocklet || {};
  const obj = new URL(CDN_HOST || window.location.origin);
  obj.pathname = joinUrl(mountPoint, '/uploads/', filename);

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

function getImagesBin(): Promise<any> {
  const mountPoint = getMountPoint('image-bin');
  const url = joinUrl(mountPoint, '/api/uploads');
  return axios.get(url, { params: { tags: 'default-project-icon' } }).then((res) => res.data);
}

const GalleryImageList = forwardRef<
  ImperativeImage,
  { onSelected: (data: string) => void; onChange: (data: string) => void }
>(({ onChange, onSelected }: any, ref) => {
  const responsive = useResponsive();
  const [selectedImage, onSelectedImage] = useState('');

  const { data } = useRequest(() => getImagesBin());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const uploads = uniqBy(data?.uploads || [], 'filename');

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
            <UploaderButton
              key="add"
              onChange={({ response }: any) => {
                const url = response?.data?.url || response?.data?.fileUrl;
                onChange(url);
              }}
            />
          );
        }

        return (
          <ImageListItem
            key={item.img}
            onClick={() => {
              onSelectedImage(item.img);
              onSelected(item.img);
            }}>
            <Box width={1} sx={{ overflow: 'hidden', position: 'relative' }}>
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

  img {
    width: 100%;
    height: 100%;
  }
`;

export default GalleryImageList;
