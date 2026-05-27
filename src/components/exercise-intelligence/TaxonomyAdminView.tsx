import React from 'react';
import type { ExerciseTaxonomyBundle } from '../../models/exercise';

interface TaxonomyAdminViewProps {
  taxonomy: ExerciseTaxonomyBundle;
  isEs: boolean;
}

const TaxonomyAdminView: React.FC<TaxonomyAdminViewProps> = ({ taxonomy, isEs }) => {
  return (
    <div className="wolf-ei-pane wolf-ei-collections">
      <div className="wolf-ei-pane__head">{isEs ? 'Gobernanza taxonomía' : 'Taxonomy governance'}</div>
      <div className="wolf-ei-pane__body">
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
          {isEs
            ? 'Catálogo global versionado. Edición en DB vía seeds / super admin (próxima iteración: CRUD en UI).'
            : 'Versioned global catalog. DB edits via seeds / super admin (CRUD UI next iteration).'}
        </p>
        {taxonomy.families.map((f) => (
          <div key={f.code} className="wolf-ei-section" style={{ marginTop: 0, paddingTop: '0.5rem' }}>
            <h3>
              {isEs ? f.labelEs : f.labelEn} <span className="muted">({f.code})</span>
            </h3>
            <div className="wolf-ei-chips">
              {taxonomy.variations.slice(0, 8).map((v) => (
                <span key={v.code} className="wolf-ei-chip">
                  {v.code}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaxonomyAdminView;
