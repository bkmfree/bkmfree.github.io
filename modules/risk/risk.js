        const RiskRenderer = {
            /**
             * 9-1. RISK 레지스터 렌더링
             */
            render() {
                const projectId = AppState.currentProjectId;
                if (!projectId) return;

                let risks = DataStore.risks.filter(r => r.projectId === projectId);

                // 필터 적용
                const statusFilter = document.getElementById('risk-status-filter')?.value || '';
                const severityFilter = document.getElementById('risk-severity-filter')?.value || '';

                if (statusFilter) {
                    risks = risks.filter(r => r.status === statusFilter);
                }
                if (severityFilter) {
                    risks = risks.filter(r => r.severity === severityFilter);
                }

                // 심각도 순 정렬
                const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
                risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

                const html = risks.map(risk => this.renderRiskCard(risk)).join('');
                document.getElementById('risk-list-container').innerHTML = html || '<div style="text-align:center; color:var(--text-sub); padding:40px;">RISK가 없습니다</div>';
            },

            /**
             * 9-2. RISK 카드 렌더링
             */
            renderRiskCard(risk) {
                const severityLabels = {
                    'critical': 'Critical',
                    'high': 'High',
                    'medium': 'Medium',
                    'low': 'Low',
                };

                const statusLabels = {
                    'open': 'Open',
                    'mitigating': '대응중',
                    'mitigated': '완료',
                    'escalated': '에스컬레이션',
                };

                const autoDetectedBadge = risk.autoDetected ? '<span style="background:#3b82f6; color:white; font-size:0.7rem; padding:2px 6px; border-radius:8px; margin-left:6px;">자동감지</span>' : '';

                return `
                    <div class="risk-card ${risk.severity}">
                        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                            <div style="flex:1;">
                                <div style="font-weight:700; font-size:1rem; margin-bottom:4px;">
                                    ${risk.title}
                                    ${autoDetectedBadge}
                                </div>
                                <div style="font-size:0.85rem; color:var(--text-sub);">${risk.description}</div>
                            </div>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <span class="risk-severity-badge" style="background:var(--danger)">${severityLabels[risk.severity]}</span>
                                <span class="risk-status-badge" style="background:var(--primary)">${statusLabels[risk.status]}</span>
                            </div>
                        </div>
                        <div style="margin-top:10px; display:flex; gap:8px;">
                            <button class="btn btn-outline btn-icon" onclick="updateRiskStatus('${risk.id}', 'mitigating')">대응중으로 변경</button>
                            <button class="btn btn-success btn-icon" onclick="updateRiskStatus('${risk.id}', 'mitigated')">완료</button>
                            <button class="btn btn-danger btn-icon" onclick="updateRiskStatus('${risk.id}', 'escalated')">에스컬레이션</button>
                            <button class="btn btn-outline btn-icon" onclick="deleteRisk('${risk.id}')">🗑️</button>
                        </div>
                    </div>
                `;
            },
        };