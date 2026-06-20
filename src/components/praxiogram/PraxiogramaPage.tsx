import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { PraxiogramDocument } from '../../models/praxiogram';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import '../wl-shared/app-breadcrumb.css';
import { PraxiogramaEditor } from './PraxiogramaEditor';
import { usePraxiogramRegistry } from './usePraxiogramRegistry';
import './praxiogram.css';

interface PraxiogramaPageProps {
  isEs: boolean;
  praxiogramId: string;
  onBack: () => void;
}

const PraxiogramaPage: React.FC<PraxiogramaPageProps> = ({
  isEs,
  praxiogramId,
  onBack,
}) => {
  const { getRecord, update } = usePraxiogramRegistry();
  const { pushAlert } = useWolfAlert();
  const record = useMemo(() => getRecord(praxiogramId), [getRecord, praxiogramId]);
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);
  const [liveTitle, setLiveTitle] = useState('');

  useEffect(() => {
    if (record) setLiveTitle(record.title);
  }, [record?.id, record?.title]);

  if (!record) {
    return (
      <div className="prx-page">
        <AppBreadcrumb
          isEs={isEs}
          className="app-breadcrumb--icon-back"
          onBack={onBack}
          backLabel={isEs ? 'Praxiogramas' : 'Praxiograms'}
          items={[{ label: isEs ? 'Praxiogramas' : 'Praxiograms' }]}
        />
        <p className="wl-programs-empty">
          {isEs ? 'No se encontró el praxiograma.' : 'Praxiogram not found.'}
        </p>
      </div>
    );
  }

  const handleSave = async (document: PraxiogramDocument) => {
    update(praxiogramId, {
      title: document.title,
      sportContext: document.sportContext,
      rows: document.rows,
    });
    setLiveTitle(document.title);
    pushAlert({
      tone: 'success',
      title: isEs ? 'Praxiograma guardado' : 'Praxiogram saved',
      message: isEs ? 'Los cambios se guardaron localmente.' : 'Changes were saved locally.',
    });
  };

  return (
    <div className="prx-page">
      <div className="prx-page-top">
        <AppBreadcrumb
          isEs={isEs}
          className="app-breadcrumb--icon-back"
          onBack={onBack}
          backLabel={isEs ? 'Praxiogramas' : 'Praxiograms'}
          items={[
            { label: isEs ? 'Praxiogramas' : 'Praxiograms' },
            { label: liveTitle.trim() || (isEs ? 'Sin nombre' : 'Untitled') },
          ]}
        />
        {lastSavedLabel ? (
          <span className="prx-last-saved" role="status">
            <CheckCircle2 size={14} aria-hidden />
            {lastSavedLabel}
          </span>
        ) : null}
      </div>

      <div className="prx-page__body">
        <PraxiogramaEditor
          isEs={isEs}
          initialRows={record.rows}
          documentTitle={record.title}
          sportContext={record.sportContext}
          onTitleChange={setLiveTitle}
          onLastSavedChange={setLastSavedLabel}
          onSave={handleSave}
        />
      </div>
    </div>
  );
};

export default PraxiogramaPage;
