import { styled } from '@mui/material';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import { useResponsive } from 'ahooks';
import { forwardRef, useImperativeHandle, useState } from 'react';

import { UploaderButton } from '../../contexts/uploader';

export interface ImperativeImage {}

const GalleryImageList = forwardRef<
  ImperativeImage,
  { selected: string; onSelected: (data: string) => void; onChange: (data: string) => void }
>(({ selected, onChange, onSelected }: any, ref) => {
  const responsive = useResponsive();
  const [selectedImage, onSelectedImage] = useState(selected);

  const cols = responsive.xl ? 4 : responsive.md ? 3 : 2;
  const gap = 16;

  useImperativeHandle(ref, () => ({}), []);

  return (
    <List cols={cols} gap={gap} sx={{ my: -1 }}>
      {itemData.map((item) => {
        if (item.add) {
          return (
            <UploaderButton
              key="add"
              onChange={({ response }: any) => {
                const url = response?.data?.url;
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
            <img
              className={selectedImage === item.img ? 'selected' : ''}
              srcSet={`${item.img}?w=164&h=164&fit=crop&auto=format&dpr=2 2x`}
              src={`${item.img}?w=164&h=164&fit=crop&auto=format`}
              alt={item.title}
              loading="lazy"
            />
          </ImageListItem>
        );
      })}
    </List>
  );
});

const List = styled(ImageList)`
  .selected {
    transform: scale(1.1);
  }
`;

export default GalleryImageList;

const itemData = [
  {
    add: true,
  },
  {
    img: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e',
    title: 'Breakfast',
  },
  {
    img: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d',
    title: 'Burger',
  },
  {
    img: 'https://images.unsplash.com/photo-1522770179533-24471fcdba45',
    title: 'Camera',
  },
  {
    img: 'https://images.unsplash.com/photo-1444418776041-9c7e33cc5a9c',
    title: 'Coffee',
  },
  {
    img: 'https://images.unsplash.com/photo-1533827432537-70133748f5c8',
    title: 'Hats',
  },
  {
    img: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62',
    title: 'Honey',
  },
  {
    img: 'https://images.unsplash.com/photo-1516802273409-68526ee1bdd6',
    title: 'Basketball',
  },
  {
    img: 'https://images.unsplash.com/photo-1518756131217-31eb79b20e8f',
    title: 'Fern',
  },
  {
    img: 'https://images.unsplash.com/photo-1597645587822-e99fa5d45d25',
    title: 'Mushrooms',
  },
  {
    img: 'https://images.unsplash.com/photo-1567306301408-9b74779a11af',
    title: 'Tomato basil',
  },
  {
    img: 'https://images.unsplash.com/photo-1471357674240-e1a485acb3e1',
    title: 'Sea star',
  },
  {
    img: 'https://images.unsplash.com/photo-1589118949245-7d38baf380d6',
    title: 'Bike',
  },
];
