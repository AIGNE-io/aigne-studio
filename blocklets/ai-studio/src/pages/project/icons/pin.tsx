import styled from '@emotion/styled';
import { Box } from '@mui/material';

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
  color: rgb(158, 158, 158);
  cursor: pointer;
  background-color: rgb(251, 220, 220);
  border: 1px solid rgb(247, 185, 185);
`;
