import React from 'react';
import { Dumbbell } from 'lucide-react';
import LegacyProgramStudio from './LegacyProgramStudio';
import './OlympicEnginePanel.css';

interface ProTemplatesModuleProps {
  language: 'ES' | 'EN';
}

const ProTemplatesModule: React.FC<ProTemplatesModuleProps> = ({ language }) => {
  const isEs = language === 'ES';
  return (
    <div className="wolf-engine">
      <header className="wolf-coach-hero">
        <div className="wolf-coach-hero-accent" aria-hidden />
        <div className="wolf-coach-hero-inner">
          <div className="wolf-coach-hero-icon-wrap">
            <Dumbbell size={26} strokeWidth={2} />
          </div>
          <div className="wolf-coach-hero-text">
            <h1 className="wolf-coach-title view-title">{isEs ? 'Plantillas Pro WL' : 'WL Pro templates'}</h1>
            <p className="wolf-coach-sub">
              {isEs
                ? 'Módulo dedicado para crear y adaptar plantillas avanzadas del coach.'
                : 'Dedicated module for creating and adapting advanced coach templates.'}
            </p>
          </div>
        </div>
      </header>
      <div className="wolf-engine-legacy-wrap">
        <LegacyProgramStudio language={language} />
      </div>
    </div>
  );
};

export default ProTemplatesModule;
