import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title, action }) => (
  <div className="wolf-se-section-head">
    <h4 className="wolf-se-section-title">
      <Icon size={14} strokeWidth={2.25} aria-hidden />
      {title}
    </h4>
    {action}
  </div>
);
