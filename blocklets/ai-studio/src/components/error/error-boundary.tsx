import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Result from '@arcblock/ux/lib/Result';
import { Button } from '@mui/material';
import { isAxiosError } from 'axios';
import { Component, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  error?: Error;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {};
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  // eslint-disable-next-line react/no-unused-class-component-methods
  reset = () => this.setState({ error: undefined });

  override render() {
    const { error } = this.state;
    const status = (isAxiosError(error) && error.response?.status) || 'error';
    const message =
      (isAxiosError(error) && (error.response?.data?.error?.message || error.response?.data?.message)) ||
      error?.message;

    if (error) {
      return <Result status={status} description={message} extra={<Actions />} />;
    }

    return this.props.children;
  }
}

function Actions() {
  const location = useLocation();
  const { t } = useLocaleContext();

  if (location.pathname === '/') return null;

  return (
    <Button variant="outlined" size="small" color="primary" component={Link} to="/">
      {t('backHome')}
    </Button>
  );
}
