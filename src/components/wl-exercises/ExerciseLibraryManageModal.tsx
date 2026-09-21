import { ArrowLeft, Database, Download, FolderTree, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WlCenteredModal } from '../wl-shared/WlCenteredModal';
import { FAMILY_FORM_ID, FamilyFormFields } from './FamilyFormFields';
import {
  buildLibraryExport,
  downloadLibraryExport,
  mergeLibraryImport,
  parseLibraryExport,
  previewLibraryImport,
  type LibraryExportPayload,
  type LibraryImportPreview,
} from '../../services/exercise/libraryExport';
import type { CoachExerciseOverride, ExerciseDefinition } from '../../models/exercise';
import type { CoachExerciseFamily } from '../../models/exercise/coachFamily';
import { ExerciseFamiliesPanel } from './ExerciseFamiliesPanel';

export type LibraryModalFocus = 'families' | 'backup';
type LibraryTab = LibraryModalFocus;
type FamilyFormView = { kind: 'create' } | { kind: 'edit'; family: CoachExerciseFamily };

export function ExerciseLibraryManageModal({
  isEs,
  coachId,
  definitions,
  overrides,
  customFamilies,
  busy,
  initialFocus = 'families',
  initialStartFamilyForm = false,
  onClose,
  onImport,
  onSaveFamily,
  onDeleteFamily,
}: {
  isEs: boolean;
  coachId: string;
  definitions: ExerciseDefinition[];
  overrides: CoachExerciseOverride[];
  customFamilies: CoachExerciseFamily[];
  busy?: boolean;
  initialFocus?: LibraryModalFocus;
  /** Abre directo en el formulario de nueva familia (p. ej. desde editar ejercicio). */
  initialStartFamilyForm?: boolean;
  onClose: () => void;
  onImport: (result: ReturnType<typeof mergeLibraryImport>) => Promise<void>;
  onSaveFamily: (input: {
    id?: string;
    slug: string;
    labelEs: string;
    labelEn: string;
    color?: string | null;
  }) => Promise<void>;
  onDeleteFamily: (id: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<LibraryTab>(initialFocus);
  const [familyFormView, setFamilyFormView] = useState<FamilyFormView | null>(null);
  const [preview, setPreview] = useState<LibraryImportPreview | null>(null);
  const [pendingPayload, setPendingPayload] = useState<LibraryExportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customCount = definitions.filter((def) => Boolean(def.coachId)).length;
  const overrideCount = overrides.filter((ovr) => ovr.coachId === coachId).length;

  useEffect(() => {
    setTab(initialFocus);
    setFamilyFormView(initialStartFamilyForm ? { kind: 'create' } : null);
  }, [initialFocus, initialStartFamilyForm]);

  const closeFamilyForm = useCallback(() => setFamilyFormView(null), []);

  const handleModalClose = useCallback(() => {
    if (familyFormView) {
      closeFamilyForm();
      return;
    }
    onClose();
  }, [closeFamilyForm, familyFormView, onClose]);

  const inFamilyForm = familyFormView != null;
  const editingFamily = familyFormView?.kind === 'edit' ? familyFormView.family : null;

  const handleExport = async () => {
    const payload = await buildLibraryExport({
      coachId,
      definitions,
      overrides,
      customFamilies,
    });
    downloadLibraryExport(payload);
  };

  const handleFile = async (file: File | null) => {
    setError(null);
    setPreview(null);
    setPendingPayload(null);
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseLibraryExport(JSON.parse(text));
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const nextPreview = previewLibraryImport(parsed.data, {
        definitions,
        overrides,
        customFamilies,
      });
      setPreview(nextPreview);
      setPendingPayload(parsed.data);
      setTab('backup');
    } catch {
      setError(isEs ? 'No se pudo leer el archivo JSON.' : 'Could not read JSON file.');
    }
  };

  const handleImport = async () => {
    if (!pendingPayload) return;
    const merged = mergeLibraryImport(pendingPayload, {
      definitions,
      overrides,
      customFamilies,
    });
    await onImport(merged);
    onClose();
  };

  const backToFamilies = (
    <button
      type="button"
      className="wl-exercise-library-back"
      onClick={closeFamilyForm}
    >
      <ArrowLeft size={16} aria-hidden />
      {isEs ? 'Volver a familias' : 'Back to families'}
    </button>
  );

  const tabs = (
    <div className="wl-exercise-library-tabs" role="tablist" aria-label={isEs ? 'Secciones' : 'Sections'}>
      <button
        type="button"
        role="tab"
        id="wl-library-tab-families"
        aria-selected={tab === 'families'}
        aria-controls="wl-library-panel-families"
        className={`wl-exercise-library-tabs__btn${tab === 'families' ? ' is-active' : ''}`}
        onClick={() => setTab('families')}
      >
        <FolderTree size={15} aria-hidden />
        {isEs ? 'Familias' : 'Families'}
        {customFamilies.length > 0 ? (
          <span className="wl-exercise-library-tabs__badge">{customFamilies.length}</span>
        ) : null}
      </button>
      <button
        type="button"
        role="tab"
        id="wl-library-tab-backup"
        aria-selected={tab === 'backup'}
        aria-controls="wl-library-panel-backup"
        className={`wl-exercise-library-tabs__btn${tab === 'backup' ? ' is-active' : ''}`}
        onClick={() => setTab('backup')}
      >
        <Database size={15} aria-hidden />
        {isEs ? 'Backup' : 'Backup'}
      </button>
    </div>
  );

  return (
    <WlCenteredModal
      isEs={isEs}
      kicker={isEs ? 'Ejercicios' : 'Exercises'}
      title={
        inFamilyForm
          ? editingFamily
            ? isEs
              ? 'Editar familia'
              : 'Edit family'
            : isEs
              ? 'Nueva familia'
              : 'New family'
          : isEs
            ? 'Biblioteca'
            : 'Library'
      }
      subtitle={
        inFamilyForm
          ? isEs
            ? 'Asigna esta familia al editar cualquier ejercicio.'
            : 'Assign this family when editing any exercise.'
          : isEs
            ? 'Organiza familias propias y gestiona copias de seguridad.'
            : 'Organize custom families and manage backups.'
      }
      className="wl-centered-modal--wide wl-centered-modal--exercises-light"
      headerExtra={inFamilyForm ? backToFamilies : tabs}
      onClose={handleModalClose}
      footer={
        inFamilyForm ? (
          <div className="wl-form-sheet-footer__actions">
            <button type="button" className="wl-form-sheet-btn wl-form-sheet-btn--ghost" onClick={closeFamilyForm}>
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              form={FAMILY_FORM_ID}
              className="wl-form-sheet-btn wl-form-sheet-btn--primary"
              disabled={busy}
            >
              {isEs ? 'Guardar familia' : 'Save family'}
            </button>
          </div>
        ) : preview && tab === 'backup' ? (
          <div className="wl-form-sheet-footer__actions">
            <button type="button" className="wl-form-sheet-btn wl-form-sheet-btn--ghost" onClick={() => setPreview(null)}>
              {isEs ? 'Cancelar importación' : 'Cancel import'}
            </button>
            <button
              type="button"
              className="wl-form-sheet-btn wl-form-sheet-btn--primary"
              disabled={busy}
              onClick={() => void handleImport()}
            >
              {isEs ? 'Importar' : 'Import'}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="wl-exercise-library-manage">
        {inFamilyForm ? (
          <div className="wl-exercise-library-manage__panel wl-exercise-family-form-panel">
            <FamilyFormFields
              isEs={isEs}
              initial={editingFamily}
              busy={busy}
              onSubmit={async (input) => {
                await onSaveFamily(input);
                closeFamilyForm();
              }}
            />
          </div>
        ) : (
          <>
            <div className="wl-exercise-library-stats" aria-label={isEs ? 'Resumen' : 'Summary'}>
              <span className="wl-exercise-library-stats__pill">
                {isEs ? `${customCount} personalizados` : `${customCount} custom`}
              </span>
              <span className="wl-exercise-library-stats__pill">
                {isEs ? `${overrideCount} overrides` : `${overrideCount} overrides`}
              </span>
              <span className="wl-exercise-library-stats__pill">
                {isEs
                  ? `${customFamilies.length} familia${customFamilies.length === 1 ? '' : 's'}`
                  : `${customFamilies.length} famil${customFamilies.length === 1 ? 'y' : 'ies'}`}
              </span>
            </div>

            {tab === 'families' ? (
              <div
                id="wl-library-panel-families"
                role="tabpanel"
                aria-labelledby="wl-library-tab-families"
                className="wl-exercise-library-manage__panel"
              >
                <ExerciseFamiliesPanel
                  isEs={isEs}
                  families={customFamilies}
                  busy={busy}
                  variant="modal"
                  onOpenFamilyForm={(family) =>
                    setFamilyFormView(family ? { kind: 'edit', family } : { kind: 'create' })
                  }
                  onDeleteFamily={onDeleteFamily}
                />
              </div>
            ) : (
          <section
            id="wl-library-panel-backup"
            role="tabpanel"
            aria-labelledby="wl-library-tab-backup"
            className="wl-exercise-library-manage__panel wl-exercise-library-manage__backup"
          >
            <p className="wl-exercise-library-manage__backup-lead">
              {isEs
                ? 'Exporta o importa solo tu contenido personalizado. El catálogo oficial no se incluye.'
                : 'Export or import only your custom content. Official catalog is excluded.'}
            </p>

            <div className="wl-exercise-library-manage__actions">
              <button
                type="button"
                className="wl-exercise-library-action-card wl-exercise-library-action-card--export"
                disabled={busy}
                onClick={() => void handleExport()}
              >
                <span className="wl-exercise-library-action-card__icon" aria-hidden>
                  <Download size={18} strokeWidth={2.25} />
                </span>
                <span className="wl-exercise-library-action-card__copy">
                  <strong>{isEs ? 'Exportar JSON' : 'Export JSON'}</strong>
                  <span>
                    {isEs
                      ? 'Descarga ejercicios, overrides y familias.'
                      : 'Download exercises, overrides, and families.'}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="wl-exercise-library-action-card wl-exercise-library-action-card--import"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                <span className="wl-exercise-library-action-card__icon" aria-hidden>
                  <Upload size={18} strokeWidth={2.25} />
                </span>
                <span className="wl-exercise-library-action-card__copy">
                  <strong>{isEs ? 'Importar JSON' : 'Import JSON'}</strong>
                  <span>
                    {isEs ? 'Restaura una copia con vista previa.' : 'Restore a backup with preview.'}
                  </span>
                </span>
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
            />

            {error ? <p className="wl-exercise-library-manage__error">{error}</p> : null}

            {preview ? (
              <div className="wl-exercise-library-manage__preview">
                <h4>{isEs ? 'Vista previa de importación' : 'Import preview'}</h4>
                <ul>
                  <li>
                    {isEs ? 'Ejercicios nuevos' : 'New exercises'}: {preview.newDefinitions.length}
                  </li>
                  <li>
                    {isEs ? 'Ejercicios actualizados' : 'Updated exercises'}: {preview.updatedDefinitions.length}
                  </li>
                  <li>
                    {isEs ? 'Overrides nuevos' : 'New overrides'}: {preview.newOverrides.length}
                  </li>
                  <li>
                    {isEs ? 'Overrides actualizados' : 'Updated overrides'}: {preview.updatedOverrides.length}
                  </li>
                  <li>
                    {isEs ? 'Familias nuevas' : 'New families'}: {preview.newFamilies.length}
                  </li>
                  <li>
                    {isEs ? 'Familias actualizadas' : 'Updated families'}: {preview.updatedFamilies.length}
                  </li>
                </ul>
              </div>
            ) : null}
          </section>
            )}
          </>
        )}
      </div>
    </WlCenteredModal>
  );
}
