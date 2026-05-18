import React from 'react';
import { Gauge } from 'lucide-react';
import { PCT_PRESETS } from './blockMetrics';
import { PresetChips } from './PresetChips';
import { SectionHeader } from './SectionHeader';

interface BlockIntensityPresetsProps {
  isEs: boolean;
  primaryPct: number;
  onPctPreset: (pct: number) => void;
}

export const BlockIntensityPresets: React.FC<BlockIntensityPresetsProps> = ({
  isEs,
  primaryPct,
  onPctPreset,
}) => (
  <section className="wolf-se-section wolf-se-intensity-panel">
    <SectionHeader icon={Gauge} title={isEs ? 'Intensidad del bloque' : 'Block intensity'} />
    <PresetChips
      values={PCT_PRESETS}
      active={PCT_PRESETS.includes(primaryPct as (typeof PCT_PRESETS)[number]) ? primaryPct : undefined}
      onSelect={onPctPreset}
      suffix="%"
      aria-label={isEs ? 'Presets %1RM' : '%1RM presets'}
    />
    <p className="wolf-se-hint mb-0 mt-2">
      {isEs ? 'Aplica el % a todas las filas del bloque' : 'Applies % to all rows in this block'}
    </p>
  </section>
);
