// ... 기존 코드 유지 ...

/* === [PM 업무 영역: 데이터 저장소] === */
// 기존 하드코딩된 DataStore 삭제 및 외부 JSON 로드 방식으로 전환
// 상세 데이터는 data/project_data.json에 위치함

async function loadExternalData() {
    try {
        const response = await fetch('data/project_data.json');
        if (!response.ok) throw new Error('데이터 파일을 찾을 수 없습니다.');
        const data = await response.json();
        
        // [업무별 데이터 통합] 외부에서 가져온 데이터를 시스템 관리 계층에 병합
        DataManager.validateAndMerge(data);
        console.log('✅ 외부 데이터 연동 성공');
    } catch (e) {
        console.error("❌ 데이터 연동 실패: 외부 파일 로드 오류", e);
    }
}

// 기존 DataManager.loadData를 loadExternalData로 대체 실행
// ... 이후 렌더링 시작 ...