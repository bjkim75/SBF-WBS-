import { SchemaValidationResult } from '../../models/raw';

interface Props {
  result: SchemaValidationResult;
}

export function SchemaValidationAlert({ result }: Props) {
  if (result.isValid) return null;

  return (
    <div className="schema-alert" role="alert">
      <h2 className="schema-alert__title">⚠️ 스키마 검증 실패</h2>
      <p className="schema-alert__desc">
        업로드된 파일의 IA Sheet 헤더가 예상 스키마와 일치하지 않습니다.
      </p>
      
      {result.missingColumns.length > 0 && (
        <div className="schema-alert__section">
          <h3>누락된 필수 헤더 ({result.missingColumns.length}개):</h3>
          <ul>
            {result.missingColumns.map(col => (
              <li key={col} className="schema-alert__missing">{col}</li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="schema-alert__section">
          <h3>경고:</h3>
          <ul>
            {result.warnings.map((w, i) => (
              <li key={i} className="schema-alert__warning">{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
