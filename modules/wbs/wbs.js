        const WBSRenderer = {
            /**
             * 8-1. WBS 전체 렌더링
             */
            render() {
                const projectId = AppState.currentProjectId;
                if (!projectId) return;

                const tasks = DataManager.getFilteredTasksByRole(projectId);

                // 필터 적용
                const searchTerm = document.getElementById('wbs-search')?.value.toLowerCase() || '';
                const startFilter = document.getElementById('wbs-start-filter')?.value || '';
                const endFilter = document.getElementById('wbs-end-filter')?.value || '';

                let filtered = tasks;
                if (searchTerm) {
                    filtered = filtered.filter(t => t.title.toLowerCase().includes(searchTerm));
                }
                if (startFilter) {
                    filtered = filtered.filter(t => t.startDate >= startFilter);
                }
                if (endFilter) {
                    filtered = filtered.filter(t => t.endDate <= endFilter);
                }

                // 루트 작업만 렌더링 (재귀적으로 자식 표시)
                const rootTasks = filtered.filter(t => !t.parentId);
                const tbody = document.getElementById('wbs-body');

                const html = rootTasks.map(task => this.renderTaskRow(task, 0)).join('');
                tbody.innerHTML = html || '<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-sub);">작업이 없습니다</td></tr>';
            },

            /**
             * 8-2. 작업 행 렌더링 (재귀)
             */
            renderTaskRow(task, level) {
                const children = DataStore.tasks.filter(t => t.parentId === task.id);
                const hasChildren = children.length > 0;
                const isCollapsed = AppState.collapsedTasks.has(task.id);
                const indent = level * 20;

                const isOverdue = ScheduleEngine.isTaskOverdue(task);
                const statusClass = `status-${task.status || 'todo'}`;
                const priorityClass = task.priority || 'low';

                let html = `
                    <tr data-task-id="${task.id}" style="${level > 0 ? 'background:#f8fafc;' : ''}">
                        <td>
                            <div class="wbs-tree" style="padding-left:${indent}px;">
                                ${hasChildren ? `<span class="wbs-toggle ${isCollapsed ? 'collapsed' : ''}" onclick="toggleTaskCollapse('${task.id}')">▼</span>` : '<span style="width:16px;"></span>'}
                                <span class="wbs-code">${task.wbsCode || ''}</span>
                                <input type="text" class="wbs-input wbs-title-input" value="${task.title}"
                                       onchange="updateTaskField('${task.id}', 'title', this.value)">
                            </div>
                        </td>
                        <td>
                            <select class="wbs-input" onchange="updateTaskField('${task.id}', 'assignee', this.value)">
                                <option value="">-</option>
                                ${DataStore.workers.map(w => `<option value="${w.name}" ${task.assignee === w.name ? 'selected' : ''}>${w.name}</option>`).join('')}
                            </select>
                        </td>
                        <td><input type="date" class="wbs-input" value="${task.startDate || ''}" onchange="updateTaskField('${task.id}', 'startDate', this.value)"></td>
                        <td><input type="date" class="wbs-input" value="${task.endDate || ''}" onchange="updateTaskField('${task.id}', 'endDate', this.value)"></td>
                        <td>
                            <span class="status-badge ${statusClass}" onclick="cycleTaskStatus('${task.id}')">
                                ${this.getStatusLabel(task.status)}
                            </span>
                        </td>
                        <td>
                            <span class="priority-badge ${priorityClass}" onclick="cycleTaskPriority('${task.id}')">
                                ${this.getPriorityLabel(task.priority)}
                            </span>
                        </td>
                        <td>
                            <input type="number" class="wbs-input" value="${task.progress || 0}" min="0" max="100"
                                   style="width:60px;" onchange="updateTaskField('${task.id}', 'progress', parseInt(this.value))">%
                        </td>
                        <td>
                            <div class="row-actions">
                                <button class="btn btn-icon btn-outline" onclick="addChildTask('${task.id}')" title="하위 작업 추가">+</button>
                                <button class="btn btn-icon btn-danger" onclick="deleteTask('${task.id}')" title="삭제">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;

                // 자식 작업 재귀 렌더링
                if (hasChildren && !isCollapsed) {
                    html += children.map(child => this.renderTaskRow(child, level + 1)).join('');
                }

                return html;
            },

            /**
             * 8-3. 상태 라벨 변환
             */
            getStatusLabel(status) {
                const labels = {
                    'todo': '할 일',
                    'inprogress': '진행중',
                    'review': '검토중',
                    'done': '완료',
                    'cancel': '취소',
                };
                return labels[status] || '할 일';
            },

            /**

             * 8-4. 우선순위 라벨 변환
             */
            getPriorityLabel(priority) {
                const labels = {
                    'high': '높음',
                    'medium': '보통',
                    'low': '낮음',
                };
                return labels[priority] || '낮음';
            },
        };