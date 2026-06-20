import type { LucideIcon } from 'lucide-react';
import {
  Clock3,
  Crosshair,
  GitBranch,
  Layers,
  MapPin,
  Move3d,
  Target,
  Zap,
} from 'lucide-react';
import type { PraxiogramFieldKey } from '../../models/praxiogram';

export type PraxiogramColumnDef = {
  key: PraxiogramFieldKey;
  labelEs: string;
  labelEn: string;
  shortEs: string;
  shortEn: string;
  icon: LucideIcon;
  iconClass: string;
  headTone: string;
  inputType: 'textarea' | 'select';
  minWidth: number;
};

export const PRAXIOGRAM_COLUMNS: PraxiogramColumnDef[] = [
  {
    key: 'situacionMotriz',
    labelEs: 'Situación Motriz',
    labelEn: 'Motor Situation',
    shortEs: 'Situación',
    shortEn: 'Situation',
    icon: Move3d,
    iconClass: 'text-violet-300',
    headTone: 'prx-col-head--violet',
    inputType: 'textarea',
    minWidth: 176,
  },
  {
    key: 'contextoTecnico',
    labelEs: 'Contexto Técnico',
    labelEn: 'Technical Context',
    shortEs: 'Contexto',
    shortEn: 'Context',
    icon: Layers,
    iconClass: 'text-sky-300',
    headTone: 'prx-col-head--sky',
    inputType: 'textarea',
    minWidth: 176,
  },
  {
    key: 'accionMotrizPrincipal',
    labelEs: 'Acción Motriz Principal',
    labelEn: 'Primary Motor Action',
    shortEs: 'Acción principal',
    shortEn: 'Primary action',
    icon: Zap,
    iconClass: 'text-emerald-300',
    headTone: 'prx-col-head--emerald',
    inputType: 'textarea',
    minWidth: 196,
  },
  {
    key: 'accionesSecundarias',
    labelEs: 'Acciones Secundarias',
    labelEn: 'Secondary Actions',
    shortEs: 'Secundarias',
    shortEn: 'Secondary',
    icon: GitBranch,
    iconClass: 'text-amber-300',
    headTone: 'prx-col-head--amber',
    inputType: 'textarea',
    minWidth: 176,
  },
  {
    key: 'relacionMotriz',
    labelEs: 'Relación Motriz',
    labelEn: 'Motor Relation',
    shortEs: 'Relación',
    shortEn: 'Relation',
    icon: Crosshair,
    iconClass: 'text-rose-300',
    headTone: 'prx-col-head--rose',
    inputType: 'select',
    minWidth: 156,
  },
  {
    key: 'espacio',
    labelEs: 'Espacio',
    labelEn: 'Space',
    shortEs: 'Espacio',
    shortEn: 'Space',
    icon: MapPin,
    iconClass: 'text-cyan-300',
    headTone: 'prx-col-head--cyan',
    inputType: 'select',
    minWidth: 140,
  },
  {
    key: 'tiempo',
    labelEs: 'Tiempo',
    labelEn: 'Time',
    shortEs: 'Tiempo',
    shortEn: 'Time',
    icon: Clock3,
    iconClass: 'text-fuchsia-300',
    headTone: 'prx-col-head--fuchsia',
    inputType: 'select',
    minWidth: 140,
  },
  {
    key: 'finalidadTactica',
    labelEs: 'Finalidad Táctica',
    labelEn: 'Tactical Purpose',
    shortEs: 'Finalidad',
    shortEn: 'Purpose',
    icon: Target,
    iconClass: 'text-orange-300',
    headTone: 'prx-col-head--orange',
    inputType: 'textarea',
    minWidth: 176,
  },
];
