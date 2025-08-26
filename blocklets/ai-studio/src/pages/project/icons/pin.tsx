import { Box, alpha, styled } from '@mui/material';

function Pin() {
  return <Container>📌</Container>;
}

export default Pin;

const Container = styled(Box)`
  display: inline-flex;
  -webkit-box-align: center;
  align-items: center;
  -webkit-box-pack: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  font-size: 8px;
  color: ${({ theme }) => theme.palette.text.secondary};
  cursor: pointer;
  background-color: ${({ theme }) => alpha(theme.palette.error.light, 0.8)};
  border: 1px solid ${({ theme }) => theme.palette.error.light};
`;
