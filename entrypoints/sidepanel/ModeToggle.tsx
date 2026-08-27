import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';
import { useColorScheme } from '@mui/material/styles';

export function ModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();

  if (!mode) return null;

  const resolved = mode === 'system' ? systemMode : mode;

  return (
    <ButtonGroup size="small">
      <Button
        variant={resolved === 'light' ? 'contained' : 'outlined'}
        onClick={() => setMode('light')}
        aria-label="Light mode"
      >
        <LightMode />
      </Button>
      <Button
        variant={resolved === 'dark' ? 'contained' : 'outlined'}
        onClick={() => setMode('dark')}
        aria-label="Dark mode"
      >
        <DarkMode />
      </Button>
    </ButtonGroup>
  );
}
