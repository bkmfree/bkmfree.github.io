        const PLDashboardRenderer = {
            /**
             * 7-1. PL 대시보드 전체 렌더링
             */
            render() {
                const role = AppState.currentRole;
                if (!role.startsWith('pl_')) return;

                const partName = DataManager.getPartNameByRole(role);
                document.getElementById('pl-part-name').textContent = partName;

                this.renderStats(partName);
                this.renderTeamMembers(partName);
                this.loadPlComment(partName);
            },

            /**
             * 7-2. 팀 통계 렌더링
             */
            renderStats(partName) {
                const projectId = AppState.currentProjectId;
                const tasks = DataStore.tasks.filter(t => {
                    const worker = DataStore.workers.find(w => w.name === t.assignee);
                    return t.projectId === projectId && worker && worker.task === partName;
                });

                const weekRange = ScheduleEngine.getWeekRange(new Date());

                const completed = tasks.filter(t =>
                    t.status === TASK_STATUS.DONE &&
                    t.endDate >= weekRange.start &&
                    t.endDate <= weekRange.end
                ).length;

                const inProgress = tasks.filter(t => t.status === TASK_STATUS.INPROGRESS).length;
                const delayed = tasks.filter(t => ScheduleEngine.isTaskOverdue(t)).length;

                const nextWeekStart = new Date(weekRange.end);
                nextWeekStart.setDate(nextWeekStart.getDate() + 1);
                const nextWeekEnd = new Date(nextWeekStart);
                nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

                const nextWeek = tasks.filter(t =>
                    t.startDate >= ScheduleEngine.formatDate(nextWeekStart) &&
                    t.startDate <= ScheduleEngine.formatDate(nextWeekEnd)
                ).length;

                document.getElementById('pl-completed-count').textContent = completed;
                document.getElementById('pl-inprogress-count').textContent = inProgress;
                document.getElementById('pl-delayed-count').textContent = delayed;
                document.getElementById('pl-next-count').textContent = nextWeek;
            },

            /**
             * 7-3. 팀원 작업 현황 렌더링
             */
            renderTeamMembers(partName) {
                const projectId = AppState.currentProjectId;
                const teamWorkers = DataStore.workers.filter(w => w.task === partName);

                const html = teamWorkers.map(worker => {
                    const workerTasks = DataStore.tasks.filter(t =>
                        t.projectId === projectId && t.assignee === worker.name
                    );

                    const total = workerTasks.length;
                    const done = workerTasks.filter(t => t.status === TASK_STATUS.DONE).length;
                    const inProgress = workerTasks.filter(t => t.status === TASK_STATUS.INPROGRESS).length;
                    const delayed = workerTasks.filter(t => ScheduleEngine.isTaskOverdue(t)).length;

                    return `
                        <div style="background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:10px;">
                            <div style="font-weight:700; margin-bottom:6px;">👤 ${worker.name}</div>
                            <div style="font-size:0.85rem; color:var(--text-sub);">
                                전체 ${total} | 완료 ${done} | 진행 ${inProgress} ${delayed > 0 ? `| <span style="color:var(--danger)">지연 ${delayed}</span>` : ''}
                            </div>
                            <div class="progress-bar-outer" style="margin-top:6px;">
                                <div class="progress-bar-inner" style="width: ${total > 0 ? (done/total)*100 : 0}%"></div>
                            </div>
                        </div>
                    `;
                }).join('');

                document.getElementById('pl-team-members').innerHTML = html || '<div style="text-align:center; color:var(--text-sub); padding:20px;">팀원이 등록되지 않았습니다</div>';
            },

            /**
             * 7-4. PL 코멘트 로드
             */
            loadPlComment(partName) {
                const key = `${AppState.currentProjectId}_${partName}`;
                const comment = DataStore.plComments[key] || '';
                document.getElementById('pl-weekly-comment').value = comment;
            },
        };