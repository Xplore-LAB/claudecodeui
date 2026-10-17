import { useTranslation as useUiTranslation } from 'react-i18next';
import { useMemo } from 'react';

type PrdEditorFooterProps = {
  content: string;
};

type ContentStats = {
  lines: number;
  characters: number;
  words: number;
};

function getContentStats(content: string): ContentStats {
  return {
    lines: content.split('\n').length,
    characters: content.length,
    words: content.split(/\s+/).filter(Boolean).length,
  };
}

/** Rendered by PrdEditorWorkspace inside the prd-editor module to show PRD line, character and word counts plus the shortcut hint. */
export default function PrdEditorFooter({ content }: PrdEditorFooterProps) {
  const { t: tUi } = useUiTranslation('common');

  const stats = useMemo(() => getContentStats(content), [content]);

  return (
    <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span>{tUi('interfaceText.lines_416b2', { defaultValue: "Lines:" })}{' '}{stats.lines}</span>
        <span>{tUi('interfaceText.characters_0c532', { defaultValue: "Characters:" })}{' '}{stats.characters}</span>
        <span>{tUi('interfaceText.words_e907c', { defaultValue: "Words:" })}{' '}{stats.words}</span>
        <span>{tUi('interfaceText.formatMarkdown_b86e8', { defaultValue: "Format: Markdown" })}</span>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">{tUi('interfaceText.pressCtrlSToSaveAndEscToClose_465d1', { defaultValue: "Press Ctrl+S to save and Esc to close" })}</div>
    </div>
  );
}
