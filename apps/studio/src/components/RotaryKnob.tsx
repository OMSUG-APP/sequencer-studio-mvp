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
  color = '#a1a1aa',
  className = '',
}: RotaryKnobProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [dragAccumulator, setDragAccumulator] = useState(0);

  // Multi-turn: 3 full rotations (1080°) for the full range
  const TOTAL_ROTATION = 1080; // degrees for full range
  const RANGE = max - min;

  // Calculate rotation angle from value (0-360 per rotation, multi-turn)
  const valuePercent = (value - min) / RANGE;
  const rotationAngle = valuePercent * TOTAL_ROTATION;

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setStartY(e.clientY);
  };

  // Handle mouse move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY; // negative = move down, positive = move up
      const newAccumulator = dragAccumulator + deltaY;

      // Convert accumulated drag to rotation
      // Sensitivity factor: pixels of drag per degree of rotation
      const sensitivity = 1.5; // 1.5 pixels = 1 degree
      const rotationDelta = newAccumulator / sensitivity;

      // Convert rotation back to value
      const valueChange = (rotationDelta / TOTAL_ROTATION) * RANGE;
      let newValue = value + valueChange;

      // Clamp to range
      newValue = Math.max(min, Math.min(max, newValue));

      // Round to step
      newValue = Math.round(newValue / step) * step;

      onChange(newValue);
      setDragAccumulator(0);
      setStartY(e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragAccumulator(0);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, startY, dragAccumulator, value, min, max, step, TOTAL_ROTATION, RANGE, onChange]);

  // SVG size
  const size = 48;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 18;
  const trackWidth = 2;

  // Calculate arc path from 0° to current rotation
  const startAngle = -90; // Start at top

  // Normalize the visual angle for arc rendering (0-360°)
  const normalizedRotation = rotationAngle % 360;
  const visualAngle = startAngle + normalizedRotation;

  // Convert normalized angle to radians and get arc endpoint
  const angleRad = (visualAngle * Math.PI) / 180;
  const endX = centerX + radius * Math.cos(angleRad);
  const endY = centerY + radius * Math.sin(angleRad);

  // Large arc flag (1 if visual span > 180, else 0)
  // The arc spans from startAngle to visualAngle
  const largeArc = normalizedRotation > 180 ? 1 : 0;

  // Create SVG arc path
  const arcPath = `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        style={{ userSelect: 'none' }}
      >
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="#27272a"
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

        {/* Knob indicator (small line pointing to current value) */}
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

      {/* Label */}
      <span className="text-[9px] font-bold uppercase text-[#a1a1aa]">{label}</span>

      {/* Value display */}
      <span className="text-[10px] font-mono text-[#a1a1aa]">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
