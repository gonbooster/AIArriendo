import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText
} from '@mui/material';

interface FilterSelectProps {
  label: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: string[];
  icon?: React.ReactNode;
  multiple?: boolean;
  placeholder?: string;
  color?: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  onChange,
  options,
  icon,
  multiple = false,
  placeholder,
  color = '#3b82f6'
}) => {
  const renderValue = (selected: string | string[]) => {
    if (multiple && Array.isArray(selected)) {
      if (selected.length === 0) return placeholder || `Todos los ${label.toLowerCase()}`;
      if (selected.length === 1) return selected[0];
      return `${selected.length} ${label.toLowerCase()}`;
    }
    return selected as string;
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {icon && (
          <Box sx={{ fontSize: 20, color, display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
        )}
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
          {label}
        </Typography>
      </Box>
      <FormControl fullWidth size="small">
        <Select
          multiple={multiple}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          renderValue={multiple ? renderValue : undefined}
          sx={{ 
            borderRadius: 2,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#e2e8f0',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: color,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: color,
            }
          }}
        >
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {multiple && (
                <Checkbox 
                  checked={Array.isArray(value) && value.indexOf(option) > -1}
                  size="small"
                  sx={{ color }}
                />
              )}
              <ListItemText primary={option} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );
};

export default FilterSelect;
