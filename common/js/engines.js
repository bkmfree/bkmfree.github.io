const ScheduleEngine = {
    /**
     * 2-1. 두 날짜 사이의 영업일 수 계산 (휴일 제외)
     */
    calculateWorkDays(startStr, endStr) {
        if (!startStr || !endStr) return 0;

        const start = new Date(startStr);
        const end = new Date(endStr);
        let workDays = 0;
        let holidayDays = 0;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            const dateStr = this.formatDate(d);

            // 휴일 체크
            const isHoliday = DataStore.holidays.some(h => {
                return dateStr >= h.startDate && dateStr <= (h.endDate || h.startDate);
            });

            if (isHoliday) {
                holidayDays++;
            } else if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                // 주말이 아니면 영업일
                workDays++;
            }
        }

        return { workDays, holidayDays };
    },

    /**
     * 2-2. 날짜를 YYYY-MM-DD 형식으로 변환
     */
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 2-3. 오늘 날짜 가져오기
     */
    getToday() {
        return this.formatDate(new Date());
    },

    /**
     * 2-4. 특정 주의 시작일/종료일 계산
     */
    getWeekRange(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정

        const monday = new Date(d.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);

        return {
            start: this.formatDate(monday),
            end: this.formatDate(sunday),
        };
    },

    /**
     * 2-5. 작업 지연 여부 확인
     */
    isTaskOverdue(task) {
        if (task.status === TASK_STATUS.DONE || task.status === TASK_STATUS.CANCEL) {
            return false;
        }
        const today = this.getToday();
        return task.endDate && task.endDate < today;
    },

    /**
     * 2-6. 프로젝트 전체 가중 진행률 계산
     */
    calculateProjectProgress(projectId) {
        const tasks = DataStore.tasks.filter(t =>
            t.projectId === projectId &&
            t.status !== TASK_STATUS.CANCEL
        );

        if (tasks.length === 0) return 0;

        const totalProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
        return Math.round(totalProgress / tasks.length);
    },

    /**
     * 2-7. 최근 4주간 주간 진행률 데이터 계산 (Phase 1)
     */
    calculateWeeklyTrend(projectId) {
        const weeks = [];
        const today = new Date();

        for (let i = 3; i >= 0; i--) {
            const weekDate = new Date(today);
            weekDate.setDate(weekDate.getDate() - (i * 7));
            const range = this.getWeekRange(weekDate);

            const weekTasks = DataStore.tasks.filter(t => {
                return t.projectId === projectId &&
                       t.status !== TASK_STATUS.CANCEL &&
                       t.startDate <= range.end &&
                       (t.endDate >= range.start || t.status === TASK_STATUS.DONE);
            });

            const completed = weekTasks.filter(t =>
                t.status === TASK_STATUS.DONE && t.endDate >= range.start && t.endDate <= range.end
            );
            const inProgress = weekTasks.filter(t => t.status === TASK_STATUS.INPROGRESS);
            const milestones = weekTasks.filter(t => t.isMilestone);

            const startShort = range.start.substring(5).replace('-', '.');
            const endShort = range.end.substring(5).replace('-', '.');
            const weekNumber = 4 - i;
            const weekLabel = `${weekNumber}주차 (${startShort} ~ ${endShort})`;

            weeks.push({
                label: weekLabel,
                weekNumber,
                completedCount: completed.length,
                inProgressCount: inProgress.length,
                totalCount: weekTasks.length,
                progressPercent: weekTasks.length ? Math.round((completed.length / weekTasks.length) * 100) : 0,
                completed: completed.map(t => ({
                    title: t.title,
                    assignee: t.assignee,
                    isMilestone: !!t.isMilestone,
                    part: t.part || '',
                })),
                inProgress: inProgress.map(t => ({
                    title: t.title,
                    assignee: t.assignee,
                    part: t.part || '',
                    progress: t.progress || 0,
                })),
                milestones: milestones.map(t => t.title),
            });
        }

        return weeks;
    },
};

