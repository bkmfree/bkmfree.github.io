        // 1-1. 애플리케이션 전역 상태 객체
        var AppState = {
            currentProjectId: null,     // 현재 선택된 프로젝트 ID
            currentRole: 'pm',          // 현재 사용자 역할 (pm, pl_*, worker)
            currentView: 'dashboard',   // 현재 활성 뷰
            filterDate: null,           // 달력 필터 선택 날짜
            collapsedTasks: new Set(),  // 접힌 작업 ID 목록
            chartMode: 'month',         // 일정 차트 모드 (year, month, week)
            chartDate: new Date(),      // 일정 차트 현재 날짜
            collapsedCategories: new Set(), // 접힌 카테고리 목록 (년도별 보기)
            activeDashboardSettingId: 'setting_2', // 현재 활성 대시보드 설정 (기본=설정2)
        };

        // 1-2. 데이터 저장소 (외부 JSON + 로컬스토리지 기반)
        var DataStore = {
            projects: [],
            tasks: [],
            workers: [],
            managers: [],
            parts: [],
            risks: [],
            holidays: [],
            plComments: {},
            changelog: [],
            // 대시보드 레이아웃 설정 (설정1=6개카드, 설정2=2카드+도넛/테이블, 동적 추가 가능)
            dashboardSettings: [],
        };

        // 대시보드 설정 기본값 (초기 1회 세팅용)
        function getDefaultDashboardSettings() {
            return [
                { id: 'setting_1', name: '설정1 (6개 카드)', type: 'six',  builtin: true },
                { id: 'setting_2', name: '설정2 (2카드 + 도넛/테이블)', type: 'two', builtin: true },
                { id: 'setting_3', name: '설정3 (2카드 + 도넛/테이블)', type: 'two-left', builtin: true },
                { id: 'setting_4', name: '설정4 (2카드 + 도넛/테이블)', type: 'two-right', builtin: true },
            ];
        }


        /* =================================================================
           1. 데이터 관리 계층 (DataManager)
           - 단일 책임: 데이터 로드/저장/검증
           ================================================================= */

        var DataManager = {
            /**
             * 1-1. 데이터 로드 (우선순위: 외부 JSON -> 로컬스토리지 -> 기본값)
             * [업무 관리자: PM 데이터 우선 로드]
             */
            async loadData() {
                let loaded = false;

                // 1순위: 외부 JSON 파일 로드 (data/project_data.json)
                try {
                    const response = await fetch('data/project_data.json');
                    if (response.ok) {
                        const data = await response.json();
                        this.validateAndMerge(data);
                        this.saveData(); // 외부 데이터를 localStorage에도 저장
                        console.log('✅ 외부 데이터 연동 완료 (data/project_data.json)');
                        loaded = true;
                    }
                } catch (error) {
                    console.warn('⚠️ 외부 데이터 로드 실패, 로컬스토리지 시도:', error);
                }

                // 2순위: 로컬스토리지에서 데이터 로드
                if (!loaded) {
                    try {
                        const raw = localStorage.getItem('pmSystemData');
                        if (raw) {
                            const data = JSON.parse(raw);
                            // 안전한 병합
                            this.validateAndMerge(data);
                            console.log('✅ 로컬 데이터 로드 완료 (localStorage)');
                            loaded = true;
                        }
                    } catch (error) {
                        console.error('❌ 로컬 데이터 로드 실패:', error);
                    }
                }

                // 3순위: 기본값 초기화
                if (!loaded) {
                    this.initializeDefaultData();
                    console.log('✅ 기본 데이터 초기화 완료');
                }
            },

            /**
             * 안전한 데이터 병합: 전달된 객체의 주요 필드를 검증한 뒤 기존 DataStore와 안전하게 병합합니다.
             */
            validateAndMerge(raw) {
                if (!raw || typeof raw !== 'object') return;

                // 배열형 필드들: projects, tasks, workers, managers, parts, risks, holidays, changelog
                const arrFields = ['projects','tasks','workers','managers','parts','risks','holidays','changelog'];
                arrFields.forEach(f => {
                    if (Array.isArray(raw[f])) {
                        DataStore[f] = raw[f];
                    } else {
                        // keep existing if invalid
                    }
                });

                // 대시보드 설정 병합 (없으면 기본값, 있으면 누락된 기본 프리셋 보충)
                if (Array.isArray(raw.dashboardSettings) && raw.dashboardSettings.length > 0) {
                    const has3 = raw.dashboardSettings.some(s => s.id === 'setting_3' || s.type === 'two-left');
                    const has4 = raw.dashboardSettings.some(s => s.id === 'setting_4' || s.type === 'two-right');
                    if (!has3) {
                        raw.dashboardSettings.push({ id: 'setting_3', name: '설정3 (2카드 + 도넛/테이블)', type: 'two-left', builtin: true });
                    } else {
                        const s3 = raw.dashboardSettings.find(s => s.id === 'setting_3');
                        if (s3) s3.name = '설정3 (2카드 + 도넛/테이블)';
                    }
                    if (!has4) {
                        raw.dashboardSettings.push({ id: 'setting_4', name: '설정4 (2카드 + 도넛/테이블)', type: 'two-right', builtin: true });
                    } else {
                        const s4 = raw.dashboardSettings.find(s => s.id === 'setting_4');
                        if (s4) s4.name = '설정4 (2카드 + 도넛/테이블)';
                    }
                    DataStore.dashboardSettings = raw.dashboardSettings;
                } else {
                    DataStore.dashboardSettings = getDefaultDashboardSettings();
                }

                // ensure basic structures exist
                DataStore.projects = DataStore.projects || [];
                DataStore.tasks = DataStore.tasks || [];
                DataStore.workers = DataStore.workers || [];
                DataStore.managers = DataStore.managers || [];
                DataStore.parts = DataStore.parts || [];
                DataStore.risks = DataStore.risks || [];
                DataStore.holidays = DataStore.holidays || [];
                DataStore.plComments = DataStore.plComments || {};
                DataStore.changelog = DataStore.changelog || [];

                // basic sanitization for tasks: keep only tasks with id and projectId
                DataStore.tasks = DataStore.tasks.filter(t => t && typeof t.id === 'string' && typeof t.projectId === 'string');

                // ensure currentProjectId valid
                if (!AppState.currentProjectId && DataStore.projects.length > 0) {
                    AppState.currentProjectId = DataStore.projects[0].id;
                }
            },

            // 대시보드 설정 헬퍼
            getActiveDashboardSetting() {
                const list = DataStore.dashboardSettings || [];
                return list.find(s => s.id === AppState.activeDashboardSettingId) || list[0] || null;
            },
            getDashboardSettingById(id) {
                return (DataStore.dashboardSettings || []).find(s => s.id === id) || null;
            },

            /**
             * 1-2. 기본 데이터 초기화
             */
            initializeDefaultData() {
                DataStore.projects = [{
                    id: 'proj_' + Date.now(),
                    name: '기본 프로젝트',
                    color: '#2563eb',
                    createdAt: new Date().toISOString(),
                }];
                DataStore.tasks = [];
                DataStore.workers = [];
                DataStore.managers = [];
                DataStore.parts = [
                    { id: 'part_1', name: '기획', color: '#3b82f6', order: 1 },
                    { id: 'part_2', name: '디자인', color: '#8b5cf6', order: 2 },
                    { id: 'part_3', name: '퍼블리셔', color: '#10b981', order: 3 },
                    { id: 'part_4', name: '개발', color: '#f59e0b', order: 4 },
                    { id: 'part_5', name: 'TA', color: '#ef4444', order: 5 },
                    { id: 'part_6', name: 'AA', color: '#06b6d4', order: 6 },
                    { id: 'part_7', name: 'DA', color: '#84cc16', order: 7 },
                    { id: 'part_8', name: 'SA', color: '#f43f5e', order: 8 },
                ];
                DataStore.risks = [];
                DataStore.holidays = [];
                DataStore.plComments = {};
                DataStore.changelog = [];
                DataStore.dashboardSettings = getDefaultDashboardSettings();

                AppState.currentProjectId = DataStore.projects[0].id;
                this.saveData();
                console.log('✅ 기본 데이터 초기화 완료');
            },

            /**
             * 1-2-1. 샘플 데이터 초기화 (데모/테스트용)
             */
            initializeSampleData() {
                const today = new Date();
                const projectId = 'proj_sample_' + Date.now();

                // 프로젝트 생성
                DataStore.projects = [{
                    id: projectId,
                    name: '🚀 신규 모바일 앱 개발 프로젝트',
                    color: '#2563eb',
                    createdAt: new Date().toISOString(),
                }];

                // 담당업무 구분
                DataStore.parts = [
                    { id: 'part_1', name: '기획', color: '#3b82f6', order: 1 },
                    { id: 'part_2', name: '디자인', color: '#8b5cf6', order: 2 },
                    { id: 'part_3', name: '퍼블리셔', color: '#10b981', order: 3 },
                    { id: 'part_4', name: '개발', color: '#f59e0b', order: 4 },
                    { id: 'part_5', name: 'TA', color: '#ef4444', order: 5 },
                    { id: 'part_6', name: 'AA', color: '#06b6d4', order: 6 },
                    { id: 'part_7', name: 'DA', color: '#84cc16', order: 7 },
                    { id: 'part_8', name: 'SA', color: '#f43f5e', order: 8 },
                ];

                // 작업자 등록
                DataStore.workers = [
                    { id: 'worker_1', name: '김기획', task: '기획', phone: '010-1111-1111', email: 'planning@company.com', memo: '사업 기획 5년차' },
                    { id: 'worker_2', name: '이디자인', task: '디자인', phone: '010-2222-2222', email: 'design@company.com', memo: 'UI/UX 디자인 전문' },
                    { id: 'worker_3', name: '박퍼블', task: '퍼블리셔', phone: '010-3333-3333', email: 'publish@company.com', memo: 'HTML/CSS 마스터' },
                    { id: 'worker_4', name: '최개발', task: '개발', phone: '010-4444-4444', email: 'dev@company.com', memo: 'React Native 전문가' },
                    { id: 'worker_5', name: '정개발', task: '개발', phone: '010-5555-5555', email: 'dev2@company.com', memo: '백엔드 개발자' },
                    { id: 'worker_6', name: '강테스트', task: 'TA', phone: '010-6666-6666', email: 'qa@company.com', memo: 'QA 엔지니어' },
                ];

                // 업무 담당자 (PL)
                DataStore.managers = [
                    { id: 'manager_1', name: '홍PL', task: 'PM 총괄', phone: '010-9999-9999', email: 'pm@company.com', workers: [] },
                    { id: 'manager_2', name: '송기획PL', task: '기획 파트장', phone: '010-8888-8888', email: 'plan_pl@company.com', workers: ['김기획'] },
                    { id: 'manager_3', name: '윤개발PL', task: '개발 파트장', phone: '010-7777-7777', email: 'dev_pl@company.com', workers: ['최개발', '정개발'] },
                ];

                // 작업(WBS) 생성
                const getDate = (daysOffset) => {
                    const d = new Date(today);
                    d.setDate(d.getDate() + daysOffset);
                    return ScheduleEngine.formatDate(d);
                };

                DataStore.tasks = [
                    // 1. 기획 단계
                    {
                        id: 'task_1',
                        projectId: projectId,
                        title: '1. 요구사항 분석 및 기획',
                        wbsCode: '1.0',
                        status: 'done',
                        priority: 'high',
                        progress: 100,
                        startDate: getDate(-30),
                        endDate: getDate(-20),
                        assignee: '김기획',
                        memo: '고객 인터뷰 완료',
                        isMilestone: true,
                        dependencies: [],
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'task_1_1',
                        projectId: projectId,
                        parentId: 'task_1',
                        title: '사용자 리서치',
                        wbsCode: '1.1',
                        status: 'done',
                        priority: 'high',
                        progress: 100,
                        startDate: getDate(-30),
                        endDate: getDate(-27),
                        assignee: '김기획',
                        isMilestone: false,
                        dependencies: [],
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'task_1_2',
                        projectId: projectId,
                        parentId: 'task_1',
                        title: '기능 명세서 작성',
                        wbsCode: '1.2',
                        status: 'done',
                        priority: 'high',
                        progress: 100,
                        startDate: getDate(-26),
                        endDate: getDate(-20),
                        assignee: '김기획',
                        isMilestone: false,
                        dependencies: ['task_1_1'],
                        createdAt: new Date().toISOString(),
                    },

                    // 2. 디자인 단계
                    {
                        id: 'task_2',
                        projectId: projectId,
                        title: '2. UI/UX 디자인',
                        wbsCode: '2.0',
                        status: 'done',
                        priority: 'high',
                        progress: 100,
                        startDate: getDate(-19),
                        endDate: getDate(-10),
                        assignee: '이디자인',
                        memo: '디자인 시스템 구축 완료',
                        isMilestone: true,
                        dependencies: ['task_1'],
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'task_2_1',
                        projectId: projectId,
                        parentId: 'task_2',
                        title: '와이어프레임 작성',
                        wbsCode: '2.1',
                        status: 'done',
                        priority: 'high',
                        progress: 100,
                        startDate: getDate(-19),
                        endDate: getDate(-16),
                        assignee: '이디자인',
                        isMilestone: false,
                        dependencies: [],
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'task_2_2',
                        projectId: projectId,
                        parentId: 'task_2',
                        title: 'UI 디자인 시안',
                        wbsCode: '2.2',
                        status: 'done',
                        priority: 'high',
                        progress: 100,
                        startDate: getDate(-15),
                        endDate: getDate(-10),
                        assignee: '이디자인',
                        createdAt: new Date().toISOString(),
                    },

                    // 3. 퍼블리싱
                    {
                        id: 'task_3',
                        projectId: projectId,
                        title: '3. 화면 퍼블리싱',
                        wbsCode: '3.0',
                        status: 'inprogress',
                        priority: 'high',
                        progress: 70,
                        startDate: getDate(-9),
                        endDate: getDate(5),
                        assignee: '박퍼블',
                        memo: '80% 완료, 반응형 작업 중',
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'task_3_1',
                        projectId: projectId,
                        parentId: 'task_3',
                        title: '메인 화면 퍼블리싱',
                        wbsCode: '3.1',
                        status: 'done',
                        priority: 'high',
                        progress: 100,
                        startDate: getDate(-9),
                        endDate: getDate(-5),
                        assignee: '박퍼블',
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'task_3_2',
                        projectId: projectId,
                        parentId: 'task_3',
                        title: '상세 화면 퍼블리싱',
                        wbsCode: '3.2',
                        status: 'inprogress',
                        priority: 'high',
                        progress: 60,
                        startDate: getDate(-4),
                        endDate: getDate(5),
                        assignee: '박퍼블',
                        createdAt: new Date().toISOString(),
                    },

                    // 4. 개발 단계
                    {
                        id: 'task_4',
                        projectId: projectId,
                        title: '4. 앱 개발',
                        wbsCode: '4.0',
                        status: 'inprogress',
                        priority: 'high',
                        progress: 45,
                        startDate: getDate(-5),
                        endDate: getDate(20),
                        assignee: '최개발',
                        memo: '개발 진행 중',
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'task_4_1',
                        projectId: projectId,
                        parentId: 'task_4',
                        title: '로그인/회원가입 기능',
                        wbsCode: '4.1',
                        status: 'done',
                        priority: 'high',
                        progress: 100,
                        startDate: getDate(-5),
                        endDate: getDate(-2),
                        assignee: '최개발',
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'task_4_2',
                        projectId: projectId,
                        parentId: 'task_4',
                        title: '메인 화면 개발',
                        wbsCode: '4.2',
                        status: 'inprogress',
                        priority: 'high',
                        progress: 80,
                        startDate: getDate(-1),
                        endDate: getDate(3),
                        assignee: '최개발',
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'task_4_3',
                        projectId: projectId,
                        parentId: 'task_4',
                        title: 'API 연동',
                        wbsCode: '4.3',
                        status: 'todo',
                        priority: 'high',
                        progress: 0,
                        startDate: getDate(4),
                        endDate: getDate(10),
                        assignee: '정개발',
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'task_4_4',
                        projectId: projectId,
                        parentId: 'task_4',
                        title: '결제 모듈 연동',
                        wbsCode: '4.4',
                        status: 'todo',
                        priority: 'medium',
                        progress: 0,
                        startDate: getDate(11),
                        endDate: getDate(20),
                        assignee: '정개발',
                        memo: '외부 PG사 협의 필요',
                        createdAt: new Date().toISOString(),
                    },

                    // 5. 테스트
                    {
                        id: 'task_5',
                        projectId: projectId,
                        title: '5. 품질 보증 (QA)',
                        wbsCode: '5.0',
                        status: 'todo',
                        priority: 'high',
                        progress: 0,
                        startDate: getDate(15),
                        endDate: getDate(25),
                        assignee: '강테스트',
                        memo: '테스트 계획서 작성 예정',
                        createdAt: new Date().toISOString(),
                    },

                    // 지연된 작업 (RISK 감지용)
                    {
                        id: 'task_delay_1',
                        projectId: projectId,
                        title: '⚠️ [지연] 외부 API 문서 검토',
                        wbsCode: '4.5',
                        status: 'inprogress',
                        priority: 'high',
                        progress: 30,
                        startDate: getDate(-10),
                        endDate: getDate(-5),
                        assignee: '정개발',
                        memo: '외부 업체 응답 지연',
                        createdAt: new Date().toISOString(),
                    },
                ];

                // RISK 등록
                DataStore.risks = [
                    {
                        id: 'risk_1',
                        projectId: projectId,
                        title: '외부 API 연동 지연',
                        description: '외부 업체 API 문서 전달이 1주일 지연되어 개발 일정에 영향',
                        category: 'external',
                        severity: 'high',
                        probability: 'high',
                        impact: 'high',
                        status: 'open',
                        createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                        updates: [],
                        autoDetected: false,
                    },
                    {
                        id: 'risk_2',
                        projectId: projectId,
                        title: '개발 인력 부족',
                        description: '백엔드 개발자 1명이 프로젝트 투입 필요',
                        category: 'resource',
                        severity: 'medium',
                        probability: 'medium',
                        impact: 'high',
                        status: 'mitigating',
                        createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                        updates: [
                            {
                                timestamp: new Date().toISOString(),
                                action: '외주 개발자 섭외 진행 중',
                                user: 'pm',
                            }
                        ],
                        autoDetected: false,
                    },
                ];

                // 휴일 등록 (2026년 기준)
                DataStore.holidays = [
                    { id: 'hol_1', startDate: '2026-01-01', endDate: '2026-01-01', name: '신정' },
                    { id: 'hol_2', startDate: '2026-03-01', endDate: '2026-03-01', name: '삼일절' },
                    { id: 'hol_3', startDate: '2026-05-05', endDate: '2026-05-05', name: '어린이날' },
                    { id: 'hol_4', startDate: '2026-06-06', endDate: '2026-06-06', name: '현충일' },
                    { id: 'hol_5', startDate: '2026-08-15', endDate: '2026-08-15', name: '광복절' },
                    { id: 'hol_6', startDate: '2026-10-03', endDate: '2026-10-03', name: '개천절' },
                    { id: 'hol_7', startDate: '2026-10-09', endDate: '2026-10-09', name: '한글날' },
                    { id: 'hol_8', startDate: '2026-12-25', endDate: '2026-12-25', name: '크리스마스' },
                ];

                // PL 코멘트
                DataStore.plComments = {
                    [`${projectId}_기획`]: '요구사항 분석 완료. 추가 기능 요청 사항은 다음 스프린트에 반영 예정입니다.',
                    [`${projectId}_디자인`]: '디자인 시스템 구축 완료. 고객 피드백 2차 반영 완료했습니다.',
                    [`${projectId}_개발`]: 'API 연동 일정이 외부 요인으로 지연되고 있습니다. 대체 방안 검토 중입니다.',
                    [`${projectId}_TA`]: '테스트 계획서 작성 중. 개발 완료 시점에 맞춰 테스트 시작 예정입니다.',
                };

                // 변경 이력
                DataStore.changelog = [
                    {
                        id: 'log_1',
                        timestamp: new Date(today.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                        user: '홍PL',
                        action: 'update',
                        targetType: 'task',
                        targetId: 'task_4_2',
                        details: '메인 화면 개발 - progress: "60" → "80"',
                    },
                    {
                        id: 'log_2',
                        timestamp: new Date(today.getTime() - 3 * 60 * 60 * 1000).toISOString(),
                        user: '윤개발PL',
                        action: 'create',
                        targetType: 'risk',
                        targetId: 'risk_1',
                        details: 'RISK 생성: 외부 API 연동 지연',
                    },
                    {
                        id: 'log_3',
                        timestamp: new Date(today.getTime() - 5 * 60 * 60 * 1000).toISOString(),
                        user: '홍PL',
                        action: 'update',
                        targetType: 'task',
                        targetId: 'task_3_1',
                        details: '메인 화면 퍼블리싱 - status: "inprogress" → "done"',
                    },
                ];

                AppState.currentProjectId = projectId;
                this.saveData();
                console.log('✅ 샘플 데이터 초기화 완료');
            },

            /**
             * 1-3. 데이터 저장
             */
            saveData() {
                try {
                    localStorage.setItem('pmSystemData', JSON.stringify(DataStore));
                    console.log('💾 데이터 저장 완료');
                } catch (error) {
                    console.error('❌ 데이터 저장 실패:', error);
                    UIController.showToast('저장 실패: ' + error.message, 'error');
                }
            },

            /**
             * 1-4. 고유 ID 생성
             */
            generateId(prefix = 'item') {
                return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            },

            /**
             * 1-5. 프로젝트의 작업 목록 가져오기
             */
            getProjectTasks(projectId) {
                return DataStore.tasks.filter(t => t.projectId === projectId);
            },

            /**
             * 1-6. 역할에 따른 필터링된 작업 가져오기 (Phase 1)
             */
            getFilteredTasksByRole(projectId) {
                const tasks = this.getProjectTasks(projectId);
                const role = AppState.currentRole;

                // PM은 모든 작업 볼 수 있음
                if (role === 'pm') {
                    return tasks;
                }

                // PL은 자기 담당 영역 작업만
                if (role.startsWith('pl_')) {
                    const partName = this.getPartNameByRole(role);
                    return tasks.filter(t => {
                        const worker = DataStore.workers.find(w => w.name === t.assignee);
                        return worker && worker.task === partName;
                    });
                }

                // 작업자는 자기에게 할당된 작업만
                if (role === 'worker') {
                    // TODO: 로그인 기능 추가 시 현재 작업자 이름으로 필터링
                    return tasks;
                }

                return tasks;
            },

            /**
             * 1-7. 역할 코드를 담당업무 이름으로 변환
             */
            getPartNameByRole(role) {
                const roleMap = {
                    'pl_planning': '기획',
                    'pl_design': '디자인',
                    'pl_publisher': '퍼블리셔',
                    'pl_dev': '개발',
                    'pl_ta': 'TA',
                    'pl_aa': 'AA',
                    'pl_da': 'DA',
                    'pl_sa': 'SA',
                };
                return roleMap[role] || '';
            },

            /**
             * 1-8. 변경 이력 추가 (Phase 3)
             */
            addChangeLog(action, targetType, targetId, details, user = '시스템') {
                const log = {
                    id: this.generateId('log'),
                    timestamp: new Date().toISOString(),
                    user: user,
                    action: action,  // 'create', 'update', 'delete'
                    targetType: targetType,  // 'task', 'risk', 'project', etc.
                    targetId: targetId,
                    details: details,
                };
                DataStore.changelog.unshift(log);

                // 최대 1000개만 유지
                if (DataStore.changelog.length > 1000) {
                    DataStore.changelog = DataStore.changelog.slice(0, 1000);
                }

                this.saveData();
            },
        };
