import { Box, BoxProps, styled } from '@mui/material';

export default function Pending({ ...props }: BoxProps) {
  return (
    <Container {...props}>
      <Box className="dot" />
      <Box className="dot" />
      <Box className="dot" />
    </Container>
  );
}

const Container = styled(Box)`
  display: flex;
  justify-content: center;

  .dot {
    width: 2px;
    height: 2px;
    margin: 0 1px;
    background-color: #030712;
    border-radius: 50%;
    opacity: 0;
    animation: fade 1.2s infinite;
  }

  .dot:nth-child-type(1) {
    animation-delay: 0s;
  }
  .dot:nth-child-type(2) {
    animation-delay: 0.4s;
  }
  .dot:nth-child-type(3) {
    animation-delay: 0.8s;
  }

  @keyframes fade {
    0%,
    100% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }
`;
