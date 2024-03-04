import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
/* eslint-disable jsx-a11y/label-has-associated-control */
import Toast from '@arcblock/ux/lib/Toast';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Stack, styled } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Stepper from '@mui/material/Stepper';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getErrorMessage } from '../../../libs/api';
import { uploadDocument } from '../../../libs/dataset';

const steps = ['Upload', 'Processing'];

function Upload({ onUpload }: { onUpload: (file: File) => void }) {
  const inputRef = useRef(null);
  const { t } = useLocaleContext();

  const onInputChange = (e: any) => {
    e.preventDefault();
    let files;
    if (e.dataTransfer) {
      files = e.dataTransfer.files;
    } else if (e.target) {
      files = e.target.files;
    }

    onUpload(files[0]);
  };

  return (
    <Box
      width={1}
      height={300}
      display="flex"
      justifyContent="center"
      alignItems="center"
      sx={{ border: '1px dashed #ddd', cursor: 'pointer' }}>
      <Stack
        htmlFor="upload-avatar"
        className="avatar-box"
        component="label"
        gap={2}
        width={1}
        height={1}
        justifyContent="center"
        alignItems="center">
        <CloudUploadIcon />

        <Box>{t('knowledge.file.content')}</Box>
      </Stack>

      <Box
        id="upload-avatar"
        ref={inputRef}
        type="file"
        onChange={onInputChange}
        accept=".md, .txt, .pdf, .doc"
        component="input"
        display="none"
      />
    </Box>
  );
}

function Processing({
  file,
  datasetId,
  processing,
  onStart,
  onEnd,
}: {
  datasetId: string;
  file?: File;
  processing?: boolean;
  onStart: () => any;
  onEnd: () => any;
}) {
  const [error, setError] = useState('');
  const { t } = useLocaleContext();

  const upload = async () => {
    try {
      onStart();
      if (file) {
        const form = new FormData();
        form.append('data', file);
        form.append('type', 'file');
        await uploadDocument(datasetId, form);
      }
    } catch (error) {
      Toast.error(getErrorMessage(error));
      setError(getErrorMessage(error));
    } finally {
      onEnd();
    }
  };

  useEffect(() => {
    upload();
  }, [file]);

  const headerText = useMemo(() => {
    if (error) {
      return t('knowledge.file.fail');
    }

    if (processing) {
      return t('knowledge.file.processing');
    }

    return t('knowledge.file.completed');
  }, [error, processing]);

  const statusText = useMemo(() => {
    if (error) {
      return '0%';
    }

    if (processing) {
      return '1%';
    }

    return '100%';
  }, [error, processing]);

  return (
    <ProcessingContainer>
      <Box sx={{ m: '24px 0 17px', fontWeight: 600, lineHeight: '22px', fontSize: '14px' }}>{headerText}</Box>
      <Box
        sx={{ border: '1px solid rgba(29,28,35,.12)', borderRadius: 1, maxHeight: '532px', p: '23px 35px 23px 24px' }}>
        <Box className="file">
          <Box className="content">
            <Box className="text">{file?.name}</Box>
            <Box className="background" sx={{ width: statusText }} />
          </Box>

          <Box className="status">{statusText}</Box>
        </Box>
      </Box>
    </ProcessingContainer>
  );
}

const Components = [Upload, Processing];

export default function UploadFile({ datasetId }: { datasetId: string }) {
  return (
    <Box mx={2} my={4}>
      <Steppers datasetId={datasetId} />
    </Box>
  );
}

function Steppers({ datasetId }: { datasetId: string }) {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | undefined>();
  const [processing, setProcessing] = useState(true);
  const navigate = useNavigate();
  const { t } = useLocaleContext();

  const totalSteps = useMemo(() => {
    return steps.length;
  }, []);

  const isLastStep = useMemo(() => {
    return activeStep === totalSteps - 1;
  }, [totalSteps, activeStep]);

  const handleNext = () => {
    if (!isLastStep) {
      setActiveStep(activeStep + 1);
    } else {
      navigate('..', { replace: true });
    }
  };

  const disabled = useMemo(() => {
    if (activeStep === 0) {
      return !file;
    }

    if (activeStep === 1) {
      return processing;
    }

    return false;
  }, [activeStep, processing, file]);

  const Component = Components[activeStep];

  return (
    <Container>
      <Stepper nonLinear activeStep={activeStep} sx={{ m: '0px 20px 56px' }}>
        {steps.map((label, index) => (
          <Step key={label} completed={index < activeStep}>
            <StepButton color="inherit">{label}</StepButton>
          </Step>
        ))}
      </Stepper>

      <Box>
        {Component && (
          <Component
            datasetId={datasetId}
            file={file}
            processing={processing}
            onUpload={(file) => {
              setFile(file);
              handleNext();
            }}
            onStart={() => setProcessing(true)}
            onEnd={() => setProcessing(false)}
          />
        )}
      </Box>

      <Box sx={{ float: 'right', mt: 5 }}>
        <Button variant="contained" onClick={handleNext} disabled={disabled}>
          {isLastStep ? t('knowledge.file.Completed') : t('next')}
        </Button>
      </Box>
    </Container>
  );
}

const Container = styled(Box)`
  height: 100%;
  margin: 0 auto;
  min-width: 1008px;
  width: calc(100% - 200px);
`;

const ProcessingContainer = styled(Box)`
  .file {
    position: relative;
    align-items: center;
    display: flex;
    justify-content: space-between;

    .content {
      background-color: rgba(46, 50, 56, 0.05);
      border-radius: 8px;
      flex: 1 1;
      overflow: hidden;
      position: relative;

      .text {
        box-sizing: border-box;
        font-size: 14px;
        height: 32px;
        line-height: 32px;
        padding: 0 12px;
        word-break: keep-all;
        display: inline-block;
        max-width: 100%;
        vertical-align: top;
        overflow: hidden;
        background: rgba(77, 83, 232, 1);
        color: #fff;
        position: absolute;
        top: 0;
        z-index: 12;
      }

      .background {
        border-radius: 8px;
        height: 32px;
        left: 0;
        overflow: hidden;
        position: absolute;
        top: 0;
        transition: width 0.3s linear;
        background: rgba(77, 83, 232, 1);
      }
    }

    .status {
      align-items: center;
      box-sizing: border-box;
      color: rgba(28, 31, 35, 0.6);
      display: flex;
      flex-shrink: 0;
      font-size: 14px;
      font-weight: 600;
      justify-content: flex-end;
      line-height: 20px;
      padding-right: 6px;
      width: 48px;
    }
  }
`;
