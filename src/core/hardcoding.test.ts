import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Hard-coding 검증 테스트
 * src/ 내 소스 파일에 IA 데이터 값이 하드코딩되어 있지 않은지 확인
 *
 * 허용되는 하드코딩 위치:
 * - src/core/constants/ (스키마 정의, NULL_SUBSTITUTES 등)
 * - CSS/스타일 관련 수치
 * - 테스트 파일 (.test.ts)
 * - testHelper 파일
 */
describe('Hard-coding Verification', () => {
  const srcDir = path.resolve(__dirname, '../');

  function getAllTsFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        files.push(...getAllTsFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        // 테스트 파일, testHelper, constants 폴더 제외
        if (
          !entry.name.includes('.test.') &&
          !entry.name.includes('testHelper') &&
          !fullPath.includes('constants') &&
          !fullPath.includes('hardcoding.test')
        ) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }

  it('소스 코드에 cells[N] 패턴의 하드코딩 인덱스가 없다', () => {
    const files = getAllTsFiles(srcDir);
    const cellIndexPattern = /cells\[\d+\]/g;
    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 주석 라인 스킵
        if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) continue;
        const matches = line.match(cellIndexPattern);
        if (matches) {
          const relativePath = path.relative(srcDir, file);
          violations.push(`${relativePath}:${i + 1} → ${matches.join(', ')}`);
        }
      }
    }

    expect(violations, `하드코딩된 cell index 발견:\n${violations.join('\n')}`).toHaveLength(0);
  });

  it('IAColumnMapper는 헤더 이름 기반으로만 매핑한다 (하드코딩 인덱스 없음)', () => {
    const mapperPath = path.resolve(srcDir, 'core/parser/iaColumnMapper.ts');
    const content = fs.readFileSync(mapperPath, 'utf-8');
    const lines = content.split('\n');
    const violations: string[] = [];

    // 패턴: 숫자 리터럴로 직접 index를 할당하는 경우 (예: workId: 1)
    // 허용: -1 (not found sentinel), findColumnIndex 호출, 배열 인덱스 접근이 아닌 경우
    const hardcodedAssignment = /:\s*(\d+)\s*[,}]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 주석 스킵
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
      // -1 허용 (not found sentinel)
      if (line.includes('-1')) continue;
      // findColumnIndex 호출은 동적 매핑이므로 허용
      if (line.includes('findColumnIndex')) continue;
      // 0 in length check patterns 허용
      if (line.includes('.length')) continue;

      const match = hardcodedAssignment.exec(line);
      if (match && parseInt(match[1]) > 0) {
        violations.push(`iaColumnMapper.ts:${i + 1} → ${line.trim()}`);
      }
    }

    expect(violations, `IAColumnMapper에 하드코딩된 인덱스:\n${violations.join('\n')}`).toHaveLength(0);
  });

  it('소스 로직 파일에 특정 담당자 이름이 하드코딩되어 있지 않다', () => {
    const files = getAllTsFiles(srcDir);
    // 한국어 이름 패턴 (2~4글자 한국어 이름) - 로직 파일에서만 검출
    // Constants에서 null substitutes로 사용되는 "미배정", "미지정 분과" 등은 제외
    const knownSubstitutes = ['미배정', '미지정 분과', '마일스톤 미지정', '업무명 없음', 'IA초안', '분과'];
    const violations: string[] = [];

    for (const file of files) {
      // UI 컴포넌트와 store는 null substitute 문자열을 사용할 수 있으므로 스킵
      const relativePath = path.relative(srcDir, file);
      if (relativePath.includes('components') || relativePath.includes('store') || relativePath === 'App.tsx') continue;
      // normalizer에서 null substitute 사용은 정상
      if (relativePath.includes('normalizer')) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) continue;
        if (line.includes('import')) continue;

        // 한국어 사람 이름처럼 보이는 3글자 패턴 (성+이름)
        // 실제 하드코딩된 이름 패턴: "홍길동", "김철수" 등
        const koreanNamePattern = /['"`][\uAC00-\uD7AF]{2,4}['"`]/g;
        const nameMatches = line.match(koreanNamePattern);
        if (nameMatches) {
          // null substitute로 사용되는 알려진 값은 제외
          const realViolations = nameMatches.filter(m => {
            const name = m.slice(1, -1);
            return !knownSubstitutes.includes(name);
          });
          if (realViolations.length > 0) {
            violations.push(`${relativePath}:${i + 1} → ${realViolations.join(', ')}`);
          }
        }
      }
    }

    expect(violations, `하드코딩된 담당자 이름:\n${violations.join('\n')}`).toHaveLength(0);
  });
});
