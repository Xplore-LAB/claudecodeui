import { useTranslation as useUiTranslation } from 'react-i18next';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import {
  Download,
  Eye,
  FileText,
  Maximize2,
  Minimize2,
  Moon,
  Save,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';

import { cn } from '@/shared/utils';

type PrdEditorHeaderProps = {
  fileName: string;
  onFileNameChange: (nextFileName: string) => void;
  isNewFile: boolean;
  previewMode: boolean;
  onTogglePreview: () => void;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onDownload: () => void;
  onOpenGenerateTasks: () => void;
  canGenerateTasks: boolean;
  onSave: () => void;
  saving: boolean;
  saveSuccess: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
};

type HeaderIconButtonProps = {
  title: string;
  onClick: () => void;
  icon: ReactNode;
  active?: boolean;
};

function HeaderIconButton({ title, onClick, icon, active = false }: HeaderIconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 rounded-md min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center transition-colors',
        active
          ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/50'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
      )}
    >
      {icon}
    </button>
  );
}

/** Rendered by PrdEditorWorkspace inside the prd-editor module to hold the PRD filename field and the editor toolbar actions. */
export default function PrdEditorHeader({
  fileName,
  onFileNameChange,
  isNewFile,
  previewMode,
  onTogglePreview,
  wordWrap,
  onToggleWordWrap,
  isDarkMode,
  onToggleTheme,
  onDownload,
  onOpenGenerateTasks,
  canGenerateTasks,
  onSave,
  saving,
  saveSuccess,
  isFullscreen,
  onToggleFullscreen,
  onClose,
}: PrdEditorHeaderProps) {
  const { t: tUi } = useUiTranslation('common');

  const fileNameInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex min-w-0 flex-shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-purple-600">
          <FileText className="h-4 w-4 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <div className="flex min-w-0 flex-1 items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-purple-400 dark:focus-within:ring-purple-400">
                <input
                  ref={fileNameInputRef}
                  type="text"
                  value={fileName}
                  onChange={(event) => onFileNameChange(event.target.value)}
                  className="min-w-0 flex-1 border-none bg-transparent text-base font-medium text-gray-900 placeholder-gray-400 outline-none dark:text-white dark:placeholder-gray-500 sm:text-sm"
                  placeholder={tUi('interfaceText.enterPRDFilename_4ee47', { defaultValue: "Enter PRD filename" })}
                  maxLength={100}
                />
                <span className="ml-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 sm:text-xs">
                  .txt
                </span>
              </div>

              <button
                onClick={() => fileNameInputRef.current?.focus()}
                className="p-1 text-gray-400 transition-colors hover:text-purple-600 dark:hover:text-purple-400"
                title={tUi('interfaceText.focusFilenameInput_0c886', { defaultValue: "Focus filename input" })}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="whitespace-nowrap rounded bg-purple-100 px-2 py-1 text-xs text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                PRD
              </span>
              {isNewFile && (
                <span className="whitespace-nowrap rounded bg-green-100 px-2 py-1 text-xs text-green-600 dark:bg-green-900 dark:text-green-300">{tUi('interfaceText.new_6403f', { defaultValue: "New" })}</span>
              )}
            </div>
          </div>

          <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{tUi('interfaceText.productRequirementsDocument_cec09', { defaultValue: "Product Requirements Document" })}</p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 md:gap-2">
        <HeaderIconButton
          title={previewMode ? tUi('interfaceText.switchToEditMode_f5ad8', { defaultValue: "Switch to edit mode" }) : tUi('interfaceText.previewMarkdown_73bf1', { defaultValue: "Preview markdown" })}
          onClick={onTogglePreview}
          icon={<Eye className="h-5 w-5 md:h-4 md:w-4" />}
          active={previewMode}
        />

        <HeaderIconButton
          title={wordWrap ? tUi('interfaceText.disableWordWrap_2c3a8', { defaultValue: "Disable word wrap" }) : tUi('interfaceText.enableWordWrap_e00d4', { defaultValue: "Enable word wrap" })}
          onClick={onToggleWordWrap}
          icon={<span className="font-mono text-sm font-bold md:text-xs">{tUi('interfaceText.wRAP_21ad0', { defaultValue: "WRAP" })}</span>}
          active={wordWrap}
        />

        <HeaderIconButton
          title={tUi('interfaceText.toggleTheme_9b0ea', { defaultValue: "Toggle theme" })}
          onClick={onToggleTheme}
          icon={
            isDarkMode ? (
              <Sun className="h-5 w-5 md:h-4 md:w-4" />
            ) : (
              <Moon className="h-5 w-5 md:h-4 md:w-4" />
            )
          }
        />

        <HeaderIconButton
          title={tUi('interfaceText.downloadPRD_8f44c', { defaultValue: "Download PRD" })}
          onClick={onDownload}
          icon={<Download className="h-5 w-5 md:h-4 md:w-4" />}
        />

        <button
          onClick={onOpenGenerateTasks}
          disabled={!canGenerateTasks}
          className={cn(
            'px-3 py-2 rounded-md disabled:opacity-50 flex items-center gap-2 transition-colors text-sm font-medium text-white min-h-[44px] md:min-h-0',
            'bg-purple-600 hover:bg-purple-700',
          )}
          title={tUi('interfaceText.generateTasksFromPRDContent_193b7', { defaultValue: "Generate tasks from PRD content" })}
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden md:inline">{tUi('interfaceText.generateTasks_3c09a', { defaultValue: "Generate Tasks" })}</span>
        </button>

        <button
          onClick={onSave}
          disabled={saving}
          className={cn(
            'px-3 py-2 text-white rounded-md disabled:opacity-50 flex items-center gap-2 transition-colors min-h-[44px] md:min-h-0',
            saveSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700',
          )}
        >
          {saveSuccess ? (
            <>
              <svg className="h-5 w-5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="hidden sm:inline">{tUi('interfaceText.saved_e929b', { defaultValue: "Saved!" })}</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{saving ? tUi('interfaceText.saving_ae7e8', { defaultValue: "Saving..." }) : tUi('interfaceText.savePRD_06414', { defaultValue: "Save PRD" })}</span>
            </>
          )}
        </button>

        <button
          onClick={onToggleFullscreen}
          className="hidden items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white md:flex"
          title={isFullscreen ? tUi('interfaceText.exitFullscreen_1302d', { defaultValue: "Exit fullscreen" }) : tUi('interfaceText.fullscreen_bb08d', { defaultValue: "Fullscreen" })}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        <HeaderIconButton
          title={tUi('interfaceText.close_bbfa7', { defaultValue: "Close" })}
          onClick={onClose}
          icon={<X className="h-6 w-6 md:h-4 md:w-4" />}
        />
      </div>
    </div>
  );
}
