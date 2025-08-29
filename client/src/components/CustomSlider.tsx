import React from 'react';
import { Box, Typography, Slider } from '@mui/material';

interface CustomSliderProps {
  label: string;
  value: number | number[];
  onChange: (value: number | number[]) => void;
  min: number;
  max: number;
  step: number;
  marks?: { value: number; label: string }[];
  icon?: React.ReactNode;
  color?: string;
  formatValue?: (value: number) => string;
  isRange?: boolean;
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  marks,
  icon,
  color = '#10b981',
  formatValue,
  isRange = false
}) => {
  const displayValue = () => {
    if (isRange && Array.isArray(value)) {
      const [minVal, maxVal] = value;
      if (formatValue) {
        return `${formatValue(minVal)} - ${formatValue(maxVal)}`;
      }
      return `${minVal} - ${maxVal}`;
    }
    
    if (Array.isArray(value)) {
      const [minVal, maxVal] = value;
      return `${minVal} - ${maxVal}`;
    }
    
    if (formatValue) {
      return formatValue(value);
    }
    
    return value.toString();
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {icon}
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
          {label}: {displayValue()}
        </Typography>
      </Box>
      <Box sx={{ px: 2 }}>
        <Slider
          value={value}
          onChange={(_, newValue) => onChange(newValue)}
          valueLabelDisplay="auto"
          min={min}
          max={max}
          step={step}
          marks={marks}
          sx={{
            color: color,
            '& .MuiSlider-thumb': {
              backgroundColor: color,
            },
            '& .MuiSlider-track': {
              backgroundColor: color,
            },
            '& .MuiSlider-rail': {
              backgroundColor: '#e2e8f0',
            },
            '& .MuiSlider-markLabel': {
              color: '#64748b',
              fontSize: '0.75rem'
            },
            '& .MuiSlider-valueLabel': {
              backgroundColor: color,
            }
          }}
        />
      </Box>
    </>
  );
};

export default CustomSlider;
