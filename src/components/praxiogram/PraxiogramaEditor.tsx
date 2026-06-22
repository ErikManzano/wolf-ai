import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, Reorder, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Download,
  FileImage,
  FileText,
  Layers,
  Plus,
  Settings2,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  buildPraxiogramDocument,
  createPraxiogramRow,
  PRAXIOGRAM_SEED_ROWS,
  type PraxiogramDocument,
  type PraxiogramFieldKey,
  type PraxiogramRow,
} from '../../models/praxiogram';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { PRAXIOGRAM_COLUMNS } from './praxiogram-columns';
import {
  optionLabel,
  optionValue,
  PRAXIOGRAM_FIELD_OPTIONS,
} from './praxiogram-field-options';
import { countPraxiogramRowStats } from './praxiogram-utils';
import { PraxiogramMatrixRow } from './PraxiogramMatrixRow';
import { WlEditorTitleField, WL_EDITOR_TITLE_MAX_LEN } from '../wl-shared/WlEditorTitleField';
import {
  exportPraxiogramAsPdf,
  exportPraxiogramAsPng,
  praxiogramExportFilename,
} from '../../utils/praxiogramExport';
import './praxiogram.css';

const PRX_ROW_SPRING = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.82 };

export interface PraxiogramaEditorProps {
  isEs?: boolean;
  initialRows?: PraxiogramRow[];
  documentTitle?: string;
  sportContext?: string;
  onSave?: (document: PraxiogramDocument) => void | Promise<void>;
  readOnly?: boolean;
  onLastSavedChange?: (label: string) => void;
  onTitleChange?: (title: string) => void;
}

function cloneRows(rows: PraxiogramRow[]): PraxiogramRow[] {
  return rows.map((row) => ({ ...row }));
}

function formatSavedLabel(isEs: boolean): string {
  return isEs ? 'Último guardado: ahora' : 'Last saved: just now';
}

