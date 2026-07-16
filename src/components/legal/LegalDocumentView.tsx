import './legal.css';
import { LEGAL_LAST_UPDATED, privacyBody, termsBody } from './legalContent';

export type LegalDocId = 'terms' | 'privacy';

export interface LegalDocumentViewProps {
  isEs: boolean;
  doc: LegalDocId;
  onBack?: () => void;
}

export function LegalDocumentView({ isEs, doc, onBack }: LegalDocumentViewProps) {
  const title =
    doc === 'terms'
      ? isEs
        ? 'Términos de uso'
        : 'Terms of use'
      : isEs
        ? 'Política de privacidad'
        : 'Privacy policy';
  const paragraphs = doc === 'terms' ? termsBody(isEs) : privacyBody(isEs);

  return (
    <article className="wl-legal-doc">
      <header className="wl-legal-doc__header">
        {onBack ? (
          <button type="button" className="wl-legal-doc__back" onClick={onBack}>
            {isEs ? '← Volver' : '← Back'}
          </button>
        ) : null}
        <h1 className="wl-legal-doc__title">{title}</h1>
        <p className="wl-legal-doc__updated">
          {isEs ? 'Última actualización' : 'Last updated'}: {LEGAL_LAST_UPDATED}
        </p>
      </header>
      <div className="wl-legal-doc__body">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
