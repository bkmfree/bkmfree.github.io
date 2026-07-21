        const DashboardRenderer = {
            /**
             * 6-1. 대시보드 전체 렌더링
             */
            render() {
                this.renderStats();
                this.renderTrendChart();
                this.renderPartStatus();
                this.renderAlerts();
                this.renderCalendar();
                this.renderKanban();
            },

            /**
             * 6-2. 통계 카드 렌더링 (건강도 포함)
             */
            renderStats() {
                const projectId = AppState.currentProjectId;
                if (!projectId) return;

                const tasks = DataManager.getFilteredTasksByRole(projectId);

                // 기준일자 = 지난주 금요일 (주간 마감 기준 as-of, 로컬 시간대)
                const now = new Date();
                const day = now.getDay(); // 0=일, 5=금
                const diff = (day <= 5) ? day + 2 : day - 5;
                const asOfDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
                const y = asOfDate.getFullYear();
                const m = String(asOfDate.getMonth() + 1).padStart(2, '0');
                const d = String(asOfDate.getDate()).padStart(2, '0');
                const dateLabel = `${y}.${m}.${d}`;

                // 기준일자(지난주 금요일)까지 착수(시작)된 작업만 집계 (as-of 방식)
                const asOfTasks = tasks.filter(t => {
                    const sd = t.startDate ? new Date(t.startDate) : null;
                    return !sd || sd <= asOfDate;
                });

                const total = asOfTasks.length;
                const done = asOfTasks.filter(t => t.status === TASK_STATUS.DONE).length;
                const inProgress = asOfTasks.filter(t => t.status === TASK_STATUS.INPROGRESS).length;
                const notStarted = asOfTasks.filter(t => t.status === TASK_STATUS.TODO).length;
                const overdue = asOfTasks.filter(t => ScheduleEngine.isTaskOverdue(t)).length;
                const progress = asOfTasks.length
                    ? Math.round(asOfTasks.reduce((s, t) => s + (t.progress || 0), 0) / asOfTasks.length)
                    : 0;


                // 건강도 점수 계산 (07.21 착수분 기준)
                const healthScore = this.calculateHealthScore(asOfTasks, overdue, progress);
                const healthLevel = this.getHealthLevel(healthScore);
                const notStartedPct = total > 0 ? Math.round((notStarted / total) * 100) : 0;
                const overduePct = total > 0 ? Math.round((overdue / total) * 100) : 0;
                const donePct = total > 0 ? (done / total) * 100 : 0;
                const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;

                // 진행중 업무별 진행률 평균 계산 (07.21 착수분 기준)
                const inProgressTasks = asOfTasks.filter(t => t.status === TASK_STATUS.INPROGRESS);
                const inProgVals = inProgressTasks.map(t => Math.round(t.progress || 0));
                const inProgressAvg = inProgressTasks.length
                    ? Math.round(inProgVals.reduce((s, v) => s + v, 0) / inProgressTasks.length)
                    : 0;

                const html = `
                    <div class="stat-card health health-score-card" style="display:flex; flex-direction:column; min-height:130px; background:#fff;">
                        <div class="stat-label-row health-header">
                            <span class="stat-label-text">프로젝트 건강도</span>
                            <div class="stat-help-wrap">
                              <span class="stat-help-icon" data-help="health" data-date="${dateLabel}" aria-label="건강도 기준 설명" style="background:#8b5cf6; color:#fff; border-color:#8b5cf6;">i</span>
                              <span class="stat-help-balloon" aria-hidden="true"><strong>프로젝트 건강도</strong><br/>100점 만점 (완료율·지연·리스크 반영)<br/>80↑ 우수 / 60↑ 양호 / 40↑ 주의 / 39↓ 위험<br/>기준일자: ${dateLabel}</span>
                            </div>
                        </div>
                        <div class="stat-value">${healthScore}</div>
                        <div class="stat-sub success">${healthLevel.label}</div>
                    </div>

                    <div class="stat-card" style="display:flex; flex-direction:column; min-height:130px;"">
                        <div class="stat-label-row gray-header">
                            <span class="stat-label-text">전체 작업</span>
                            <div class="stat-help-wrap">
                              <span class="stat-help-icon" data-help="total" data-date="${dateLabel}" aria-label="전체 작업 도움말" style="background:#6b7280; color:#fff; border-color:#6b7280;">i</span>
                              <span class="stat-help-balloon" aria-hidden="true"><strong>전체 작업</strong><br/>지난주 작업 건수: ${total}<br/>기준일자: ${dateLabel}</span>
                            </div>
                        </div>
                        <div class="stat-value">${total}</div>
                        <div class="stat-sub success">통계 기준일자 : ${dateLabel}</div>
                    </div>
                    <div class="stat-card" style="display:flex; flex-direction:column; min-height:130px;" done">
                        <div class="stat-label-row green-header">
                            <span class="stat-label-text">완료</span>
                            <div class="stat-help-wrap">
                              <span class="stat-help-icon" data-help="done" data-date="${dateLabel}" aria-label="완료 도움말" style="background:#10b981; color:#fff; border-color:#10b981;">i</span>
                              <span class="stat-help-balloon" aria-hidden="true"><strong>완료</strong><br/>완료율 = 완료 / 전체 건수<br/>예) ${done}/${total} = ${donePct.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div class="stat-value">${done}</div>
                        <div class="stat-sub">전체 대비 ${donePct.toFixed(1)}% (${done}/${total})</div>
                        <div class="progress-bar-outer" style="margin-top: auto;">
                            <div class="progress-bar-inner" style="width: ${donePct}%"></div>
                        </div>
                    </div>
                    <div class="stat-card" style="display:flex; flex-direction:column; min-height:130px;" progress">
                        <div class="stat-label-row blue-header">
                            <span class="stat-label-text">진행중</span>
                            <div class="stat-help-wrap">
                              <span class="stat-help-icon" data-help="progress" data-date="${dateLabel}" aria-label="진행중 도움말" style="background:#3b82f6; color:#fff; border-color:#3b82f6;">i</span>
                              <span class="stat-help-balloon" aria-hidden="true"><strong>진행중</strong><br/>건수 비율 = 진행중 / 전체 건수<br/>가중 진행률 = (Σ 각 업무 진행률) / 전체 건수<br/>예) ${inProgress}/${total} = ${inProgressPct.toFixed(1)}% / 가중 ${progress}%<br/><br/>진행중 평균 = (${inProgVals.join('+')}) ÷ ${inProgress} = ${inProgressAvg}%</span>
                            </div>
                        </div>
                        <div class="stat-value">${inProgress}</div>
                        <div class="stat-sub">전체 대비 ${inProgressPct.toFixed(1)}% (${inProgress}/${total})<br/>가중 진행률 ${progress}% (Σ업무진행률÷${total})</div>
                        <div class="progress-bar-outer" style="margin-top: auto;">
                            <div class="progress-bar-inner" style="width: ${Math.max(inProgressPct, 5)}%; background: #3b82f6;"></div>
                        </div>
                    </div>
                    <div class="stat-card" style="display:flex; flex-direction:column; min-height:130px;" todo">
                        <div class="stat-label-row orange-header">
                            <span class="stat-label-text">대기</span>
                            <div class="stat-help-wrap">
                              <span class="stat-help-icon" data-help="todo" data-date="${dateLabel}" aria-label="대기 도움말" style="background:#f59e0b; color:#fff; border-color:#f59e0b;">i</span>
                              <span class="stat-help-balloon" aria-hidden="true"><strong>대기</strong><br/>시작대기 중인 task 수: ${notStarted}</span>
                            </div>
                        </div>
                        <div class="stat-value">${notStarted}</div>
                        <div class="stat-sub">전체 대비 ${notStartedPct.toFixed(1)}% (${notStarted}/${total})</div>
                        <div class="progress-bar-outer" style="margin-top: auto;">
                            <div class="progress-bar-inner todo-bar" style="width: ${Math.max(notStartedPct, 2)}%; background: #f59e0b;"></div>
                        </div>
                    </div>
                    <div class="stat-card" style="display:flex; flex-direction:column; min-height:130px;" overdue">
                        <div class="stat-label-row red-header">
                            <span class="stat-label-text">지연</span>
                            <div class="stat-help-wrap">
                              <span class="stat-help-icon" data-help="overdue" data-date="${dateLabel}" aria-label="지연 도움말" style="background:#ef4444; color:#fff; border-color:#ef4444;">i</span>
                              <span class="stat-help-balloon" aria-hidden="true"><strong>지연</strong><br/>현재 진행중인 건수: ${overdue}<br/>${overdue > 0 ? "⚠️ 일정 초과" : "✅ 현재 지연 없음"}</span>
                            </div>
                        </div>
                        <div class="stat-value">${overdue}</div>
                        <div class="stat-sub">${overdue > 0 ? '⚠️ 일정 초과' : '✅ 현재 지연 없음'}</div>
                        <div class="progress-bar-outer" style="margin-top: auto;">
                            <div class="progress-bar-inner overdue-bar" style="width: ${Math.max(overduePct, 2)}%"></div>
                        </div>
                    </div>
                `;

                document.getElementById('stats-row').innerHTML = html;

                // 툴팁 클릭 토글 (hover 미지원 환경 대비)
                document.querySelectorAll('#stats-row .stat-help-icon').forEach(icon => {
                    icon.addEventListener('click', (e) => {
                        const balloon = e.target.nextElementSibling;
                        if (balloon) {
                            balloon.style.display = (balloon.style.display === 'block') ? 'none' : 'block';
                        }
                    });
                });

            },

            /**
             * 6-3. 건강도 점수 계산 (Phase 1)
             */
            calculateHealthScore(tasks, overdue, progress) {
                let score = 100;

                // 진행률이 낮으면 감점
                score -= (100 - progress) * 0.3;

                // 지연 작업이 있으면 감점
                const overdueRatio = tasks.length > 0 ? (overdue / tasks.length) : 0;
                score -= overdueRatio * 40;

                // RISK 개수로 감점
                const openRisks = DataStore.risks.filter(r =>
                    r.projectId === AppState.currentProjectId &&
                    r.status === RISK_STATUS.OPEN
                ).length;
                score -= openRisks * 5;

                return Math.max(0, Math.round(score));
            },

            /**
             * 6-4. 건강도 레벨 결정
             */
            getHealthLevel(score) {
                if (score >= 80) return { class: 'health-excellent', label: '우수' };
                if (score >= 60) return { class: 'health-good', label: '양호' };
                if (score >= 40) return { class: 'health-warning', label: '주의' };
                return { class: 'health-critical', label: '위험' };
            },

            /**
             * 6-5. 주간 진행률 간트 차트 렌더링 (Phase 2 PM 관점)
             */
            renderTrendChart() {
                const projectId = AppState.currentProjectId;
                if (!projectId) return;

                const weeklyData = ScheduleEngine.calculateWeeklyTrend(projectId);
                if (!weeklyData.length) {
                    document.getElementById('trend-chart').innerHTML = '<div class="trend-empty">데이터가 없습니다</div>';
                    return;
                }

                const weekBlocks = weeklyData.map(w => {
                    const rateColor = w.progressPercent >= 80 ? 'var(--secondary)' : w.progressPercent >= 50 ? 'var(--primary)' : 'var(--warning)';
                    const milestoneHtml = w.milestones && w.milestones.length ? '<div class="trend-milestone-row">' + w.milestones.map(m => '<span class="trend-milestone-chip">\uD83D\uDEA9 ' + m + '</span>').join('') + '</div>' : '';
                    const completedList = w.completed && w.completed.length ? w.completed.map(c => '<li><span class="trend-badge-' + (c.part ? 'part' : 'milestone') + '">' + (c.part || (c.isMilestone ? '마일스톤' : '완료')) + '</span> ' + c.title + '</li>').join('') : '<li class="trend-empty-text">완료 업무 없음</li>';
                    const inProgressList = w.inProgress && w.inProgress.length ? w.inProgress.map(p => '<li><span class="trend-badge-progress">' + (p.part || '진행중') + '</span> ' + p.title + ' <span class="trend-progress-pct">' + (p.progress || 0) + '%</span></li>').join('') : '';

                    return '<div class="trend-week-col">' +
                        '<div class="trend-week-header">' +
                            '<span class="trend-week-num">' + (w.weekNumber || '') + '주차</span>' +
                            '<span class="trend-week-date">' + (w.label || '') + '</span>' +
                        '</div>' +
                        '<div class="trend-metric-row">' +
                            '<div class="trend-ring" style="border-color:' + rateColor + '">' +
                                '<span class="trend-ring-val">' + (w.progressPercent || 0) + '%</span>' +
                            '</div>' +
                            '<div class="trend-metric-text">' +
                                '<div><strong>' + (w.completedCount || 0) + '</strong> / <span>' + (w.totalCount || 0) + '</span></div>' +
                                '<div class="trend-metric-sub">완료 / 전체</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="trend-progress-outer">' +
                            '<div class="trend-progress-inner" style="width:' + (w.progressPercent || 0) + '%;background:' + rateColor + '"></div>' +
                        '</div>' +
                        '<div class="trend-lists">' + milestoneHtml +
                            '<ul class="trend-list trend-completed">' + completedList + '</ul>' +
                            (inProgressList ? '<ul class="trend-list trend-inprogress">' + inProgressList + '</ul>' : '') +
                        '</div>' +
                    '</div>';
                }).join('');

                document.getElementById('trend-chart').innerHTML = '<div class="trend-gantt-wrap"><div class="trend-scroll"><div class="trend-cols">' + weekBlocks + '</div></div><div class="trend-legend"><div class="trend-legend-item"><span class="trend-legend-dot" style="background:var(--secondary)"></span>완료</div><div class="trend-legend-item"><span class="trend-legend-dot" style="background:var(--primary)"></span>진행중</div><div class="trend-legend-item"><span class="trend-legend-dot" style="background:#f59e0b"></span>마일스톤</div></div></div>';
            },
            renderPartStatus() {
                const projectId = AppState.currentProjectId;
                if (!projectId) return;

                const tasks = DataStore.tasks.filter(t => t.projectId === projectId);
                const partStatus = ReportEngine.aggregateByPart(projectId, tasks);

                const html = DataStore.parts.map(part => {
                    const status = partStatus[part.name] || { total: 0, done: 0, inProgress: 0, delayed: 0, progress: 0 };

                    return `
                        <div class="part-status-card" style="border-left-color: ${part.color}">
                            <div class="part-status-header">
                                <div class="part-status-name">${part.name}</div>
                                <div class="part-status-badge">${status.progress}%</div>
                            </div>
                            <div class="part-status-progress">
                                <div class="progress-bar-outer" style="margin-top: auto;">
                                    <div class="progress-bar-inner" style="width: ${status.progress}%"></div>
                                </div>
                            </div>
                            <div class="part-status-stats">
                                <span>완료 ${status.done}</span>
                                <span>진행 ${status.inProgress}</span>
                                ${status.delayed > 0 ? `<span style="color:var(--danger)">지연 ${status.delayed}</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                document.getElementById('part-status-grid').innerHTML = html || '<div style="grid-column: 1/-1; text-align:center; color:var(--text-sub);">담당업무 구분을 등록하세요</div>';
            },

            /**
             * 6-7. 알림 패널 렌더링
             */
            renderAlerts() {
                const projectId = AppState.currentProjectId;
                if (!projectId) return;

                const tasks = DataManager.getFilteredTasksByRole(projectId);
                const alerts = [];

                // 지연 작업
                tasks.forEach(task => {
                    if (ScheduleEngine.isTaskOverdue(task)) {
                        alerts.push({
                            type: 'overdue',
                            icon: '🔴',
                            message: `${task.title} - 마감일 초과`,
                            task: task,
                        });
                    }
                });

                // 담당자 미지정 작업
                tasks.forEach(task => {
                    if (!task.assignee && task.status !== TASK_STATUS.DONE) {
                        alerts.push({
                            type: 'unassigned',
                            icon: '👤',
                            message: `${task.title} - 담당자 미지정`,
                            task: task,
                        });
                    }
                });

                // 알림 개수 업데이트
                document.getElementById('alert-count-chip').textContent = alerts.length + '건';

                // 알림 목록 렌더링
                const html = alerts.length > 0
                    ? alerts.map(alert => `
                        <div class="alert-item ${alert.type}" onclick="UIController.switchView('wbs', null)">
                            <span class="alert-tag">${alert.icon}</span>
                            <span>${alert.message}</span>
                        </div>
                    `).join('')
                    : '<div class="alert-empty">✅ 알림이 없습니다</div>';

                document.getElementById('alert-list').innerHTML = html;
            },

            /**
             * 6-8. 달력 렌더링
             */
            renderCalendar() {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();

                // 년도/월 선택 드롭다운 업데이트
                const yearSelect = document.getElementById('cal-year-select');
                const monthSelect = document.getElementById('cal-month-select');

                if (yearSelect.options.length === 0) {
                    for (let y = year - 2; y <= year + 2; y++) {
                        const opt = document.createElement('option');
                        opt.value = y;
                        opt.textContent = y + '년';
                        yearSelect.appendChild(opt);
                    }
                    yearSelect.value = year;
                }

                if (monthSelect.options.length === 0) {
                    for (let m = 0; m < 12; m++) {
                        const opt = document.createElement('option');
                        opt.value = m;
                        opt.textContent = (m + 1) + '월';
                        monthSelect.appendChild(opt);
                    }
                    monthSelect.value = month;
                }

                // 달력 날짜 렌더링
                this.renderCalendarDays(year, month);
            },

            /**
             * 6-9. 달력 날짜 렌더링
             */
            renderCalendarDays(year, month) {
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startDay = firstDay.getDay();
                const daysInMonth = lastDay.getDate();

                const calDays = document.getElementById('cal-days');
                calDays.innerHTML = '';

                const today = ScheduleEngine.getToday();
                const projectId = AppState.currentProjectId;
                const tasks = DataStore.tasks.filter(t => t.projectId === projectId);

                // 이전 달 빈칸
                for (let i = 0; i < startDay; i++) {
                    const emptyDiv = document.createElement('div');
                    calDays.appendChild(emptyDiv);
                }

                // 날짜 렌더링
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = ScheduleEngine.formatDate(new Date(year, month, day));
                    const dayDiv = document.createElement('div');
                    dayDiv.className = 'cal-day';
                    dayDiv.textContent = day;

                    // 오늘 표시
                    if (dateStr === today) {
                        dayDiv.classList.add('today');
                    }

                    // 휴일 표시
                    const isHoliday = DataStore.holidays.some(h =>
                        dateStr >= h.startDate && dateStr <= (h.endDate || h.startDate)
                    );
                    if (isHoliday) {
                        dayDiv.classList.add('holiday');
                    }

                    // 작업 있는 날 표시
                    const hasTasks = tasks.some(t =>
                        (t.startDate && t.startDate <= dateStr && t.endDate && t.endDate >= dateStr)
                    );
                    if (hasTasks) {
                        dayDiv.classList.add('has-task');
                    }

                    // 클릭 이벤트
                    dayDiv.onclick = () => {
                        AppState.filterDate = dateStr;
                        document.getElementById('date-filter-badge').style.display = 'block';
                        this.renderKanban();
                    };

                    calDays.appendChild(dayDiv);
                }
            },

            /**
             * 6-10. 칸반 보드 렌더링
             */
            renderKanban() {
                const projectId = AppState.currentProjectId;
                if (!projectId) return;

                let tasks = DataManager.getFilteredTasksByRole(projectId);

                // 날짜 필터 적용
                if (AppState.filterDate) {
                    tasks = tasks.filter(t =>
                        t.startDate && t.startDate <= AppState.filterDate &&
                        t.endDate && t.endDate >= AppState.filterDate
                    );
                }

                // 검색 필터 적용
                const searchTerm = document.getElementById('global-search')?.value.toLowerCase() || '';
                if (searchTerm) {
                    tasks = tasks.filter(t =>
                        t.title.toLowerCase().includes(searchTerm)
                    );
                }

                // 상태별 그룹화
                const columns = [
                    { status: TASK_STATUS.TODO, title: '할 일', emoji: '📋' },
                    { status: TASK_STATUS.INPROGRESS, title: '진행중', emoji: '🚀' },
                    { status: TASK_STATUS.REVIEW, title: '검토중', emoji: '👀' },
                    { status: TASK_STATUS.DONE, title: '완료', emoji: '✅' },
                ];

                const html = columns.map(col => {
                    const colTasks = tasks.filter(t => t.status === col.status);
                    const tasksHtml = colTasks.map(task => {
                        const isOverdue = ScheduleEngine.isTaskOverdue(task);
                        return `
                            <div class="task-card priority-${task.priority || 'low'} ${isOverdue ? 'overdue' : ''}"
                                 draggable="true" data-task-id="${task.id}">
                                <div class="task-title">${task.title}</div>
                                <div style="font-size:0.75rem; color:var(--text-sub); margin-top:4px;">
                                    ${task.assignee ? '👤 ' + task.assignee : ''}
                                    ${task.endDate ? '📅 ' + task.endDate : ''}
                                </div>
                                ${task.memo ? `
                                    <span class="memo-icon">💬</span>
                                    <div class="memo-tooltip">${task.memo}</div>
                                ` : ''}
                            </div>
                        `;
                    }).join('');

                    return `
                        <div class="kanban-col">
                            <div class="col-header">
                                <span>${col.emoji} ${col.title}</span>
                                <span>${colTasks.length}</span>
                            </div>
                            <div class="col-body" data-status="${col.status}">
                                ${tasksHtml || '<div class="empty-state">작업 없음</div>'}
                            </div>
                        </div>
                    `;
                }).join('');

                document.getElementById('kanban-board').innerHTML = html;
                // attach drag/drop handlers for kanban cards
                setTimeout(() => {
                    // task dragstart
                    document.querySelectorAll('.task-card').forEach(card => {
                        card.addEventListener('dragstart', (e) => {
                            e.dataTransfer.setData('text/plain', card.getAttribute('data-task-id'));
                        });
                    });

                    // column dragover/drop
                    document.querySelectorAll('.col-body').forEach(col => {
                        col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
                        col.addEventListener('dragleave', () => { col.classList.remove('drag-over'); });
                        col.addEventListener('drop', (e) => {
                            e.preventDefault();
                            col.classList.remove('drag-over');
                            const taskId = e.dataTransfer.getData('text/plain');
                            const newStatus = col.getAttribute('data-status');
                            if (!taskId) return;
                            const task = DataStore.tasks.find(t => t.id === taskId);
                            if (!task) return;
                            if (task.status === newStatus) return;
                            updateTaskField(taskId, 'status', newStatus);
                            UIController.showToast('✅ 작업 상태가 변경되었습니다', 'success');
                        });
                    });
                }, 0);
            },
        };