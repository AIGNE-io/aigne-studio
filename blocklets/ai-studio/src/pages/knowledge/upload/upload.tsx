import Box from '@mui/material/Box';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Stepper from '@mui/material/Stepper';
import * as React from 'react';

const steps = ['Select campaign settings', 'Create an ad group', 'Create an ad'];

export default function Upload() {
  return (
    <Box>
      <Box mx={2} my={4}>
        <Steppers />
      </Box>
    </Box>
  );
}

function Steppers() {
  const [activeStep] = React.useState(0);
  const [completed] = React.useState<{ [k: number]: boolean }>({});

  return (
    <Stepper nonLinear activeStep={activeStep}>
      {steps.map((label, index) => (
        <Step key={label} completed={completed[index]}>
          <StepButton color="inherit">{label}</StepButton>
        </Step>
      ))}
    </Stepper>
  );
}