export const PraxiogramaEditor: React.FC<PraxiogramaEditorProps> = ({
  isEs = true,
  initialRows = PRAXIOGRAM_SEED_ROWS,
  documentTitle = 'Praxiograma',
  sportContext,
  onSave,
  readOnly = false,
  onLastSavedChange,
  onTitleChange,
}) => {
  const isNarrow = useMediaQuery('(max-width: 1024px)');
  const reduceMotion = useReducedMotion();
  const { pushAlert } = useWolfAlert();
  const exportRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<PraxiogramRow[]>(() => cloneRows(initialRows));
  const [title, setTitle] = useState(documentTitle);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    setTitle(documentTitle);
  }, [documentTitle]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [exportMenuOpen]);

  const exportTitle = title.trim() || documentTitle.trim() || (isEs ? 'Praxiograma' : 'Praxiogram');
  const stats = useMemo(() => countPraxiogramRowStats(rows), [rows]);

  const runExport = useCallback(
    async (kind: 'png' | 'pdf') => {
      if (!exportRef.current || exporting) return;
      setExportMenuOpen(false);
      setExporting(true);
      try {
        const filename = praxiogramExportFilename(exportTitle, kind);
        const exportOptions = {
          title: exportTitle,
          sportContext,
          isEs,
          situationCount: stats.total,
          completeCount: stats.complete,
        };
        if (kind === 'png') {
          await exportPraxiogramAsPng(exportRef.current, filename, exportOptions);
        } else {
          await exportPraxiogramAsPdf(exportRef.current, filename, exportOptions);
        }
        pushAlert({
          tone: 'success',
          title: isEs ? 'Exportación lista' : 'Export ready',
          message:
            kind === 'png'
              ? isEs
                ? 'Imagen PNG descargada con la matriz completa.'
                : 'Full matrix PNG downloaded.'
              : isEs
                ? 'PDF descargado con la matriz completa.'
                : 'Full matrix PDF downloaded.',
        });
      } catch {
        pushAlert({
          tone: 'error',
          title: isEs ? 'No se pudo exportar' : 'Export failed',
          message: isEs ? 'Inténtalo de nuevo en unos segundos.' : 'Please try again in a few seconds.',
        });
      } finally {
        setExporting(false);
      }
    },
    [exportTitle, exporting, isEs, pushAlert, sportContext, stats.complete, stats.total],
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      onTitleChange?.(value);
    },
    [onTitleChange],
  );

  const updateCell = useCallback((rowId: string, field: PraxiogramFieldKey, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createPraxiogramRow()]);
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== rowId)));
  }, []);

  const handleReorderRows = useCallback((nextRows: PraxiogramRow[]) => {
    setRows(nextRows);
  }, []);

  const cardMotion = reduceMotion
    ? {}
    : {
        layout: true,
        initial: { opacity: 0, y: 10, scale: 0.985 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: {
          opacity: 0,
          y: -8,
          scale: 0.97,
          transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
        },
        transition: PRX_ROW_SPRING,
      };

  const handleSave = useCallback(async () => {
    const payload = buildPraxiogramDocument(rows, {
      title: title.trim() || documentTitle,
      sportContext,
    });
    setSaving(true);
    try {
      if (onSave) await onSave(payload);
      onLastSavedChange?.(formatSavedLabel(isEs));
    } finally {
      setSaving(false);
    }
  }, [documentTitle, isEs, onLastSavedChange, onSave, rows, sportContext, title]);

  const renderCellInput = (row: PraxiogramRow, col: (typeof PRAXIOGRAM_COLUMNS)[number], index: number) => {
    const placeholder = col.inputType === 'select'
      ? isEs ? 'Selecciona…' : 'Select…'
      : isEs ? 'Escribe…' : 'Type…';
    const aria = `${isEs ? col.labelEs : col.labelEn} — ${isEs ? 'Fila' : 'Row'} ${index + 1}`;

    if (col.inputType === 'select') {
      const options = PRAXIOGRAM_FIELD_OPTIONS[col.key] ?? [];
      return (
        <select
          className="prx-cell-select"
          value={row[col.key]}
          disabled={readOnly}
          aria-label={aria}
          onChange={(event) => updateCell(row.id, col.key, event.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => {
            const value = optionValue(option, isEs);
            return (
              <option key={value} value={value}>
                {optionLabel(option, isEs)}
              </option>
            );
          })}
        </select>
      );
    }

    return (
      <textarea
        className="prx-cell-textarea"
        value={row[col.key]}
        readOnly={readOnly}
        rows={2}
        placeholder={placeholder}
        aria-label={aria}
        onChange={(event) => updateCell(row.id, col.key, event.target.value)}
      />
    );
  };

  const statsBar = (
    <div className="prx-stats" aria-live="polite">
      <span className="prx-stat">
        <Layers size={14} aria-hidden />
        {stats.total} {isEs ? 'situaciones' : 'situations'}
      </span>
      <span className="prx-stat">
        <span className="prx-stat__dot prx-stat__dot--violet" aria-hidden />
        {isEs ? 'Totalmente editado' : 'Fully edited'} {stats.complete}
      </span>
      <span className="prx-stat">
        <span className="prx-stat__dot prx-stat__dot--orange" aria-hidden />
        {isEs ? 'Pendiente' : 'Pending'} {stats.pending}
      </span>
    </div>
  );

  return (
    <div className="prx-editor">
      <header className="prx-hero">
        <div className="prx-hero__main">
          <div className="prx-hero__text">
            <WlEditorTitleField
              isEs={isEs}
              value={title}
              onChange={handleTitleChange}
              maxLength={WL_EDITOR_TITLE_MAX_LEN}
              placeholder={
                isEs ? 'Ej. Judo — Situaciones de lucha' : 'E.g. Judo — Grappling situations'
              }
              label={isEs ? 'Nombre del praxiograma' : 'Praxiogram name'}
              required
              readOnly={readOnly}
            />
          </div>
        </div>
        <div className="prx-hero__actions">
          <div className="prx-export-menu" ref={exportMenuRef}>
            <button
              type="button"
              className="prx-btn prx-btn--ghost"
              disabled={exporting}
              aria-expanded={exportMenuOpen}
              aria-haspopup="menu"
              onClick={() => setExportMenuOpen((open) => !open)}
            >
              <Download size={16} aria-hidden />
              {exporting ? (isEs ? 'Exportando…' : 'Exporting…') : isEs ? 'Exportar' : 'Export'}
              <ChevronDown size={14} aria-hidden />
            </button>
            {exportMenuOpen ? (
              <div className="prx-export-menu__panel" role="menu">
                <button
                  type="button"
                  className="prx-export-menu__item"
                  role="menuitem"
                  disabled={exporting}
                  onClick={() => void runExport('png')}
                >
                  <FileImage size={16} aria-hidden />
                  {isEs ? 'Imagen PNG' : 'PNG image'}
                </button>
                <button
                  type="button"
                  className="prx-export-menu__item"
                  role="menuitem"
                  disabled={exporting}
                  onClick={() => void runExport('pdf')}
                >
                  <FileText size={16} aria-hidden />
                  PDF
                </button>
              </div>
            ) : null}
          </div>
          {!readOnly ? (
            <button type="button" className="prx-btn prx-btn--accent" disabled={saving} onClick={() => void handleSave()}>
              <CheckCircle2 size={16} aria-hidden />
              {saving ? (isEs ? 'Guardando…' : 'Saving…') : isEs ? 'Guardar cambios' : 'Save changes'}
            </button>
          ) : null}
        </div>
      </header>

      <div className="prx-toolbar">
        <div className="prx-toolbar__left">
          {!readOnly ? (
            <>
              <button type="button" className="prx-btn prx-btn--violet" onClick={addRow}>
                <Plus size={15} aria-hidden />
                {isEs ? 'Nueva situación motriz' : 'New motor situation'}
              </button>
              <button type="button" className="prx-btn prx-btn--ghost" disabled title={isEs ? 'Próximamente' : 'Coming soon'}>
                <Upload size={15} aria-hidden />
                {isEs ? 'Importar' : 'Import'}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="prx-export-surface" ref={exportRef}>
      {isNarrow ? (
        <>
        <div className="prx-mobile-meta">{statsBar}</div>
        <div className="prx-cards">
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map((row, index) => (
              <motion.article key={row.id} className="prx-card" {...cardMotion}>
              <div className="prx-card__head">
                <div className="prx-card__head-main">
                  <span className="prx-card__index">{index + 1}</span>
                  <div className="prx-card__head-text">
                    <span className="prx-card__head-kicker">
                      {isEs ? 'Situación motriz' : 'Motor situation'}
                    </span>
                    <span className="prx-card__head-title">
                      {row.situacionMotriz.trim() ||
                        (isEs ? 'Sin título' : 'Untitled')}
                    </span>
                  </div>
                </div>
                {!readOnly ? (
                  <button
                    type="button"
                    className="prx-delete-btn prx-delete-btn--card"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    aria-label={isEs ? `Eliminar situación ${index + 1}` : `Remove situation ${index + 1}`}
                  >
                    <Trash2 size={16} aria-hidden />
                    <span className="prx-delete-btn__label">
                      {isEs ? 'Eliminar' : 'Remove'}
                    </span>
                  </button>
                ) : null}
              </div>
              <div className="prx-card__fields">
                {PRAXIOGRAM_COLUMNS.map((col, colIndex) => {
                  const Icon = col.icon;
                  const label = isEs
                    ? isNarrow
                      ? col.shortEs
                      : col.labelEs
                    : isNarrow
                      ? col.shortEn
                      : col.labelEn;
                  return (
                    <label
                      key={col.key}
                      className={`prx-card__field${colIndex === 0 ? ' prx-card__field--lead' : ''}`}
                    >
                      <span className="prx-field-label">
                        <span className={`prx-field-label__icon ${col.headTone}`}>
                          <Icon size={13} className={col.iconClass} aria-hidden />
                        </span>
                        {label}
                      </span>
                      {renderCellInput(row, col, index)}
                    </label>
                  );
                })}
              </div>
              </motion.article>
            ))}
          </AnimatePresence>
          {!readOnly ? (
            <button type="button" className="prx-matrix-add rounded-xl" onClick={addRow}>
              <Plus size={16} aria-hidden />
              {isEs ? 'Añadir situación motriz' : 'Add motor situation'}
            </button>
          ) : null}
        </div>
        </>
      ) : (
        <div className="prx-matrix" role="region" aria-label={isEs ? 'Matriz de praxiograma' : 'Praxiogram matrix'}>
          <div className="prx-matrix-meta">
            {statsBar}
            {!readOnly ? (
              <button
                type="button"
                className="prx-btn prx-btn--ghost prx-btn--sm"
                disabled
                title={isEs ? 'Próximamente' : 'Coming soon'}
              >
                <Settings2 size={14} aria-hidden />
                {isEs ? 'Columnas' : 'Columns'}
                <ChevronDown size={12} aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="prx-matrix-scroll">
            <div className="prx-matrix-grid" role="table">
              <div className="prx-matrix-head" role="row">
                <div className="prx-col-order" role="columnheader" aria-label={isEs ? 'Orden' : 'Order'}>
                  <span className="prx-col-head__label prx-col-head__label--narrow">
                    <span>#</span>
                    <span>{isEs ? 'Orden' : 'Order'}</span>
                  </span>
                </div>
                {PRAXIOGRAM_COLUMNS.map((col) => {
                  const Icon = col.icon;
                  const label = isEs ? col.labelEs : col.labelEn;
                  return (
                    <div key={col.key} className={`prx-col-head ${col.headTone}`} role="columnheader">
                      <span className="prx-col-head__icon">
                        <Icon size={13} aria-hidden />
                      </span>
                      <span className="prx-col-head__label">{label}</span>
                      <button
                        type="button"
                        className="prx-col-head__help"
                        aria-label={isEs ? `Ayuda: ${label}` : `Help: ${label}`}
                        title={label}
                      >
                        <CircleHelp size={11} aria-hidden />
                      </button>
                    </div>
                  );
                })}
                <div className="prx-col-actions" role="columnheader" aria-label={isEs ? 'Acciones' : 'Actions'}>
                  <span className="prx-col-head__label prx-col-head__label--narrow">
                    <span>{isEs ? 'Acc.' : 'Act.'}</span>
                    <span>{isEs ? 'iones' : 'ions'}</span>
                  </span>
                </div>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {!readOnly ? (
                  <Reorder.Group
                    as="div"
                    axis="y"
                    values={rows}
                    onReorder={handleReorderRows}
                    className="prx-matrix-rows"
                    role="rowgroup"
                  >
                    {rows.map((row, index) => (
                      <PraxiogramMatrixRow
                        key={row.id}
                        row={row}
                        index={index}
                        isEs={isEs}
                        readOnly={readOnly}
                        canReorder
                        canRemove={rows.length > 1}
                        onRemove={removeRow}
                        renderCellInput={renderCellInput}
                      />
                    ))}
                  </Reorder.Group>
                ) : (
                  <div className="prx-matrix-rows" role="rowgroup">
                    {rows.map((row, index) => (
                      <PraxiogramMatrixRow
                        key={row.id}
                        row={row}
                        index={index}
                        isEs={isEs}
                        readOnly={readOnly}
                        canReorder={false}
                        canRemove={false}
                        onRemove={removeRow}
                        renderCellInput={renderCellInput}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {!readOnly ? (
            <button type="button" className="prx-matrix-add" onClick={addRow}>
              <Plus size={16} aria-hidden />
              {isEs ? 'Añadir situación motriz' : 'Add motor situation'}
            </button>
          ) : null}
        </div>
      )}
      </div>
    </div>
  );
};

export default PraxiogramaEditor;
