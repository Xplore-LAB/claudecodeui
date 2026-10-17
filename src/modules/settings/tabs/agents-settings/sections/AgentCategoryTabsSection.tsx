import { useTranslation, useTranslation as useUiTranslation } from 'react-i18next';

import { cn } from '@/shared/utils';
import type { AgentCategory, AgentProvider } from '@/shared/types';

type AgentCategoryTabsSectionProps = {
  categories: AgentCategory[];
  selectedAgent: AgentProvider;
  selectedCategory: AgentCategory;
  onSelectCategory: (category: AgentCategory) => void;
};

/** Rendered by AgentsSettingsTab to switch between the selected provider's categories. */
export default function AgentCategoryTabsSection({
  categories,
  selectedAgent,
  selectedCategory,
  onSelectCategory,
}: AgentCategoryTabsSectionProps) {
  const { t: tUi } = useUiTranslation('common');

  const { t } = useTranslation('settings');

  return (
    <div className="flex-shrink-0 border-b border-border">
      <div role="tablist" className="flex overflow-x-auto px-2 md:px-4">
        {categories.map((category) => (
          <button
            key={category}
            role="tab"
            aria-selected={selectedCategory === category}
            onClick={() => onSelectCategory(category)}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium touch-manipulation transition-colors duration-150',
              selectedCategory === category
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {category === 'account' && t('tabs.account')}
            {category === 'permissions' && t('tabs.permissions')}
            {category === 'mcp' && t('tabs.mcpServers')}
            {category === 'skills' && t('tabs.skills', {
              defaultValue: selectedAgent === 'opencode' ? tUi('interfaceText.sharedSkills_a7618', { defaultValue: "Shared Skills" }) : tUi('interfaceText.skills_e0921', { defaultValue: "Skills" }),
            })}
          </button>
        ))}
      </div>
    </div>
  );
}
