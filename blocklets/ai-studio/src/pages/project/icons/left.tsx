import { createSvgIcon } from '@mui/material';

const LeftArrow = createSvgIcon(
  <svg width="800px" height="800px" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
    <path
      d="m4.5 8.5-4-4 4-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(7 6)"
    />
  </svg>,
  'LeftArrow'
);

export default LeftArrow;
