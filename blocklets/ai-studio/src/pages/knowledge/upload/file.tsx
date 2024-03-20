import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Stack, styled } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Stepper from '@mui/material/Stepper';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDocuments } from '../../../contexts/datasets/documents';
import { getErrorMessage } from '../../../libs/api';
import { uploadDocument } from '../../../libs/dataset';

const steps = ['Upload', 'Processing'];

function Upload({ onNext, onUpload }: { onNext?: () => any; onUpload: (file: File) => void }) {
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
    <>
      <Box
        width={1}
        height={300}
        display="flex"
        justifyContent="center"
        alignItems="center"
        sx={{ border: '1px dashed #ddd' }}>
        <Stack
          htmlFor="upload"
          component="label"
          gap={2}
          width={1}
          height={1}
          justifyContent="center"
          alignItems="center"
          sx={{ cursor: 'pointer' }}>
          <CloudUploadIcon sx={{ color: (theme) => theme.palette.primary.main }} />
          <Box sx={{ fontSize: '14px', color: 'rgba( 56,55,67,1)', textAlign: 'center', whiteSpace: 'break-spaces' }}>
            {t('knowledge.file.content')}
          </Box>
        </Stack>

        <Box
          id="upload"
          type="file"
          onChange={onInputChange}
          accept=".md, .txt, .pdf, .doc"
          component="input"
          display="none"
        />
      </Box>

      <Box sx={{ float: 'right', mt: 5 }}>
        <Button variant="contained" onClick={onNext} disabled>
          {t('next')}
        </Button>
      </Box>
    </>
  );
}

function Processing({ file, datasetId }: { datasetId: string; file?: File }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { refetch } = useDocuments(datasetId);

  const [status, setStatus] = useState<'pending' | 'processing' | 'completed'>('pending');
  const [error, setError] = useState('');

  const upload = async () => {
    try {
      setStatus('processing');

      if (file) {
        const form = new FormData();
        form.append('data', file);
        form.append('type', 'file');
        const result = await uploadDocument(datasetId, form);
        refetch();
        navigate(`../${datasetId}/${result.id}`);
      }
    } catch (error) {
      Toast.error(getErrorMessage(error));
      setError(getErrorMessage(error));
    } finally {
      setStatus('completed');
    }
  };

  const headerText = useMemo(() => {
    if (error) {
      return t('knowledge.file.fail');
    }

    if (status === 'pending') {
      return t('knowledge.file.pending');
    }

    if (status === 'processing') {
      return t('knowledge.file.processing');
    }

    return t('knowledge.file.completed');
  }, [error, status, t]);

  const statusText = useMemo(() => {
    if (error) {
      return '0%';
    }

    if (status === 'pending') {
      return '0%';
    }

    if (status === 'processing') {
      return '1%';
    }

    return '100%';
  }, [error, status]);

  return (
    <>
      <ProcessingContainer>
        <Box sx={{ m: '24px 0 17px', fontWeight: 600, lineHeight: '22px', fontSize: '14px' }}>{headerText}</Box>
        <Box
          sx={{
            border: '1px solid rgba(29,28,35,.12)',
            borderRadius: 1,
            maxHeight: '532px',
            p: '23px 35px 23px 24px',
          }}>
          <Box className="file">
            <Box className="content" sx={{ background: (theme) => theme.palette.action.hover }}>
              <Box className="text" sx={{ background: (theme) => theme.palette.primary.main }}>
                {file?.name}
              </Box>
              <Box
                className="background"
                sx={{ width: statusText, background: (theme) => theme.palette.primary.main }}
              />
            </Box>

            <Box className="status">{statusText}</Box>
          </Box>
        </Box>
      </ProcessingContainer>

      <Box sx={{ float: 'right', mt: 5 }}>
        <Button
          variant="contained"
          onClick={() => {
            if (status === 'pending') {
              upload();
            } else if (status === 'completed') {
              navigate(`../${datasetId}`);
            }
          }}
          disabled={status === 'processing'}>
          {status === 'pending' ? t('knowledge.file.pending') : t('next')}
        </Button>
      </Box>
    </>
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

  const handleNext = () => {
    setActiveStep(activeStep + 1);
  };

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
            onUpload={(file) => {
              setFile(file);
              handleNext();
            }}
            onNext={handleNext}
          />
        )}
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
      border-radius: 8px;
      flex: 1 1;
      overflow: hidden;
      position: relative;
      height: 32px;

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
