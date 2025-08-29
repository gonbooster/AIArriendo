import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PriorityHigh,
  ThumbUp,
  Close
} from '@mui/icons-material';

interface PreferenceSwitchProps {
  value: 'no' | 'me_gustaria' | 'imprescindible';
  onChange: (value: 'no' | 'me_gustaria' | 'imprescindible') => void;
  label: string;
}

const SwitchContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  }
}));

const OptionButton = styled(Box)<{ active: boolean; optionKey: string }>(({ theme, active, optionKey }) => {
  const getColors = () => {
    switch (optionKey) {
      case 'imprescindible':
        return { bg: '#ef4444', hover: '#dc2626' };
      case 'me_gustaria':
        return { bg: '#3b82f6', hover: '#2563eb' };
      default:
        return { bg: '#6b7280', hover: '#4b5563' };
    }
  };

  const colors = getColors();

  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: theme.spacing(0.5, 0.75),
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.7rem',
    fontWeight: 600,
    textAlign: 'center',
    flex: 1,
    minHeight: '40px',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: active ? colors.bg : '#f1f5f9',
    color: active ? 'white' : '#64748b',
    border: `1px solid ${active ? colors.bg : '#e2e8f0'}`,
    '&:hover': {
      backgroundColor: colors.hover,
      color: 'white',
      borderColor: colors.hover,
    },
    [theme.breakpoints.up('sm')]: {
      flex: 'none',
      minWidth: '60px',
      fontSize: '0.75rem',
      padding: theme.spacing(0.5, 1),
    }
  };
});

const PreferenceSwitch: React.FC<PreferenceSwitchProps> = ({ value, onChange, label }) => {
  const options = [
    { key: 'no', label: 'No', icon: Close },
    { key: 'me_gustaria', label: 'Me Gusta', icon: ThumbUp },
    { key: 'imprescindible', label: 'Vital', icon: PriorityHigh }
  ] as const;

  return (
    <SwitchContainer>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          flex: 1,
          fontSize: '0.875rem',
          color: '#1e293b',
          lineHeight: 1.2
        }}
      >
        {label}
      </Typography>

      <Box sx={{
        display: 'flex',
        gap: 0.5,
        width: '100%',
        '@media (max-width: 600px)': {
          gap: 0.25
        }
      }}>
        {options.map((option) => {
          const IconComponent = option.icon;
          return (
            <OptionButton
              key={option.key}
              active={value === option.key}
              optionKey={option.key}
              onClick={() => onChange(option.key)}
            >
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.25
              }}>
                <IconComponent sx={{ fontSize: '14px' }} />
                <Box sx={{
                  fontSize: '0.6rem',
                  lineHeight: 1,
                  textAlign: 'center'
                }}>
                  {option.label}
                </Box>
              </Box>
            </OptionButton>
          );
        })}
      </Box>
    </SwitchContainer>
  );
};

export default PreferenceSwitch;
