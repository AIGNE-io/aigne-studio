import { createSvgIcon } from '@mui/material';

const Custom = createSvgIcon(
  <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M24 0C10.7451 0 0 10.7452 0 24V176C0 189.255 10.7451 200 24 200H176C189.255 200 200 189.255 200 176V24C200 10.7452 189.255 0 176 0H24Z"
      fill="#3D72C1"
      style={{
        fillOpacity: 1,
        fill: 'color(display-p3 0.2401 0.4472 0.7579)',
      }}
    />
    <path
      d="M108 70.6667L129.333 92M57.333 142.668H78.6663L134.666 86.6683C136.067 85.2675 137.178 83.6045 137.936 81.7744C138.694 79.9442 139.085 77.9826 139.085 76.0016C139.085 74.0206 138.694 72.059 137.936 70.2288C137.178 68.3987 136.067 66.7357 134.666 65.3349C133.266 63.9342 131.603 62.823 129.772 62.0649C127.942 61.3068 125.981 60.9167 124 60.9167C122.019 60.9167 120.057 61.3068 118.227 62.0649C116.397 62.823 114.734 63.9342 113.333 65.3349L57.333 121.335V142.668Z"
      stroke="white"
      strokeWidth="10.6667"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ stroke: 'white', strokeOpacity: 1 }}
    />
  </svg>,
  'Custom'
);

export default Custom;
