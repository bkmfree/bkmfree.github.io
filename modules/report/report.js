        function generateWeeklyReport() {
            const projectId = AppState.currentProjectId;
            if (!projectId) return;

            const data = ReportEngine.generateWeeklyReportData(projectId);
            const project = DataStore.projects.find(p => p.id === projectId);

            document.getElementById('report-proj-name').textContent = project.name;
            document.getElementById('report-week-range').textContent =
                `${data.weekRange.start} ~ ${data.weekRange.end}`;

            let html = `
                <div class="report-section">
                    <h2 class="report-section-title done">✅ 금주 완료 사항 (${data.completed.length}건)</h2>
                    <div class="report-task-list">
                        ${data.completed.map(t => `<div class="report-task-item">• ${t.title} (${t.assignee || '미지정'})</div>`).join('') || '<div style="color:var(--text-sub)">완료된 작업이 없습니다</div>'}
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="report-section-title plan">🚀 진행 중 (${data.inProgress.length}건)</h2>
                    <div class="report-task-list">
                        ${data.inProgress.map(t => `<div class="report-task-item">• ${t.title} - ${t.progress || 0}% (${t.assignee || '미지정'})</div>`).join('') || '<div style="color:var(--text-sub)">진행 중인 작업이 없습니다</div>'}
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="report-section-title delay">⚠️ 지연 및 이슈 (${data.delayed.length}건)</h2>
                    <div class="report-task-list">
                        ${data.delayed.map(t => `<div class="report-task-item">• ${t.title} - 마감일: ${t.endDate} (${t.assignee || '미지정'})</div>`).join('') || '<div style="color:var(--text-sub)">✅ 지연 작업 없음</div>'}
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="report-section-title risk">🛡️ RISK 현황 (${data.risks.length}건)</h2>
                    <div class="report-task-list">
                        ${data.risks.map(r => `<div class="report-task-item">• [${r.severity.toUpperCase()}] ${r.title}</div>`).join('') || '<div style="color:var(--text-sub)">✅ RISK 없음</div>'}
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="report-section-title">📝 담당 영역별 코멘트</h2>
                    ${Object.entries(data.plComments).map(([key, comment]) => {
                        const partName = key.split('_')[1];
                        return comment ? `
                            <div style="background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:10px;">
                                <div style="font-weight:700; margin-bottom:6px;">${partName}</div>
                                <div style="font-size:0.9rem; white-space:pre-wrap;">${comment}</div>
                            </div>
                        ` : '';
                    }).join('') || '<div style="color:var(--text-sub)">코멘트가 없습니다</div>'}
                </div>
            `;

            document.getElementById('weekly-report-content').innerHTML = html;
            UIController.showToast('✅ 주간 보고서가 생성되었습니다', 'success');
        }

        /**
         * 11-2. 고객 보고서 생성
         */
        function generateClientReport() {
            const projectId = AppState.currentProjectId;
            if (!projectId) return;

            const data = ReportEngine.generateClientReportData(projectId);

            document.getElementById('client-report-title').textContent =
                `${data.project.name} 진행 현황`;
            document.getElementById('client-report-date').textContent =
                new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

            let html = `
                <div style="text-align:center; padding:30px 0;">
                    <div style="font-size:3rem; font-weight:900; color:var(--primary);">${data.totalProgress}%</div>
                    <div style="font-size:1.2rem; color:var(--text-sub); margin-top:8px;">전체 진행률</div>
                    <div class="progress-bar-outer" style="max-width:400px; margin:20px auto; height:12px;">
                        <div class="progress-bar-inner" style="width:${data.totalProgress}%"></div>
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="report-section-title done">✅ 주요 완료 사항</h2>
                    <div class="report-task-list">
                        ${data.recentCompleted.map(t => `<div class="report-task-item">• ${t.title}</div>`).join('') || '<div style="color:var(--text-sub)">완료 사항이 없습니다</div>'}
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="report-section-title plan">🚀 진행 중</h2>
                    <div class="report-task-list">
                        ${data.majorInProgress.map(t => `<div class="report-task-item">• ${t.title} (${t.progress || 0}%)</div>`).join('') || '<div style="color:var(--text-sub)">진행 중인 작업이 없습니다</div>'}
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="report-section-title risk">⚠️ 이슈 및 리스크</h2>
                    <div class="report-task-list">
                        ${data.majorRisks.map(r => `<div class="report-task-item">• ${r.title}</div>`).join('') || '<div style="color:var(--text-sub)">✅ 주요 이슈 없음</div>'}
                    </div>
                </div>
            `;

            document.getElementById('client-report-content').innerHTML = html;
            UIController.showToast('✅ 고객 보고서가 생성되었습니다', 'success');
        }