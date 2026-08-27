import { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

type AlertSeverity = 'success' | 'error' | 'warning' | 'info';

export type AddAlertParams = {
  message: string;
  hideTime?: number;
  security?: AlertSeverity;
  severity?: AlertSeverity;
  vertical?: 'top' | 'bottom';
  horizontal?: 'left' | 'center' | 'right';
};

type AlertState = {
  message: string;
  hideTime: number;
  severity: AlertSeverity;
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
  key: number;
};

type ShowAlert = (params: AddAlertParams) => void;

let showAlert: ShowAlert | null = null;

export function addAlert(params: AddAlertParams) {
  showAlert?.(params);
}

export function AlertHost() {
  const [alert, setAlert] = useState<AlertState>({
    message: '',
    hideTime: 4000,
    severity: 'info',
    vertical: 'bottom',
    horizontal: 'center',
    key: 0,
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    showAlert = ({
      message,
      hideTime = 4000,
      security,
      severity,
      vertical = 'bottom',
      horizontal = 'center',
    }) => {
      setAlert((prev) => ({
        message,
        hideTime,
        severity: security ?? severity ?? 'info',
        vertical,
        horizontal,
        key: prev.key + 1,
      }));
      setOpen(true);
    };
    return () => {
      showAlert = null;
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Snackbar
      key={alert.key}
      open={open}
      autoHideDuration={alert.hideTime}
      onClose={handleClose}
      anchorOrigin={{ vertical: alert.vertical, horizontal: alert.horizontal }}
    >
      <Alert variant="filled" severity={alert.severity} onClose={handleClose}>
        {alert.message}
      </Alert>
    </Snackbar>
  );
}
