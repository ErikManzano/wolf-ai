/** @deprecated Full-page composer replaced by ExerciseIntelligenceHub + drawer. */
import ExerciseIntelligenceHub from '../exercise-intelligence/ExerciseIntelligenceHub';

interface ExerciseComposerPageProps {
  language: 'ES' | 'EN';
}

const ExerciseComposerPage: React.FC<ExerciseComposerPageProps> = ({ language }) => (
  <ExerciseIntelligenceHub language={language} />
);

export default ExerciseComposerPage;
