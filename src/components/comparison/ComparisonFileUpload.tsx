import { useRef, useCallback } from 'react';
import { useComparisonStore } from '../../store/comparisonStore';
import { useDataStore } from '../../store/dataStore';
import { getSheetNames, readSheet } from '../../core/parser/sheetReader';
import { validateSchema } from '../../core/parser/schemaValidator';
import { mapIAColumns } from '../../core/parser/iaColumnMapper';
import { normalize } from '../../core/normalizer/iaNormalizer';
import { IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS } from '../../core/constants/iaSchema';

export function ComparisonFileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasBeforeData = useDataStore(state => state.normalizedWorks.length > 0);
  const setIsComparing = useComparisonStore(state => state.setIsComparing);
  const setAfterData = useComparisonStore(state => state.setAfterData);
  const setError = useComparisonStore(state => state.setError);

  const handleButtonClick = () => {
    if (!hasBeforeData) {
      setError('먼저 SBF Framework XLSX 파일을 업로드해 주세요');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsComparing(true);

      const sheetNames = await getSheetNames(file);
      const iaSheet = sheetNames.find(name => name.includes('IA'));
      if (!iaSheet) {
        setError("선택한 파일에 'IA' Sheet가 없습니다");
        return;
      }

      const rawSheet = await readSheet(file, iaSheet);

      const validationResult = validateSchema(rawSheet.headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);
      if (!validationResult.isValid) {
        setError(`필수 컬럼이 누락되었습니다: ${validationResult.missingColumns.join(', ')}`);
        return;
      }

      const columnMap = mapIAColumns(rawSheet.headers);
      const afterWorks = normalize(rawSheet, columnMap);
      setAfterData(afterWorks, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : '비교 파일 분석 중 오류가 발생했습니다');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setIsComparing, setAfterData, setError]);

  return (
    <span className="comparison-upload">
      <button
        type="button"
        className="gantt-toggle-btn"
        onClick={handleButtonClick}
        disabled={!hasBeforeData}
      >
        비교 SBF 파일선택
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx"
        onChange={handleFileChange}
        className="comparison-upload__input"
        aria-label="비교용 SBF XLSX 파일 선택"
      />
    </span>
  );
}
