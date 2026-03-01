import React, { useRef, useState, useEffect } from 'react';

interface RotaryKnobProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  color?: string;
  className?: string;
}

export function RotaryKnob({
  label,
  min,
  max,
  step,
  value,
  onChange,
  color = '#FF5F00',
  className = '',
}: RotaryKnobProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [dragAccumulator, setDragAccumulator] = useState(0);

  // Multi-turn: 3 full rotations (1080°) for the full range
  const TOTAL_ROTATION = 1080;
  const RANGE = max - min;

  const valuePercent = (value - min) / RANGE;
  const rotationAngle = valuePercent * TOTAL_ROTATION;

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setStartY(e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY;
      const newAccumulator = dragAccumulator + deltaY;
      const sensitivity = 1.5;
      const rotationDelta = newAccumulator / sensitivity;
      const valueChange = (rotationDelta / TOTAL_ROTATION) * RANGE;
      let newValue = value + valueChange;
      newValue = Math.max(min, Math.min(max, newValue));
      newValue = Math.round(newValue / step) * step;
      onChange(newValue);
      setDragAccumulator(0);
      setStartY(e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragAccumulator(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startY, dragAccumulator, value, min, max, step, TOTAL_ROTATION, RANGE, onChange]);

  const size = 48;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 18;
  const trackWidth = 2;

  const startAngle = -90;
  const normalizedRotation = rotationAngle % 360;
  const visualAngle = startAngle + normalizedRotation;
  const angleRad = (visualAngle * Math.PI) / 180;
  const endX = centerX + radius * Math.cos(angleRad);
  const endY = centerY + radius * Math.sin(angleRad);
  const largeArc = normalizedRotation > 180 ? 1 : 0;
  const arcPath = `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;

  const isAccent = color === '#FF5F00';

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        style={{
          userSelect: 'none',
          filter: isDragging && isAccent
            ? 'drop-shadow(0 0 6px rgba(255, 95, 0, 0.7))'
            : isAccent
            ? 'drop-shadow(0 0 3px rgba(255, 95, 0, 0.4))'
            : 'none',
          transition: 'filter 0.15s ease',
        }}
      >
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="#242428"
          strokeWidth={trackWidth}
        />

        {/* Active arc */}
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={trackWidth + 0.5}
          strokeLinecap="round"
        />

        {/* Center dot */}
        <circle cx={centerX} cy={centerY} r={2} fill={color} />

        {/* Knob indicator */}
        <line
          x1={centerX}
          y1={centerY - radius + 2}
          x2={centerX}
          y2={centerY - radius - 4}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          style={{
            transform: `rotate(${normalizedRotation}deg)`,
            transformOrigin: `${centerX}px ${centerY}px`,
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
          }}
        />
      </svg>

      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#8A8A94' }}>
        {label}
      </span>
      <span className="text-[10px] font-mono" style={{ color }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}
