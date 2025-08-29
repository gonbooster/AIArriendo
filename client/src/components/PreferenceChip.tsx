import React from 'react';
import {
  Box,
  useTheme,
  useMediaQuery,
  Chip
} from '@mui/material';
import {
  Close as NoIcon,
  PriorityHigh as EssentialIcon,
  HelpOutline as NiceIcon
} from '@mui/icons-material';


interface PreferenceChipProps {
  label: string;
  value: 'no' | 'nice' | 'essential';
  onChange: (value: 'no' | 'nice' | 'essential') => void;
  disabled?: boolean;
}

const PreferenceChip: React.FC<PreferenceChipProps> = ({
  label,
  value,
  onChange,
  disabled = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getChipColor = () => {
    switch (value) {
      case 'no': return 'default';
      case 'nice': return 'warning';
      case 'essential': return 'success';
      default: return 'default';
    }
  };

  const getChipVariant = () => {
    return value === 'no' ? 'outlined' : 'filled';
  };

  const getIcon = () => {
    switch (value) {
      case 'no': return <NoIcon sx={{ fontSize: '16px !important' }} />;
      case 'nice': return <NiceIcon sx={{ fontSize: '16px !important' }} />;
      case 'essential': return <EssentialIcon sx={{ fontSize: '16px !important' }} />;
      default: return undefined;
    }
  };

  const getLabel = () => {
    switch (value) {
      case 'no': return `${label}`;
      case 'nice': return `${label}`;
      case 'essential': return `${label}`;
      default: return label;
    }
  };

  return (
    <Box sx={{ display: 'inline-block', m: 0.25 }}>
      <Chip
        icon={getIcon()}
        label={getLabel()}
        color={getChipColor()}
        variant={getChipVariant()}
        size="small"
        clickable
        onClick={() => {
          const nextValue = value === 'no' ? 'nice' : value === 'nice' ? 'essential' : 'no';
          onChange(nextValue);
        }}
        disabled={disabled}
        sx={{
          fontSize: '0.7rem',
          height: 28,
          maxWidth: isMobile ? 140 : 160,
          '& .MuiChip-label': {
            px: 1,
            fontSize: '0.7rem',
            fontWeight: value !== 'no' ? 600 : 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          },
          '& .MuiChip-icon': {
            fontSize: '14px',
            ml: 0.5
          },
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: 2
          },
          cursor: 'pointer',
          border: value !== 'no' ? 'none' : `1px solid ${theme.palette.grey[400]}`,
          bgcolor: value === 'no' ? 'transparent' : undefined
        }}
      />
    </Box>
  );
};

export default PreferenceChip;
