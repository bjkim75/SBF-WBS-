import { useCallback, useState } from 'react';
import { readSheet } from '../../core/parser/sheetReader';
import { validateSchema } from '../../core/parser/schemaValidator';
import { mapIAColumns } from '../../core/parser/iaColumnMapper';
import { normalize } from '../../core/normalizer/iaNormalizer';
import { groupByMilestone } from '../../core/normalizer/milestoneGrouper';
import { IA_SHEET_NAME, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS } from '../../core/constants/iaSchema';
import { useFileStore } from '../../store/fileStore';
import { useDataStore } from '../../store/dataStore';
import { useFilterStore } from '../../store/filterStore';
import { SchemaValidationResult } from '../../models/raw';

interface FileUploadProps {
  onValidationError?: (result: SchemaValidationResult) => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function FileUpload({ onValidationError, onSuccess, onError }: FileUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const setFile = useFileStore(state => state.setFile);
  const setData = useDataStore(state => state.setData);
  const resetFilters = useFilterStore(state => state.resetFilters);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);

    try {
      // Step 1: Read XLSX
      const rawSheet = await readSheet(file, IA_SHEET_NAME);

      // Step 2: Schema Validation
      const validationResult = validateSchema(rawSheet.headers, IA_REQUIRED_HEADERS, IA_OPTIONAL_HEADERS);
      if (!validationResult.isValid) {
        onValidationError?.(validationResult);
        setIsLoading(false);
        return;
      }

      // Step 3: Column Mapping
      const columnMap = mapIAColumns(rawSheet.headers);

      // Step 4: Normalization
      const works = normalize(rawSheet, columnMap);

      // Step 5: Milestone Grouping
      const groups = groupByMilestone(works);

      // Step 6: Store update
      setFile(file);
      setData(works, groups);

      // Reset filters with division initialization (기본 제외 분과 제외)
      const allDivisions = [...new Set(works.map(w => w.division))].sort();
      resetFilters(allDivisions);

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : '파일 처리 중 오류가 발생했습니다.';
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [setFile, setData, resetFilters, onValidationError, onSuccess, onError]);

  return (
    <div className="file-upload">
      <label className="file-upload__label" htmlFor="xlsx-upload">
        {isLoading ? '분석 중...' : fileName ? `현재 파일: ${fileName}` : 'XLSX 파일을 선택하세요'}
      </label>
      <input
        id="xlsx-upload"
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        disabled={isLoading}
        className="file-upload__input"
      />
      {isLoading && <p className="file-upload__status">데이터를 분석하고 있습니다...</p>}
    </div>
  );
}
