import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Star } from 'lucide-react';
import type { ExerciseFamilyCode } from '../../models/exercise';
import type { RegistryTreeNode } from '../../models/exercise';
import { FAMILY_TOKEN } from './familyTokens';

const VARIATION_GROUPS: Record<string, { labelEs: string; labelEn: string; codes: string[] }> = {
  classic: { labelEs: 'Clásico', labelEn: 'Classic', codes: ['classic'] },
  power: { labelEs: 'Potencia', labelEn: 'Power', codes: ['power'] },
  hang: { labelEs: 'Hang', labelEn: 'Hang', codes: ['hang', 'block', 'tall'] },
  pulls: { labelEs: 'Tirones', labelEn: 'Pulls', codes: ['pull', 'high_pull'] },
  positionals: { labelEs: 'Posicionales', labelEn: 'Positionals', codes: ['muscle'] },
  complexes: { labelEs: 'Complejos', labelEn: 'Complexes', codes: ['complex'] },
};

interface SemanticExplorerProps {
  tree: RegistryTreeNode[];
  definitions: { id: string; family?: string; variation?: string; kind: string }[];
  selectedFamily: string;
  variationFilter: string | null;
  recentIds: string[];
  isEs: boolean;
  onSelectFamily: (code: string) => void;
  onSelectVariation: (code: string | null) => void;
  onSelectRecent: (id: string) => void;
}

const SemanticExplorer: React.FC<SemanticExplorerProps> = ({
  tree,
  definitions,
  selectedFamily,
  variationFilter,
  recentIds,
  isEs,
  onSelectFamily,
  onSelectVariation,
  onSelectRecent,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ snatch: true, clean: true });

  const countsByFamilyVariation = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of definitions) {
      if (d.kind === 'complex') continue;
      const key = `${d.family ?? 'accessory'}:${d.variation ?? 'classic'}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [definitions]);

  const toggle = (code: string) => setExpanded((e) => ({ ...e, [code]: !e[code] }));

  return (
    <aside className="wolf-ei-pane wolf-ei-explorer wolf-ei__layout-col wolf-ei__layout-col--explorer">
      <div className="wolf-ei-pane__head">{isEs ? 'Explorer' : 'Explorer'}</div>
      <div className="wolf-ei-pane__body wolf-ei-explorer__body">
        <button
          type="button"
          className={`wolf-ei-tree-node wolf-ei-tree-node--root${selectedFamily === 'all' && !variationFilter ? ' active' : ''}`}
          onClick={() => {
            onSelectFamily('all');
            onSelectVariation(null);
          }}
        >
          <span className="wolf-ei-tree-node__lead">
            <span className="wolf-ei-tree-node__label">{isEs ? 'Todos los movimientos' : 'All movements'}</span>
          </span>
          <span className="wolf-ei-tree-node__count" aria-hidden>
            {definitions.length}
          </span>
        </button>

        {recentIds.length > 0 && (
          <div className="wolf-ei-explorer__section">
            <div className="wolf-ei-explorer__section-title">
              <Clock size={12} aria-hidden /> {isEs ? 'Recientes' : 'Recent'}
            </div>
            {recentIds.slice(0, 5).map((id) => (
              <button
                key={id}
                type="button"
                className="wolf-ei-tree-node wolf-ei-tree-node--child"
                onClick={() => onSelectRecent(id)}
              >
                <span className="wolf-ei-tree-node__lead">
                  <span className="wolf-ei-tree-node__label wolf-ei-tree-node__truncate">{id.slice(0, 12)}…</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="wolf-ei-explorer__section">
          <div className="wolf-ei-explorer__section-title">
            <Star size={12} aria-hidden /> {isEs ? 'Familias' : 'Families'}
          </div>
          {tree.map((node) => {
            const fam = node.code;
            const tok = FAMILY_TOKEN[fam as ExerciseFamilyCode];
            const isOpen = expanded[fam] ?? false;
            const isFamActive = selectedFamily === fam && !variationFilter;
            return (
              <div key={fam} className="wolf-ei-explorer__family">
                <div className={`wolf-ei-tree-row wolf-ei-tree-row--parent${isFamActive ? ' active' : ''}`}>
                  <button
                    type="button"
                    className="wolf-ei-explorer__chevron-btn"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? (isEs ? 'Contraer' : 'Collapse') : isEs ? 'Expandir' : 'Expand'}
                    onClick={() => toggle(fam)}
                  >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <button
                    type="button"
                    className="wolf-ei-tree-row__main"
                    onClick={() => {
                      onSelectFamily(fam);
                      onSelectVariation(null);
                      if (!isOpen) toggle(fam);
                    }}
                  >
                    {tok ? (
                      <span className="wolf-ei-explorer__fam-dot" style={{ background: tok.hue }} aria-hidden />
                    ) : null}
                    <span className="wolf-ei-tree-node__label">{node.label}</span>
                  </button>
                  <span className="wolf-ei-tree-node__count" aria-hidden>
                    {node.count}
                  </span>
                </div>
                {isOpen && (
                  <div className="wolf-ei-explorer__children">
                    {Object.entries(VARIATION_GROUPS).map(([groupKey, g]) => {
                      const subCount = g.codes.reduce(
                        (n, c) => n + (countsByFamilyVariation.get(`${fam}:${c}`) ?? 0),
                        0,
                      );
                      if (subCount === 0 && fam !== 'accessory') return null;
                      const active = selectedFamily === fam && variationFilter && g.codes.includes(variationFilter);
                      return (
                        <button
                          key={groupKey}
                          type="button"
                          className={`wolf-ei-tree-node wolf-ei-tree-node--child${active ? ' active' : ''}`}
                          onClick={() => {
                            onSelectFamily(fam);
                            onSelectVariation(g.codes[0] ?? null);
                          }}
                        >
                          <span className="wolf-ei-tree-node__lead">
                            <span className="wolf-ei-tree-node__label">{isEs ? g.labelEs : g.labelEn}</span>
                          </span>
                          {subCount > 0 ? (
                            <span className="wolf-ei-tree-node__count" aria-hidden>
                              {subCount}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default SemanticExplorer;