const RiskEngine = {
    /**
     * 3-1. RISK 자동 감지 실행
     */
    autoDetectRisks(projectId) {
        const detected = [];
        const tasks = DataStore.tasks.filter(t => t.projectId === projectId);

        // 3일 이상 지연 작업 감지
        tasks.forEach(task => {
            if (ScheduleEngine.isTaskOverdue(task)) {
                const daysDiff = this.calculateDaysDiff(task.endDate, ScheduleEngine.getToday());
                if (daysDiff >= 3) {
                    detected.push({
                        type: 'schedule_delay',
                        severity: daysDiff >= 7 ? RISK_SEVERITY.HIGH : RISK_SEVERITY.MEDIUM,
                        title: `작업 지연: ${task.title}`,
                        description: `${daysDiff}일 지연됨`,
                        taskId: task.id,
                    });
                }
            }
        });

        // 담당자 과부하 감지
        const overloadedWorkers = this.detectOverloadedWorkers(projectId);
        overloadedWorkers.forEach(worker => {
            detected.push({
                type: 'resource_overload',
                severity: RISK_SEVERITY.MEDIUM,
                title: `담당자 과부하: ${worker.name}`,
                description: `${worker.taskCount}개 작업 동시 진행 중`,
                workerName: worker.name,
            });
        });

        return detected;
    },

    /**
     * 3-2. 날짜 차이 계산 (일수)
     */
    calculateDaysDiff(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    /**
     * 3-3. 과부하 담당자 감지 (5개 이상 동시 진행)
     */
    detectOverloadedWorkers(projectId) {
        const tasks = DataStore.tasks.filter(t =>
            t.projectId === projectId &&
            t.status === TASK_STATUS.INPROGRESS
        );

        const workerLoad = {};
        tasks.forEach(task => {
            if (task.assignee) {
                workerLoad[task.assignee] = (workerLoad[task.assignee] || 0) + 1;
            }
        });

        return Object.entries(workerLoad)
            .filter(([name, count]) => count >= 5)
            .map(([name, count]) => ({ name, taskCount: count }));
    },

    /**
     * 3-4. RISK를 데이터스토어에 추가
     */
    createRiskFromDetection(projectId, detection) {
        const risk = {
            id: DataManager.generateId('risk'),
            projectId: projectId,
            title: detection.title,
            description: detection.description,
            category: detection.type === 'schedule_delay' ? 'schedule' : 'resource',
            severity: detection.severity,
            probability: 'high',
            impact: 'high',
            status: RISK_STATUS.OPEN,
            createdAt: new Date().toISOString(),
            updates: [],
            autoDetected: true,
        };

        // 중복 체크
        const exists = DataStore.risks.some(r =>
            r.title === risk.title && r.status !== RISK_STATUS.MITIGATED
        );

        if (!exists) {
            DataStore.risks.push(risk);
            DataManager.addChangeLog('create', 'risk', risk.id,
                `자동 감지: ${detection.title}`, '자동감지');
            return risk;
        }

        return null;
    },
};

const ReportEngine = {
    /**
     * 4-1. 주간 보고서 데이터 생성
     */
    generateWeeklyReportData(projectId) {
        const weekRange = ScheduleEngine.getWeekRange(new Date());
        const tasks = DataStore.tasks.filter(t => t.projectId === projectId);

        // 금주 완료 작업
        const completed = tasks.filter(t =>
            t.status === TASK_STATUS.DONE &&
            t.endDate >= weekRange.start &&
            t.endDate <= weekRange.end
        );

        // 진행 중 작업
        const inProgress = tasks.filter(t => t.status === TASK_STATUS.INPROGRESS);

        // 지연 작업
        const delayed = tasks.filter(t => ScheduleEngine.isTaskOverdue(t));

        // 차주 시작 예정
        const nextWeekStart = new Date(weekRange.end);
        nextWeekStart.setDate(nextWeekStart.getDate() + 1);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

        const nextWeek = tasks.filter(t =>
            t.startDate >= ScheduleEngine.formatDate(nextWeekStart) &&
            t.startDate <= ScheduleEngine.formatDate(nextWeekEnd)
        );

        // 담당 영역별 집계
        const partStatus = this.aggregateByPart(projectId, tasks);

        // RISK 현황
        const risks = DataStore.risks.filter(r =>
            r.projectId === projectId &&
            r.status !== RISK_STATUS.MITIGATED
        );

        return {
            weekRange,
            completed,
            inProgress,
            delayed,
            nextWeek,
            partStatus,
            risks,
            plComments: DataStore.plComments,
        };
    },

    /**
     * 4-2. 담당 영역별 작업 집계
     */
    aggregateByPart(projectId, tasks) {
        const parts = {};

        DataStore.parts.forEach(part => {
            const partTasks = tasks.filter(t => {
                const worker = DataStore.workers.find(w => w.name === t.assignee);
                return worker && worker.task === part.name;
            });

            const total = partTasks.length;
            const done = partTasks.filter(t => t.status === TASK_STATUS.DONE).length;
            const inProgress = partTasks.filter(t => t.status === TASK_STATUS.INPROGRESS).length;
            const delayed = partTasks.filter(t => ScheduleEngine.isTaskOverdue(t)).length;

            parts[part.name] = {
                total,
                done,
                inProgress,
                delayed,
                progress: total > 0 ? Math.round((done / total) * 100) : 0,
            };
        });

        return parts;
    },

    /**
     * 4-3. 고객 보고서 데이터 생성 (간소화 버전)
     */
    generateClientReportData(projectId) {
        const project = DataStore.projects.find(p => p.id === projectId);
        const tasks = DataStore.tasks.filter(t => t.projectId === projectId);

        const totalProgress = ScheduleEngine.calculateProjectProgress(projectId);

        // 주요 완료 사항 (최근 2주)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const recentCompleted = tasks.filter(t =>
            t.status === TASK_STATUS.DONE &&
            t.endDate >= ScheduleEngine.formatDate(twoWeeksAgo)
        ).slice(0, 5);

        // 진행 중 주요 작업 (상위 5개)
        const majorInProgress = tasks.filter(t =>
            t.status === TASK_STATUS.INPROGRESS
        ).slice(0, 5);

        // 주요 이슈 (High 이상 RISK)
        const majorRisks = DataStore.risks.filter(r =>
            r.projectId === projectId &&
            (r.severity === RISK_SEVERITY.CRITICAL || r.severity === RISK_SEVERITY.HIGH) &&
            r.status !== RISK_STATUS.MITIGATED
        );

        return {
            project,
            totalProgress,
            recentCompleted,
            majorInProgress,
            majorRisks,
        };
    },
};