import React from 'react';

interface SliderProps {
  label?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  color?: string;
  /** CSS color for the label text. Default: '#a1a1aa' */
  labelColor?: string;
  /** 'horizontal' (default) or 'vertical' for channel faders */
  orientation?: 'horizontal' | 'vertical';
  /** Only used when orientation='horizontal'. Default: 'w-12' */
  labelWidth?: string;
  /** Only used when orientation='vertical'. Default: 'h-48' */
  faderHeight?: string;
  /** Extra classes applied to the wrapper div (horizontal only) */
  className?: string;
}

export function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  color = '#a1a1aa',
  labelColor = '#a1a1aa',
  orientation = 'horizontal',
  labelWidth = 'w-12',
  faderHeight = 'h-48',
  className = '',
}: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  if (orientation === 'vertical') {
    return (
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`flex flex-col items-center flex-shrink-0 ${faderHeight}`} style={{ contain: 'layout' }}>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            className="w-1 h-full bg-[#1a1a1a] rounded-lg cursor-pointer flex-shrink-0"
            style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: color }}
          />
        </div>
        {label && (
          <span className="text-[9px] mt-2 uppercase" style={{ color: labelColor }}>
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <span
          className={`text-[9px] uppercase font-bold ${labelWidth}`}
          style={{ color: labelColor }}
        >
          {label}
        </span>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="flex-1 h-1 bg-[#1a1a1a] rounded-lg cursor-pointer"
        style={{ accentColor: color }}
      />
    </div>
  );
}
