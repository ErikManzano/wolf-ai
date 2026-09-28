import React from 'react';
import type { Athlete, Exercise, SessionExerciseBlock } from '../../models/training';
import { blockTonnage, blockTotalSets } from './blockMetrics';
import { formatBlockRepsMetricDisplay } from './spreadsheetBlockFormat';

export interface SpreadsheetBlockMetricsProps {
  block: SessionExerciseBlock;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  showLoadKg?: boolean;
}

function MetricCell({
  className,
  label,
  value,
  title,
}: {
  className: string;
  label: string;
  value: React.ReactNode;
  title?: string;
}) {
  return (
    <td className={className} data-metric-label={label} title={title}>
      <div className="wolf-se-spreadsheet__metric-inner">
        <span className="wolf-se-spreadsheet__metric-value">{value}</span>
        <span className="wolf-se-spreadsheet__metric-caption">{label}</span>
      </div>
    </td>
  );
}

export const SpreadsheetBlockMetrics: React.FC<SpreadsheetBlockMetricsProps> = ({
  block,
  athlete,
  exercises,
  isEs,
  showLoadKg = true,
}) => {
  const workSets = blockTotalSets(block);
  const repsMetric = formatBlockRepsMetricDisplay(block);
  const tonnage = blockTonnage(block, athlete, exercises);

  const setsLabel = isEs ? 'series' : 'sets';
  const repsLabel = isEs ? 'repeticiones' : 'reps';
  const volLabel = isEs ? 'vol. total' : 'total vol.';

  const repsTitle = repsMetric.complexNotation
    ? isEs
      ? `${repsMetric.totalReps} repeticiones totales en el bloque`
      : `${repsMetric.totalReps} total reps in block`
    : undefined;

  const volValue =
    showLoadKg && tonnage > 0 ? (
      <>
        {tonnage.toLocaleString()}
        <span className="wolf-se-spreadsheet__metric-unit">kg</span>
      </>
    ) : (
      '—'
    );

  const volTitle =
    showLoadKg && tonnage > 0
      ? isEs
        ? `Volumen estimado: ${tonnage.toLocaleString()} kg`
        : `Estimated volume: ${tonnage.toLocaleString()} kg`
      : undefined;

  return (
    <>
      <MetricCell
        className="wolf-se-spreadsheet__metric wolf-se-spreadsheet__metric--zone-start"
        label={setsLabel}
        value={workSets}
      />
      <MetricCell
        className={`wolf-se-spreadsheet__metric${repsMetric.complexNotation ? ' wolf-se-spreadsheet__metric--complex-reps' : ''}`}
        label={repsLabel}
        value={repsMetric.value}
        title={repsTitle}
      />
      <MetricCell
        className="wolf-se-spreadsheet__metric wolf-se-spreadsheet__metric--vol"
        label={volLabel}
        value={volValue}
        title={volTitle}
      />
    </>
  );
};
