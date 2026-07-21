/* =================================================================
   validation-rules.js
   [업무: 데이터 품질 관리]
   project_data.json 등의 PM 데이터를 검증하는 규칙 모음입니다.
   ================================================================= */

const DataValidation = {
    /**
     * 전체 데이터 한 번에 검증
     * @returns {Array<{field, message, data}>} 오류 목록
     */
    validateAll(data = DataStore) {
        const errors = [];

        errors.push(...this.validateTasks(data.tasks || []));
        errors.push(...this.validateWorkers(data.workers || [], data.parts || []));
        errors.push(...this.validateRisks(data.risks || []));
        errors.push(...this.validateHolidays(data.holidays || []));
        errors.push(...this.validateRelations(data));

        return errors;
    },

    /**
     * Task 날짜/의존성/진행률 검증
     */
    validateTasks(tasks) {
        const errors = [];
        const idSet = new Set(tasks.map(t => t.id));

        tasks.forEach(task => {
            if (!task.id) {
                errors.push({ field: 'task.id', message: '작업 ID가 누락되었습니다.', data: task });
                return;
            }

            // 날짜 검증
            if (task.endDate < task.startDate) {
                errors.push({
                    field: 'task.dates',
                    message: `[${task.id}] 마감일이 시작일보다 빠릅니다.`,
                    data: task,
                });
            }

            // 진행률 검증
            if (task.progress < 0 || task.progress > 100) {
                errors.push({
                    field: 'task.progress',
                    message: `[${task.id}] 진행률이 0~100 범위를 벗어났습니다.`,
                    data: task,
                });
            }

            // dependency 존재 여부
            (task.dependencies || []).forEach(depId => {
                if (!idSet.has(depId)) {
                    errors.push({
                        field: 'task.dependencies',
                        message: `[${task.id}] 선행 작업 ${depId}가 존재하지 않습니다.`,
                        data: task,
                    });
                }
            });

            // parentId 존재 여부
            if (task.parentId && !idSet.has(task.parentId)) {
                errors.push({
                    field: 'task.parentId',
                    message: `[${task.id}] 부모 작업 ${task.parentId}가 존재하지 않습니다.`,
                    data: task,
                });
            }
        });

        return errors;
    },

    /**
     * Worker와 Part 관계 검증
     */
    validateWorkers(workers, parts) {
        const errors = [];
        const partNames = new Set((parts || []).map(p => p.name));

        workers.forEach(worker => {
            if (!partNames.has(worker.task)) {
                errors.push({
                    field: 'worker.task',
                    message: `[${worker.name}] 소속 업무영역 "${worker.task}"가 parts에 없습니다.`,
                    data: worker,
                });
            }
        });

        return errors;
    },

    /**
     * Risk 기본값/분류 검증
     */
    validateRisks(risks) {
        const errors = [];
        const allowedCategories = ['external', 'resource', 'technical', 'schedule'];
        const allowedSeverity = ['critical', 'high', 'medium', 'low'];

        risks.forEach(risk => {
            if (!allowedCategories.includes(risk.category)) {
                errors.push({
                    field: 'risk.category',
                    message: `[${risk.id}] 허용되지 않은 리스크 카테고리: ${risk.category}`,
                    data: risk,
                });
            }

            if (!allowedSeverity.includes(risk.severity)) {
                errors.push({
                    field: 'risk.severity',
                    message: `[${risk.id}] 허용되지 않은 심각도: ${risk.severity}`,
                    data: risk,
                });
            }
        });

        return errors;
    },

    /**
     * Holiday 날짜 범위 검증
     */
    validateHolidays(holidays) {
        const errors = [];

        holidays.forEach(holiday => {
            if (holiday.endDate < holiday.startDate) {
                errors.push({
                    field: 'holiday.dates',
                    message: `[${holiday.name}] 종료일이 시작일보다 빠릅니다.`,
                    data: holiday,
                });
            }
        });

        return errors;
    },

    /**
     * 데이터 간 관계 검증
     */
    validateRelations(data) {
        const errors = [];
        const projectIds = new Set((data.projects || []).map(p => p.id));

        // 모든 task는 projectId를 가져야 함
        (data.tasks || []).forEach(task => {
            if (!projectIds.has(task.projectId)) {
                errors.push({
                    field: 'task.projectId',
                    message: `[${task.id}] 소속 프로젝트가 존재하지 않습니다.`,
                    data: task,
                });
            }
        });

        // 모든 risk는 projectId를 가져야 함
        (data.risks || []).forEach(risk => {
            if (!projectIds.has(risk.projectId)) {
                errors.push({
                    field: 'risk.projectId',
                    message: `[${risk.id}] 소속 프로젝트가 존재하지 않습니다.`,
                    data: risk,
                });
            }
        });

        return errors;
    },
};
