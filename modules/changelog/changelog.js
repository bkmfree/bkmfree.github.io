        const ChangelogRenderer = {
            /**
             * 10-1. 변경 이력 렌더링
             */
            render() {
                const searchTerm = document.getElementById('changelog-search')?.value.toLowerCase() || '';

                let logs = [...DataStore.changelog];

                if (searchTerm) {
                    logs = logs.filter(log =>
                        log.user.toLowerCase().includes(searchTerm) ||
                        log.details.toLowerCase().includes(searchTerm)
                    );
                }

                const html = logs.slice(0, 100).map(log => this.renderLogItem(log)).join('');
                document.getElementById('changelog-list').innerHTML = html || '<div style="text-align:center; color:var(--text-sub); padding:40px;">변경 이력이 없습니다</div>';
            },

            /**
             * 10-2. 로그 아이템 렌더링
             */
            renderLogItem(log) {
                const date = new Date(log.timestamp);
                const timeStr = date.toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });

                const actionLabels = {
                    'create': '생성',
                    'update': '수정',
                    'delete': '삭제',
                };

                return `
                    <div class="changelog-item">
                        <div class="changelog-header">
                            <span class="changelog-user">${log.user}</span>
                            <span class="changelog-time">${timeStr}</span>
                        </div>
                        <div class="changelog-action">
                            <strong>${actionLabels[log.action] || log.action}</strong> | ${log.targetType}
                        </div>
                        <div class="changelog-detail">${log.details}</div>
                    </div>
                `;
            },
        };