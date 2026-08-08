import { useState, useRef, useCallback } from 'react';
import { useWbsStore } from '../../store/wbsStore';
import { getSheetNames, readSheet } from '../../core/parser/sheetReader';
import { validateSchema } from '../../core/parser/schemaValidator';
import { WBS_REQUIRED_HEADERS, WBS_OPTIONAL_HEADERS } from '../../core/wbs/wbsSchema';
import { normalizeWbsSheet } from '../../core/wbs/wbsNormalizer';
import { buildWorkIdIndex } from '../../core/wbs/wbsIndexBuilder';

interface WbsFileUploadProps {
  /** true이면 교체 모드 버튼으로 표시 */
  replace?: boolean;
}

export function WbsFileUpload({ replace }: WbsFileUploadProps) {
  const [sheets, setSheets] = useState<string[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setLoading = useWbsStore(state => state.setLoading);
  const setError = useWbsStore(state => state.setError);
  const setWbsData = useWbsStore(state => state.setWbsData);
  const replaceWbsData = useWbsStore(state => state.replaceWbsData);
  const wbsIndex = useWbsStore(state => state.wbsIndex);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const processSheet = useCallback(async (file: File, sheetName: string) => {
    try {
      setLoading(true);

      const rawSheet = await readSheet(file, sheetName);

      // Schema validation
      const validationResult = validateSchema(
        rawSheet.headers,
        WBS_REQUIRED_HEADERS,
        WBS_OPTIONAL_HEADERS
      );

      if (!validationResult.isValid) {
        setError({
          type: 'SCHEMA_VALIDATION_ERROR',
          message: '필수 컬럼이 누락되었습니다',
          details: validationResult.missingColumns,
        });
        return;
      }

      // Normalize
      const tickets = normalizeWbsSheet(rawSheet);

      // Build index
      const index = buildWorkIdIndex(tickets);

      // Store data (replace or set)
      if (wbsIndex) {
        replaceWbsData(tickets, index, file.name);
      } else {
        setWbsData(tickets, index, file.name);
      }

      // Clear local state
      setSheets([]);
      setPendingFile(null);
    } catch (err) {
      setError({
        type: 'PARSE_ERROR',
        message: err instanceof Error ? err.message : '파일 분석 중 오류가 발생했습니다',
      });
    }
  }, [setLoading, setError, setWbsData, replaceWbsData, wbsIndex]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const sheetNames = await getSheetNames(file);

      if (sheetNames.length === 0) {
        setError({ type: 'FILE_READ_ERROR', message: '시트를 찾을 수 없습니다' });
        return;
      }

      if (sheetNames.length === 1) {
        // Auto-select single sheet
        await processSheet(file, sheetNames[0]);
      } else {
        // Multiple sheets — show selector
        setSheets(sheetNames);
        setPendingFile(file);
        setLoading(false);
      }
    } catch (err) {
      setError({
        type: 'FILE_READ_ERROR',
        message: err instanceof Error ? err.message : '파일을 읽을 수 없습니다',
      });
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processSheet, setLoading, setError]);

  const handleSheetSelect = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sheetName = e.target.value;
    if (!sheetName || !pendingFile) return;
    await processSheet(pendingFile, sheetName);
  }, [pendingFile, processSheet]);

  return (
    <span className="wbs-upload">
      <button
        type="button"
        className="gantt-toggle-btn"
        onClick={handleButtonClick}
      >
        {replace ? 'WBS 파일 교체' : 'WBS 파일 선택'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx"
        onChange={handleFileChange}
        className="wbs-upload__input"
        aria-label="WBS XLSX 파일 선택"
      />
      {sheets.length > 1 && (
        <select onChange={handleSheetSelect} className="wbs-upload__sheet-select" defaultValue="">
          <option value="" disabled>시트 선택...</option>
          {sheets.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      )}
    </span>
  );
}
