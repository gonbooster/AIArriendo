import React from 'react';
import { Box, Typography, Slider } from '@mui/material';
import { styled } from '@mui/material/styles';

interface DualRangeSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (value: number) => string;
  icon?: React.ReactNode;
}

const RangeContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const RangeHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  gap: theme.spacing(1),
}));

const ValueDisplay = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(1),
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
}));

const StyledSlider = styled(Slider)(({ theme }) => ({
  color: 'white',
  '& .MuiSlider-thumb': {
    backgroundColor: 'white',
    border: '2px solid currentColor',
    '&:hover': {
      boxShadow: '0px 0px 0px 8px rgba(255, 255, 255, 0.16)',
    },
    '&.Mui-focusVisible': {
      boxShadow: '0px 0px 0px 8px rgba(255, 255, 255, 0.16)',
    },
  },
  '& .MuiSlider-track': {
    backgroundColor: 'white',
    border: 'none',
  },
  '& .MuiSlider-rail': {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  '& .MuiSlider-valueLabel': {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
  },
}));

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (val) => val.toString(),
  icon
}) => {
  const handleChange = (_: Event, newValue: number | number[]) => {
    onChange(newValue as [number, number]);
  };

  return (
    <RangeContainer>
      <RangeHeader>
        {icon}
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
          {label}: {formatValue(value[0])} - {formatValue(value[1])}
        </Typography>
      </RangeHeader>
      
      <StyledSlider
        value={value}
        onChange={handleChange}
        valueLabelDisplay="auto"
        valueLabelFormat={formatValue}
        min={min}
        max={max}
        step={step}
      />
      
      <ValueDisplay>
        <span>Min: {formatValue(min)}</span>
        <span>Max: {formatValue(max)}</span>
      </ValueDisplay>
    </RangeContainer>
  );
};

export default DualRangeSlider;
