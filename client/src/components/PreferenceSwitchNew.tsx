import React from 'react';
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography
} from '@mui/material';
import {
  Close as NoIcon,
  Star as NiceIcon,
  StarBorder as EssentialIcon
} from '@mui/icons-material';

interface PreferenceSwitchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const PreferenceSwitchNew: React.FC<PreferenceSwitchProps> = ({
  label,
  value,
  onChange,
  disabled = false
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <FormControl component="fieldset" disabled={disabled} sx={{ width: '100%' }}>
      <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>
        {label}
      </FormLabel>
      <RadioGroup
        value={value}
        onChange={handleChange}
        row
        sx={{ justifyContent: 'space-between' }}
      >
        <FormControlLabel
          value="no"
          control={<Radio size="small" />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <NoIcon fontSize="small" color="error" />
              <Typography variant="caption">No</Typography>
            </Box>
          }
          sx={{ margin: 0, flex: 1 }}
        />
        <FormControlLabel
          value="nice"
          control={<Radio size="small" />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <NiceIcon fontSize="small" color="warning" />
              <Typography variant="caption">Me gustaría</Typography>
            </Box>
          }
          sx={{ margin: 0, flex: 1 }}
        />
        <FormControlLabel
          value="essential"
          control={<Radio size="small" />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EssentialIcon fontSize="small" color="primary" />
              <Typography variant="caption">Imprescindible</Typography>
            </Box>
          }
          sx={{ margin: 0, flex: 1 }}
        />
      </RadioGroup>
    </FormControl>
  );
};

export default PreferenceSwitchNew;
