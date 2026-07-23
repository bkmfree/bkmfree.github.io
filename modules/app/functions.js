// switchRole
        function switchRole(role) {
            AppState.currentRole = role;
            UIController.updateUIByRole(role);
            UIController.renderCurrentView();
            DataManager.saveData();
            UIController.showToast(`역할이 변경되었습니다: ${role}`, 'info');
        }

// switchProject
        function switchProject(projectId) {
            AppState.currentProjectId = projectId;
            UIController.renderCurrentView();
            DataManager.saveData();
        }

// toggleSubmenu
        function toggleSubmenu(menuId) {
            const submenu = document.getElementById(menuId + '-submenu');
            const caret = document.getElementById(menuId + '-submenu-caret');

            if (submenu.style.display === 'none' || !submenu.style.display) {
                submenu.style.display = 'block';
                caret.classList.remove('closed');
            } else {
                submenu.style.display = 'none';
                caret.classList.add('closed');
            }
        }

// switchView
        function switchView(viewName, menuElement) {
            UIController.switchView(viewName, menuElement);
        }

// toggleSidebar
        function toggleSidebar() {
            UIController.toggleSidebar();
        }

// changeMonth
        function changeMonth(delta) {
            const yearSelect = document.getElementById('cal-year-select');
            const monthSelect = document.getElementById('cal-month-select');

            let year = parseInt(yearSelect.value);
            let month = parseInt(monthSelect.value);

            month += delta;
            if (month < 0) {
                month = 11;
                year--;
            } else if (month > 11) {
                month = 0;
                year++;
            }

            yearSelect.value = year;
            monthSelect.value = month;
            DashboardRenderer.renderCalendarDays(year, month);
        }

// onCalYearMonthChange
        function onCalYearMonthChange() {
            const year = parseInt(document.getElementById('cal-year-select').value);
            const month = parseInt(document.getElementById('cal-month-select').value);
            DashboardRenderer.renderCalendarDays(year, month);
        }

// clearDateFilter
        function clearDateFilter() {
            AppState.filterDate = null;
            document.getElementById('date-filter-badge').style.display = 'none';
            DashboardRenderer.renderKanban();
        }

// debouncedRenderKanban
        function debouncedRenderKanban() {
            clearTimeout(kanbanDebounceTimer);
            kanbanDebounceTimer = setTimeout(() => {
                DashboardRenderer.renderKanban();
            }, 300);
        }

// debouncedRenderWBS
        function debouncedRenderWBS() {
            clearTimeout(wbsDebounceTimer);
            wbsDebounceTimer = setTimeout(() => {
                WBSRenderer.render();
            }, 300);
        }

// resetWbsFilters
        function resetWbsFilters() {
            document.getElementById('wbs-search').value = '';
            document.getElementById('wbs-start-filter').value = '';
            document.getElementById('wbs-end-filter').value = '';
            WBSRenderer.render();
        }

// toggleTaskCollapse
        function toggleTaskCollapse(taskId) {
            if (AppState.collapsedTasks.has(taskId)) {
                AppState.collapsedTasks.delete(taskId);
            } else {
                AppState.collapsedTasks.add(taskId);
            }
            WBSRenderer.render();
        }

// updateTaskField
        function updateTaskField(taskId, field, value) {
            const task = DataStore.tasks.find(t => t.id === taskId);
            if (!task) return;

            const oldValue = task[field];
            task[field] = value;

            DataManager.addChangeLog(
                'update',
                'task',
                taskId,
                `${task.title} - ${field}: "${oldValue}" → "${value}"`,
                AppState.currentRole
            );

            DataManager.saveData();
            UIController.renderCurrentView();
            UIController.showToast('✅ 저장되었습니다', 'success');
        }

// cycleTaskStatus
        function cycleTaskStatus(taskId) {
            const task = DataStore.tasks.find(t => t.id === taskId);
            if (!task) return;

            const statuses = ['todo', 'inprogress', 'review', 'done'];
            const currentIndex = statuses.indexOf(task.status || 'todo');
            const nextIndex = (currentIndex + 1) % statuses.length;

            updateTaskField(taskId, 'status', statuses[nextIndex]);
        }

// cycleTaskPriority
        function cycleTaskPriority(taskId) {
            const task = DataStore.tasks.find(t => t.id === taskId);
            if (!task) return;

            const priorities = ['low', 'medium', 'high'];
            const currentIndex = priorities.indexOf(task.priority || 'low');
            const nextIndex = (currentIndex + 1) % priorities.length;

            updateTaskField(taskId, 'priority', priorities[nextIndex]);
        }

// addWbsRoot
        function addWbsRoot() {
            const projectId = AppState.currentProjectId;
            if (!projectId) return;

            const task = {
                id: DataManager.generateId('task'),
                projectId: projectId,
                title: '새 작업',
                status: TASK_STATUS.TODO,
                priority: PRIORITY.MEDIUM,
                progress: 0,
                startDate: ScheduleEngine.getToday(),
                endDate: ScheduleEngine.getToday(),
                createdAt: new Date().toISOString(),
            };

            DataStore.tasks.push(task);
            DataManager.addChangeLog('create', 'task', task.id, `새 작업 생성: ${task.title}`, AppState.currentRole);
            DataManager.saveData();
            WBSRenderer.render();
            UIController.showToast('✅ 작업이 추가되었습니다', 'success');
        }

// addChildTask
        function addChildTask(parentId) {
            const projectId = AppState.currentProjectId;
            if (!projectId) return;

            const parent = DataStore.tasks.find(t => t.id === parentId);
            if (!parent) return;

            const task = {
                id: DataManager.generateId('task'),
                projectId: projectId,
                parentId: parentId,
                title: '새 하위 작업',
                status: TASK_STATUS.TODO,
                priority: PRIORITY.MEDIUM,
                progress: 0,
                startDate: parent.startDate,
                endDate: parent.endDate,
                assignee: parent.assignee,
                createdAt: new Date().toISOString(),
            };

            DataStore.tasks.push(task);
            DataManager.addChangeLog('create', 'task', task.id, `하위 작업 생성: ${task.title} (부모: ${parent.title})`, AppState.currentRole);
            DataManager.saveData();
            WBSRenderer.render();
            UIController.showToast('✅ 하위 작업이 추가되었습니다', 'success');
        }

// deleteTask
        function deleteTask(taskId) {
            const task = DataStore.tasks.find(t => t.id === taskId);
            if (!task) return;

            if (!confirm(`"${task.title}" 작업을 삭제하시겠습니까?\n하위 작업도 함께 삭제됩니다.`)) {
                return;
            }

            // 재귀적으로 하위 작업도 삭제

            deleteRecursive(taskId);
            DataManager.addChangeLog('delete', 'task', taskId, `작업 삭제: ${task.title}`, AppState.currentRole);
            DataManager.saveData();
            WBSRenderer.render();
            UIController.showToast('✅ 작업이 삭제되었습니다', 'success');
        }

// manualSaveWbs
        function manualSaveWbs() {
            DataManager.saveData();
            UIController.showToast('💾 저장되었습니다', 'success');
        }

// autoDetectRisks
        function autoDetectRisks() {
            const projectId = AppState.currentProjectId;
            if (!projectId) return;

            const detected = RiskEngine.autoDetectRisks(projectId);
            let addedCount = 0;

            detected.forEach(detection => {
                const risk = RiskEngine.createRiskFromDetection(projectId, detection);
                if (risk) {
                    addedCount++;
                }
            });

            DataManager.saveData();
            RiskRenderer.render();

            if (addedCount > 0) {
                UIController.showToast(`✅ ${addedCount}개의 RISK가 자동 감지되었습니다`, 'success');
            } else {
                UIController.showToast('✅ 새로운 RISK가 감지되지 않았습니다', 'info');
            }
        }

// openRiskModal
        function openRiskModal() {
            const projectId = AppState.currentProjectId;
            if (!projectId) return;

            const risk = {
                id: DataManager.generateId('risk'),
                projectId: projectId,
                title: prompt('RISK 제목을 입력하세요:') || '새 RISK',
                description: prompt('RISK 설명을 입력하세요:') || '',
                category: 'schedule',
                severity: RISK_SEVERITY.MEDIUM,
                probability: 'medium',
                impact: 'medium',
                status: RISK_STATUS.OPEN,
                createdAt: new Date().toISOString(),
                updates: [],
            };

            if (!risk.title) return;

            DataStore.risks.push(risk);
            DataManager.addChangeLog('create', 'risk', risk.id, `RISK 생성: ${risk.title}`, AppState.currentRole);
            DataManager.saveData();
            RiskRenderer.render();
            UIController.showToast('✅ RISK가 등록되었습니다', 'success');
        }

// updateRiskStatus
        function updateRiskStatus(riskId, newStatus) {
            const risk = DataStore.risks.find(r => r.id === riskId);
            if (!risk) return;

            risk.status = newStatus;
            risk.updates = risk.updates || [];
            risk.updates.push({
                timestamp: new Date().toISOString(),
                action: `상태 변경: ${newStatus}`,
                user: AppState.currentRole,
            });

            DataManager.addChangeLog('update', 'risk', riskId, `RISK 상태 변경: ${risk.title} → ${newStatus}`, AppState.currentRole);
            DataManager.saveData();
            RiskRenderer.render();
            UIController.showToast('✅ RISK 상태가 업데이트되었습니다', 'success');
        }

// deleteRisk
        function deleteRisk(riskId) {
            const risk = DataStore.risks.find(r => r.id === riskId);
            if (!risk) return;

            if (!confirm(`"${risk.title}" RISK를 삭제하시겠습니까?`)) {
                return;
            }

            DataStore.risks = DataStore.risks.filter(r => r.id !== riskId);
            DataManager.addChangeLog('delete', 'risk', riskId, `RISK 삭제: ${risk.title}`, AppState.currentRole);
            DataManager.saveData();
            RiskRenderer.render();
            UIController.showToast('✅ RISK가 삭제되었습니다', 'success');
        }

// exportRiskCSV
        function exportRiskCSV() {
            const projectId = AppState.currentProjectId;
            if (!projectId) return;

            const risks = DataStore.risks.filter(r => r.projectId === projectId);
            let csv = '﻿'; // BOM for UTF-8
            csv += 'RISK ID,제목,설명,카테고리,심각도,상태,생성일\n';

            risks.forEach(risk => {
                csv += `"${risk.id}","${risk.title}","${risk.description}","${risk.category}","${risk.severity}","${risk.status}","${risk.createdAt}"\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `RISK_${ScheduleEngine.getToday()}.csv`;
            link.click();

            UIController.showToast('✅ CSV 파일이 다운로드되었습니다', 'success');
        }

// savePlComment
        function savePlComment() {
            const role = AppState.currentRole;
            if (!role.startsWith('pl_')) return;

            const partName = DataManager.getPartNameByRole(role);
            const comment = document.getElementById('pl-weekly-comment').value;
            const key = `${AppState.currentProjectId}_${partName}`;

            DataStore.plComments[key] = comment;
            DataManager.addChangeLog('update', 'pl-comment', key, `${partName} PL 코멘트 저장`, AppState.currentRole);
            DataManager.saveData();
            UIController.showToast('✅ 코멘트가 저장되었습니다', 'success');
        }

// clearPlComment
        function clearPlComment() {
            if (!confirm('코멘트를 초기화하시겠습니까?')) return;

            document.getElementById('pl-weekly-comment').value = '';
            UIController.showToast('✅ 코멘트가 초기화되었습니다', 'info');
        }

// exportCsv
        function exportCsv() {
            const projectId = AppState.currentProjectId;
            if (!projectId) return;

            const tasks = DataStore.tasks.filter(t => t.projectId === projectId);

            let csv = '﻿'; // BOM for UTF-8
            csv += 'WBS코드,작업명,담당자,시작일,종료일,상태,우선순위,진행률\n';

            tasks.forEach(task => {
                csv += `"${task.wbsCode || ''}","${task.title}","${task.assignee || ''}","${task.startDate || ''}","${task.endDate || ''}","${task.status || ''}","${task.priority || ''}","${task.progress || 0}%"\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `WBS_${ScheduleEngine.getToday()}.csv`;
            link.click();

            UIController.showToast('✅ CSV 파일이 다운로드되었습니다', 'success');
        }

// exportData
        function exportData() {
            const json = JSON.stringify(DataStore, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `PMSystem_Backup_${ScheduleEngine.getToday()}.json`;
            link.click();

            UIController.showToast('✅ JSON 백업 파일이 다운로드되었습니다', 'success');
        }

// importData
        function importData(inputElement) {
            const file = inputElement.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    // validate and merge
                    DataManager.validateAndMerge(data);
                    DataManager.saveData();
                    UIController.renderCurrentView();
                    UIController.showToast('✅ 데이터를 안전하게 불러왔습니다', 'success');
                } catch (error) {
                    console.error('가져오기 실패:', error);
                    UIController.showToast('❌ 파일을 읽을 수 없습니다', 'error');
                }
            };
            reader.readAsText(file);
        }

// renderChangelog
        function renderChangelog() {
            ChangelogRenderer.render();
        }

        // 대시보드 설정 렌더링 (라디오 + 썸네일 미리보기 + 추가/삭제)
        function renderDashboardSettings() {
            const list = DataStore.dashboardSettings || [];
            const activeId = AppState.activeDashboardSettingId;
            const wrap = document.getElementById('dashboard-settings-list');
            if (!wrap) return;

            wrap.innerHTML = list.map(s => {
                const checked = s.id === activeId ? 'checked' : '';
                const isActive = s.id === activeId;
                const thumb = (s.type === 'six')
                    ? `<div class="ds-thumb">
                           <div class="ds-thumb-card" style="background:linear-gradient(135deg,#E8F5E9,#C8E6C9)"></div>
                           <div class="ds-thumb-card" style="background:linear-gradient(135deg,#F3E5F5,#E1BEE7)"></div>
                           <div class="ds-thumb-card" style="background:#dbeafe"></div>
                           <div class="ds-thumb-card" style="background:#bbf7d0"></div>
                           <div class="ds-thumb-card" style="background:#fef9c3"></div>
                           <div class="ds-thumb-card" style="background:#fce7f3"></div>
                       </div>`
                    : `<div class="ds-thumb ds-thumb-two">
                           <div class="ds-thumb-card" style="background:linear-gradient(135deg,#E8F5E9,#C8E6C9)"></div>
                           <div class="ds-thumb-card" style="background:linear-gradient(135deg,#F3E5F5,#E1BEE7)"></div>
                           <div class="ds-thumb-donut"></div>
                           <div class="ds-thumb-card ds-thumb-wide" style="background:#fff; border:1px solid var(--border)"></div>
                       </div>`;
                const delBtn = s.builtin
                    ? `<span class="ds-badge">기본</span>`
                    : `<button class="btn btn-outline btn-sm" onclick="deleteDashboardSetting('${s.id}')" style="color:#ef4444; border-color:#ef4444;">삭제</button>`;
                return `
                    <div class="ds-card ${isActive ? 'ds-card-active' : ''}">
                        <label class="ds-card-head">
                            <input type="radio" name="dash-setting" value="${s.id}" ${checked} onchange="selectDashboardSetting('${s.id}')">
                            <span class="ds-card-name">${s.name}</span>
                        </label>
                        <div class="ds-thumb-box">${thumb}</div>
                        <div class="ds-card-foot">${delBtn}</div>
                    </div>
                `;
            }).join('');
        }

        function selectDashboardSetting(id) {
            // 라디오 선택 시 즉시 적용하지 않고 하이라이트만 갱신 (적용 버튼에서 반영)
            AppState.activeDashboardSettingId = id;
            renderDashboardSettings();
            UIController.showToast('설정을 선택했습니다. 하단의 [적용] 버튼을 누르세요.', 'info');
        }

        function applyDashboardSetting() {
            const id = AppState.activeDashboardSettingId;
            if (!id) {
                UIController.showToast('먼저 설정을 선택해 주세요.', 'error');
                return;
            }
            DataManager.saveData();
            UIController.showToast('대시보드 설정이 적용되었습니다', 'success');
            // 대시보드로 이동해서 즉시 반영
            UIController.switchView('dashboard');
        }

        function addDashboardSetting() {
            const nameEl = document.getElementById('new-setting-name');
            const typeEl = document.getElementById('new-setting-type');
            const errEl = document.getElementById('dashboard-setting-error');
            const name = nameEl.value.trim();
            const type = typeEl.value;
            if (!name) {
                errEl.textContent = '설정 이름을 입력하세요.';
                return;
            }
            errEl.textContent = '';
            const setting = {
                id: DataManager.generateId('setting'),
                name: name,
                type: type,
                builtin: false,
            };
            if (!Array.isArray(DataStore.dashboardSettings)) DataStore.dashboardSettings = [];
            DataStore.dashboardSettings.push(setting);
            DataManager.saveData();
            nameEl.value = '';
            UIController.showToast('새 대시보드 설정이 추가되었습니다', 'success');
            renderDashboardSettings();
        }

        function deleteDashboardSetting(id) {
            if (!Array.isArray(DataStore.dashboardSettings)) return;
            if (DataStore.dashboardSettings.length <= 1) {
                UIController.showToast('최소 1개의 설정은 필요합니다', 'error');
                return;
            }
            DataStore.dashboardSettings = DataStore.dashboardSettings.filter(s => s.id !== id);
            // 삭제한 게 활성 설정이면 첫 번째로 이동
            if (AppState.activeDashboardSettingId === id) {
                AppState.activeDashboardSettingId = DataStore.dashboardSettings[0].id;
            }
            DataManager.saveData();
            UIController.showToast('대시보드 설정이 삭제되었습니다', 'success');
            renderDashboardSettings();
        }

        function addProject() {
            const name = document.getElementById('new-proj-name').value.trim();
            const color = document.getElementById('new-proj-color').value;

            if (!name) {
                UIController.showToast('프로젝트 이름을 입력하세요', 'error');
                return;
            }

            const project = {
                id: DataManager.generateId('proj'),
                name: name,
                color: color,
                createdAt: new Date().toISOString(),
            };

            DataStore.projects.push(project);
            DataManager.addChangeLog('create', 'project', project.id, `프로젝트 생성: ${name}`, AppState.currentRole);
            DataManager.saveData();

            document.getElementById('new-proj-name').value = '';
            renderProjectList();

            // 프로젝트 선택 드롭다운 업데이트
            const select = document.getElementById('current-project-select');
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);

            UIController.showToast('✅ 프로젝트가 추가되었습니다', 'success');
        }

// deleteProject
        function deleteProject(projectId) {
            const project = DataStore.projects.find(p => p.id === projectId);
            if (!project) return;

            if (!confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?\n관련된 모든 작업도 삭제됩니다.`)) {
                return;
            }

            DataStore.projects = DataStore.projects.filter(p => p.id !== projectId);
            DataStore.tasks = DataStore.tasks.filter(t => t.projectId !== projectId);
            DataStore.risks = DataStore.risks.filter(r => r.projectId !== projectId);

            DataManager.saveData();
            renderProjectList();

            if (AppState.currentProjectId === projectId && DataStore.projects.length > 0) {
                AppState.currentProjectId = DataStore.projects[0].id;
                document.getElementById('current-project-select').value = AppState.currentProjectId;
            }

            UIController.showToast('✅ 프로젝트가 삭제되었습니다', 'success');
        }

// addWorker
        function addWorker() {
            const name = document.getElementById('new-worker-name').value.trim();
            const task = document.getElementById('new-worker-task').value;
            const phone = document.getElementById('new-worker-phone').value.trim();
            const email = document.getElementById('new-worker-email').value.trim();
            const memo = document.getElementById('new-worker-memo').value.trim();

            if (!name) {
                UIController.showToast('이름을 입력하세요', 'error');
                return;
            }

            const worker = {
                id: DataManager.generateId('worker'),
                name: name,
                task: task,
                phone: phone,
                email: email,
                memo: memo,
            };

            DataStore.workers.push(worker);
            DataManager.addChangeLog('create', 'worker', worker.id, `작업자 등록: ${name}`, AppState.currentRole);
            DataManager.saveData();

            document.getElementById('new-worker-name').value = '';
            document.getElementById('new-worker-task').value = '';
            document.getElementById('new-worker-phone').value = '';
            document.getElementById('new-worker-email').value = '';
            document.getElementById('new-worker-memo').value = '';

            renderWorkerList();
            UIController.showToast('✅ 작업자가 추가되었습니다', 'success');
        }

// deleteWorker
        function deleteWorker(workerId) {
            const worker = DataStore.workers.find(w => w.id === workerId);
            if (!worker) return;

            if (!confirm(`"${worker.name}" 작업자를 삭제하시겠습니까?`)) {
                return;
            }

            DataStore.workers = DataStore.workers.filter(w => w.id !== workerId);
            DataManager.saveData();
            renderWorkerList();
            UIController.showToast('✅ 작업자가 삭제되었습니다', 'success');
        }

// addManager
        function addManager() {
            const name = document.getElementById('new-manager-name').value.trim();
            const task = document.getElementById('new-manager-task').value.trim();
            const phone = document.getElementById('new-manager-phone').value.trim();
            const email = document.getElementById('new-manager-email').value.trim();

            if (!name) {
                UIController.showToast('이름을 입력하세요', 'error');
                return;
            }

            const manager = {
                id: DataManager.generateId('manager'),
                name: name,
                task: task,
                phone: phone,
                email: email,
                workers: [],
            };

            DataStore.managers.push(manager);
            DataManager.addChangeLog('create', 'manager', manager.id, `업무 담당자 등록: ${name}`, AppState.currentRole);
            DataManager.saveData();

            document.getElementById('new-manager-name').value = '';
            document.getElementById('new-manager-task').value = '';
            document.getElementById('new-manager-phone').value = '';
            document.getElementById('new-manager-email').value = '';

            renderManagerList();
            UIController.showToast('✅ 업무 담당자가 추가되었습니다', 'success');
        }

// deleteManager
        function deleteManager(managerId) {
            const manager = DataStore.managers.find(m => m.id === managerId);
            if (!manager) return;

            if (!confirm(`"${manager.name}" 업무 담당자를 삭제하시겠습니까?`)) {
                return;
            }

            DataStore.managers = DataStore.managers.filter(m => m.id !== managerId);
            DataManager.saveData();
            renderManagerList();
            UIController.showToast('✅ 업무 담당자가 삭제되었습니다', 'success');
        }

// addPart
        function addPart() {
            const name = document.getElementById('new-part-name').value.trim();
            const color = document.getElementById('new-part-color').value;

            if (!name) {
                UIController.showToast('구분명을 입력하세요', 'error');
                return;
            }

            const part = {
                id: DataManager.generateId('part'),
                name: name,
                color: color,
                order: DataStore.parts.length + 1,
            };

            DataStore.parts.push(part);
            DataManager.addChangeLog('create', 'part', part.id, `담당업무 구분 등록: ${name}`, AppState.currentRole);
            DataManager.saveData();

            document.getElementById('new-part-name').value = '';
            document.getElementById('new-part-color').value = '#3b82f6';

            renderPartList();
            renderWorkerList(); // 드롭다운 업데이트
            UIController.showToast('✅ 담당업무 구분이 추가되었습니다', 'success');
        }

// deletePart
        function deletePart(partId) {
            const part = DataStore.parts.find(p => p.id === partId);
            if (!part) return;

            if (!confirm(`"${part.name}" 구분을 삭제하시겠습니까?`)) {
                return;
            }

            DataStore.parts = DataStore.parts.filter(p => p.id !== partId);
            DataManager.saveData();
            renderPartList();
            UIController.showToast('✅ 담당업무 구분이 삭제되었습니다', 'success');
        }

// addHoliday
        function addHoliday() {
            const startDate = document.getElementById('new-hol-start').value;
            const endDate = document.getElementById('new-hol-end').value || startDate;
            const name = document.getElementById('new-hol-name').value.trim();

            if (!startDate || !name) {
                UIController.showToast('시작일과 이름을 입력하세요', 'error');
                return;
            }

            const holiday = {
                id: DataManager.generateId('hol'),
                startDate: startDate,
                endDate: endDate,
                name: name,
            };

            DataStore.holidays.push(holiday);
            DataManager.addChangeLog('create', 'holiday', holiday.id, `휴일 등록: ${name}`, AppState.currentRole);
            DataManager.saveData();

            document.getElementById('new-hol-start').value = '';
            document.getElementById('new-hol-end').value = '';
            document.getElementById('new-hol-name').value = '';

            renderHolidayList();
            UIController.showToast('✅ 휴일이 추가되었습니다', 'success');
        }

// deleteHoliday
        function deleteHoliday(holidayId) {
            const holiday = DataStore.holidays.find(h => h.id === holidayId);
            if (!holiday) return;

            if (!confirm(`"${holiday.name}" 휴일을 삭제하시겠습니까?`)) {
                return;
            }

            DataStore.holidays = DataStore.holidays.filter(h => h.id !== holidayId);
            DataManager.saveData();
            renderHolidayList();
            UIController.showToast('✅ 휴일이 삭제되었습니다', 'success');
        }

// bulkRegisterHolidays
        function bulkRegisterHolidays() {
            const year = parseInt(document.getElementById('hol-bulk-year').value);

            const baseHolidays = [
                { month: 1, day: 1, name: '신정' },
                { month: 3, day: 1, name: '삼일절' },
                { month: 5, day: 5, name: '어린이날' },
                { month: 6, day: 6, name: '현충일' },
                { month: 8, day: 15, name: '광복절' },
                { month: 10, day: 3, name: '개천절' },
                { month: 10, day: 9, name: '한글날' },
                { month: 12, day: 25, name: '크리스마스' },
            ];

            let addedCount = 0;
            baseHolidays.forEach(hol => {
                const dateStr = `${year}-${String(hol.month).padStart(2, '0')}-${String(hol.day).padStart(2, '0')}`;

                // 중복 체크
                const exists = DataStore.holidays.some(h => h.startDate === dateStr);
                if (!exists) {
                    DataStore.holidays.push({
                        id: DataManager.generateId('hol'),
                        startDate: dateStr,
                        endDate: dateStr,
                        name: hol.name,
                    });
                    addedCount++;
                }
            });

            DataManager.saveData();
            renderHolidayList();
            UIController.showToast(`✅ ${addedCount}개의 공휴일이 등록되었습니다`, 'success');
        }

// renderProjectList
        function renderProjectList() {
            const html = DataStore.projects.map(proj => `
                <div style="background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:24px; height:24px; border-radius:50%; background:${proj.color};"></div>
                        <span style="font-weight:700;">${proj.name}</span>
                    </div>
                    <button class="btn btn-danger btn-icon" onclick="deleteProject('${proj.id}')">🗑️</button>
                </div>
            `).join('');

            document.getElementById('project-list').innerHTML = html || '<div style="text-align:center; color:var(--text-sub); padding:20px;">등록된 프로젝트가 없습니다</div>';
            document.getElementById('project-count').textContent = DataStore.projects.length;
        }

// renderWorkerList
        function renderWorkerList() {
            const html = DataStore.workers.map(worker => `
                <div class="person-list-item">
                    <div class="person-info">
                        <div class="person-name">${worker.name} <span class="person-badge">${worker.task || '미지정'}</span></div>
                        <div class="person-meta">
                            ${worker.phone ? '📞 ' + worker.phone : ''}
                            ${worker.email ? '📧 ' + worker.email : ''}
                            ${worker.memo ? '<br>💬 ' + worker.memo : ''}
                        </div>
                    </div>
                    <button class="btn btn-danger btn-icon" onclick="deleteWorker('${worker.id}')">🗑️</button>
                </div>
            `).join('');

            document.getElementById('worker-list').innerHTML = html || '<div style="text-align:center; color:var(--text-sub); padding:20px;">등록된 작업자가 없습니다</div>';
            document.getElementById('worker-count').textContent = DataStore.workers.length;

            // 담당업무 선택 드롭다운 업데이트
            const taskSelect = document.getElementById('new-worker-task');
            if (taskSelect) {
                taskSelect.innerHTML = '<option value="">선택하세요</option>' +
                    DataStore.parts.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
            }
        }

// renderManagerList
        function renderManagerList() {
            const html = DataStore.managers.map(manager => `
                <div class="person-list-item">
                    <div class="person-info">
                        <div class="person-name">${manager.name} <span class="person-badge">${manager.task || '미지정'}</span></div>
                        <div class="person-meta">
                            ${manager.phone ? '📞 ' + manager.phone : ''}
                            ${manager.email ? '📧 ' + manager.email : ''}
                        </div>
                    </div>
                    <button class="btn btn-danger btn-icon" onclick="deleteManager('${manager.id}')">🗑️</button>
                </div>
            `).join('');

            document.getElementById('manager-list').innerHTML = html || '<div style="text-align:center; color:var(--text-sub); padding:20px;">등록된 업무 담당자가 없습니다</div>';
            document.getElementById('manager-count').textContent = DataStore.managers.length;
        }

// renderPartList
        function renderPartList() {
            const html = DataStore.parts.sort((a, b) => a.order - b.order).map(part => `
                <div style="background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid ${part.color};">
                    <div>
                        <span style="font-weight:700;">${part.name}</span>
                        <span style="margin-left:10px; font-size:0.8rem; color:var(--text-sub);">순서: ${part.order}</span>
                    </div>
                    <button class="btn btn-danger btn-icon" onclick="deletePart('${part.id}')">🗑️</button>
                </div>
            `).join('');

            document.getElementById('part-list').innerHTML = html || '<div style="text-align:center; color:var(--text-sub); padding:20px;">등록된 구분이 없습니다</div>';
            document.getElementById('part-count').textContent = DataStore.parts.length;
        }

// renderHolidayList
        function renderHolidayList() {
            const html = DataStore.holidays.sort((a, b) => a.startDate.localeCompare(b.startDate)).map(holiday => `
                <div class="holiday-item">
                    <div>
                        <strong>${holiday.name}</strong>
                        <div style="font-size:0.8rem; color:var(--text-sub);">
                            ${holiday.startDate}${holiday.endDate && holiday.endDate !== holiday.startDate ? ' ~ ' + holiday.endDate : ''}
                        </div>
                    </div>
                    <button class="btn btn-danger btn-icon" onclick="deleteHoliday('${holiday.id}')">🗑️</button>
                </div>
            `).join('');

            document.getElementById('holiday-list').innerHTML = html || '<div style="text-align:center; color:var(--text-sub); padding:20px;">등록된 휴일이 없습니다</div>';
            document.getElementById('holiday-count').textContent = DataStore.holidays.length;
        }

// setChartMode
        function setChartMode(mode) {
            AppState.chartMode = mode;
            ['year', 'month', 'week'].forEach(m => {
                const btn = document.getElementById('chart-mode-' + m);
                if (btn) btn.className = m === mode ? 'btn btn-primary' : 'btn btn-outline';
            });
            renderWbsChart();
        }

// changeChartPeriod
        function changeChartPeriod(offset) {
            const d = new Date(AppState.chartDate);
            if (AppState.chartMode === 'year') {
                d.setFullYear(d.getFullYear() + offset);
            } else if (AppState.chartMode === 'month') {
                d.setMonth(d.getMonth() + offset);
            } else if (AppState.chartMode === 'week') {
                d.setDate(d.getDate() + (offset * 7));
            }
            AppState.chartDate = d;
            renderWbsChart();
        }

// goToChartToday
        function goToChartToday() {
            AppState.chartDate = new Date();
            renderWbsChart();
        }

// renderWbsChart
        function renderWbsChart() {
            const projectId = AppState.currentProjectId;
            if (!projectId) return;

            // 기간 라벨 업데이트
            updateChartPeriodLabel();

            // 담당자 필터 드롭다운 업데이트
            updateChartAssigneeFilter();

            // 작업 필터링
            let tasks = DataManager.getFilteredTasksByRole(projectId);
            const assigneeFilter = document.getElementById('chart-assignee-filter')?.value || '';
            if (assigneeFilter) {
                tasks = tasks.filter(t => t.assignee === assigneeFilter);
            }

            // 모드별 렌더링
            if (AppState.chartMode === 'year') {
                renderYearChart(tasks);
            } else if (AppState.chartMode === 'month') {
                renderMonthChart(tasks);
            } else if (AppState.chartMode === 'week') {
                renderWeekChart(tasks);
            }
        }

// updateChartPeriodLabel
        function updateChartPeriodLabel() {
            const d = AppState.chartDate;
            let label = '';

            if (AppState.chartMode === 'year') {
                label = d.getFullYear() + '년';
            } else if (AppState.chartMode === 'month') {
                label = d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월';
            } else if (AppState.chartMode === 'week') {
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                label = `${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 ~ ${weekEnd.getMonth() + 1}월 ${weekEnd.getDate()}일`;
            }

            document.getElementById('chart-period-label').textContent = label;
        }

// updateChartAssigneeFilter
        function updateChartAssigneeFilter() {
            const select = document.getElementById('chart-assignee-filter');
            if (!select || select.options.length > 1) return;

            const assignees = [...new Set(DataStore.tasks.map(t => t.assignee).filter(Boolean))];
            assignees.forEach(assignee => {
                const opt = document.createElement('option');
                opt.value = assignee;
                opt.textContent = assignee;
                select.appendChild(opt);
            });
        }

// renderYearChart
        function renderYearChart(tasks) {
            const year = AppState.chartDate.getFullYear();
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);

            // 월별 헤더 생성
            const months = [];
            for (let m = 0; m < 12; m++) {
                months.push({
                    month: m + 1,
                    label: (m + 1) + '월',
                    days: new Date(year, m + 1, 0).getDate(),
                });
            }

            // 카테고리별 그룹핑 (담당업무별)
            const categoryMap = {};
            tasks.forEach(t => {
                const worker = DataStore.workers.find(w => w.name === t.assignee);
                const category = worker ? worker.task : '미지정';
                if (!categoryMap[category]) categoryMap[category] = [];
                categoryMap[category].push(t);
            });

            // HTML 생성
            let html = '<div class="gantt-timeline-header"><div class="gantt-week-row">';
            months.forEach(m => {
                html += `<div class="gantt-week-label" style="flex: ${m.days} 1 0;">${m.label}</div>`;
            });
            html += '</div></div>';

            html += '<div class="gantt-body">';

            const categoryOrder = ['기획', '디자인', '퍼블리셔', '개발', 'TA', 'AA', 'DA', 'SA', '미지정'];
            const sortedCategories = Object.keys(categoryMap).sort((a, b) => {
                const idxA = categoryOrder.indexOf(a);
                const idxB = categoryOrder.indexOf(b);
                return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
            });

            sortedCategories.forEach(category => {
                const isCollapsed = AppState.collapsedCategories.has(category);
                html += `
                    <div class="gantt-category-header" onclick="toggleChartCategory('${category}')">
                        <span>📁 ${category} (${categoryMap[category].length}개 작업)</span>
                        <span class="gantt-category-toggle ${isCollapsed ? 'collapsed' : ''}">▼</span>
                    </div>
                `;

                if (!isCollapsed) {
                    categoryMap[category].forEach(task => {
                        html += renderTaskRow(task, startDate, endDate, 365);
                    });
                }
            });

            html += '</div>';

            document.getElementById('gantt-chart-container').innerHTML = html || '<div class="gantt-empty">작업이 없습니다</div>';
        }

// renderMonthChart
        function renderMonthChart(tasks) {
            const year = AppState.chartDate.getFullYear();
            const month = AppState.chartDate.getMonth();
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            const daysInMonth = endDate.getDate();

            // 일별 헤더 생성
            let headerHtml = '<div class="gantt-timeline-header"><div class="gantt-day-row">';
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dayOfWeek = date.getDay();
                const dateStr = ScheduleEngine.formatDate(date);
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isHoliday = DataStore.holidays.some(h =>
                    dateStr >= h.startDate && dateStr <= (h.endDate || h.startDate)
                );
                const isToday = dateStr === ScheduleEngine.getToday();

                let cellClass = 'gantt-cell';
                if (isWeekend) cellClass += ' weekend';
                if (isHoliday) cellClass += ' holiday-cell';
                if (isToday) cellClass += ' today-cell';

                headerHtml += `<div class="${cellClass}">${day}</div>`;
            }
            headerHtml += '</div></div>';

            // 작업 행 생성
            let bodyHtml = '<div class="gantt-body">';
            if (tasks.length === 0) {
                bodyHtml += '<div class="gantt-empty">이 기간에 작업이 없습니다</div>';
            } else {
                tasks.forEach(task => {
                    bodyHtml += renderTaskRow(task, startDate, endDate, daysInMonth);
                });
            }
            bodyHtml += '</div>';

            document.getElementById('gantt-chart-container').innerHTML = headerHtml + bodyHtml;
        }

// renderWeekChart
        function renderWeekChart(tasks) {
            const d = new Date(AppState.chartDate);
            const startDate = new Date(d);
            startDate.setDate(d.getDate() - d.getDay()); // 일요일
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // 토요일

            // 요일 헤더
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            let headerHtml = '<div class="gantt-timeline-header"><div class="gantt-day-row">';

            for (let i = 0; i < 7; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                const dateStr = ScheduleEngine.formatDate(date);
                const isWeekend = i === 0 || i === 6;
                const isHoliday = DataStore.holidays.some(h =>
                    dateStr >= h.startDate && dateStr <= (h.endDate || h.startDate)
                );
                const isToday = dateStr === ScheduleEngine.getToday();

                let cellClass = 'gantt-cell';
                if (isWeekend) cellClass += ' weekend';
                if (isHoliday) cellClass += ' holiday-cell';
                if (isToday) cellClass += ' today-cell';

                headerHtml += `<div class="${cellClass}">
                    <div>${dayNames[i]}</div>
                    <div style="font-size:0.9rem;">${date.getMonth() + 1}/${date.getDate()}</div>
                </div>`;
            }
            headerHtml += '</div></div>';

            // 작업 행
            let bodyHtml = '<div class="gantt-body">';
            if (tasks.length === 0) {
                bodyHtml += '<div class="gantt-empty">이 주에 작업이 없습니다</div>';
            } else {
                tasks.forEach(task => {
                    bodyHtml += renderTaskRow(task, startDate, endDate, 7);
                });
            }
            bodyHtml += '</div>';

            document.getElementById('gantt-chart-container').innerHTML = headerHtml + bodyHtml;
        }

// renderTaskRow
        function renderTaskRow(task, periodStart, periodEnd, totalDays) {
            if (!task.startDate || !task.endDate) return '';

            const taskStart = new Date(task.startDate);
            const taskEnd = new Date(task.endDate);

            // 기간 외 작업 제외
            if (taskEnd < periodStart || taskStart > periodEnd) return '';

            // 바 위치 계산
            const visibleStart = taskStart < periodStart ? periodStart : taskStart;
            const visibleEnd = taskEnd > periodEnd ? periodEnd : taskEnd;

            const startOffset = Math.max(0, (visibleStart - periodStart) / (1000 * 60 * 60 * 24));
            const duration = (visibleEnd - visibleStart) / (1000 * 60 * 60 * 24) + 1;

            const leftPercent = (startOffset / totalDays) * 100;
            const widthPercent = (duration / totalDays) * 100;

            const statusClass = `status-${task.status || 'todo'}`;
            const priorityClass = task.priority === 'high' ? 'priority-high' : '';
            const isMilestone = task.isMilestone;
            const progressPercent = Math.max(0, Math.min(100, task.progress || 0));

            return `
                <div class="gantt-task-row">
                    <div class="gantt-task-info">
                        <div class="gantt-task-title">${isMilestone ? '🎯 ' : ''}${task.title}</div>
                        <div class="gantt-task-meta">
                            ${task.assignee ? '👤 ' + task.assignee : ''}
                            ${typeof task.progress !== 'undefined' ? ' ' + progressPercent + '%' : ''}
                        </div>
                    </div>
                    <div class="gantt-timeline">
                        <div class="gantt-bar ${statusClass} ${priorityClass}"
                             style="left: ${leftPercent}%; width: ${widthPercent}%;"
                             onclick="openTaskDetailModal('${task.id}')"
                             title="클릭하여 상세 정보 보기">
                            <div class="gantt-bar-progress" style="width: ${progressPercent}%; background: rgba(255,255,255,0.2);"></div>
                            <span class="gantt-bar-label">${widthPercent > 6 ? progressPercent + '%' : ''}</span>
                            ${isMilestone ? '<div class="gantt-bar-milestone">🎯</div>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }

// toggleChartCategory
        function toggleChartCategory(category) {
            if (AppState.collapsedCategories.has(category)) {
                AppState.collapsedCategories.delete(category);
            } else {
                AppState.collapsedCategories.add(category);
            }
            renderWbsChart();
        }

// openTaskDetailModal
        function openTaskDetailModal(taskId) {
            const task = DataStore.tasks.find(t => t.id === taskId);
            if (!task) return;

            currentEditingTaskId = taskId;

            // 폼 필드 채우기
            document.getElementById('task-detail-title').value = task.title || '';
            document.getElementById('task-detail-start').value = task.startDate || '';
            document.getElementById('task-detail-end').value = task.endDate || '';
            document.getElementById('task-detail-status').value = task.status || 'todo';
            document.getElementById('task-detail-priority').value = task.priority || 'medium';
            document.getElementById('task-detail-progress').value = task.progress || 0;
            document.getElementById('task-detail-progress-value').textContent = task.progress || 0;
            document.getElementById('task-detail-milestone').checked = task.isMilestone || false;
            document.getElementById('task-detail-memo').value = task.memo || '';

            // 담당자 드롭다운 채우기
            const assigneeSelect = document.getElementById('task-detail-assignee');
            assigneeSelect.innerHTML = '<option value="">선택하세요</option>';
            DataStore.workers.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.name;
                opt.textContent = w.name;
                if (task.assignee === w.name) opt.selected = true;
                assigneeSelect.appendChild(opt);
            });

            // 선행작업 체크박스 리스트 생성
            renderDependenciesList(task);

            // 모달 표시
            document.getElementById('task-detail-modal').classList.add('show');
        }

// renderDependenciesList
        function renderDependenciesList(task) {
            const projectId = AppState.currentProjectId;
            const allTasks = DataStore.tasks.filter(t =>
                t.projectId === projectId && t.id !== task.id
            );

            const container = document.getElementById('task-detail-dependencies');

            if (allTasks.length === 0) {
                container.innerHTML = '<div style="color:var(--text-sub); text-align:center; padding:10px;">다른 작업이 없습니다</div>';
                return;
            }

            const dependencies = task.dependencies || [];

            container.innerHTML = allTasks.map(t => `
                <div style="padding:6px; border-bottom:1px solid #f0f0f0;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox"
                               value="${t.id}"
                               ${dependencies.includes(t.id) ? 'checked' : ''}
                               style="width:auto; margin:0;">
                        <span style="font-size:0.85rem;">${t.wbsCode ? t.wbsCode + ' - ' : ''}${t.title}</span>
                    </label>
                </div>
            `).join('');
        }

// updateProgressValue
        function updateProgressValue(value) {
            document.getElementById('task-detail-progress-value').textContent = value;
        }

// closeTaskDetailModal
        function closeTaskDetailModal() {
            document.getElementById('task-detail-modal').classList.remove('show');
            currentEditingTaskId = null;
        }

// saveTaskFromModal
        function saveTaskFromModal() {
            const task = DataStore.tasks.find(t => t.id === currentEditingTaskId);
            if (!task) return;

            // 유효성 검사
            const title = document.getElementById('task-detail-title').value.trim();
            if (!title) {
                document.getElementById('task-detail-error').textContent = '작업 제목을 입력하세요';
                return;
            }

            // 선행작업 수집
            const dependencyCheckboxes = document.querySelectorAll('#task-detail-dependencies input[type="checkbox"]:checked');
            const dependencies = Array.from(dependencyCheckboxes).map(cb => cb.value);

            // 데이터 업데이트
            const oldTitle = task.title;
            task.title = title;
            task.startDate = document.getElementById('task-detail-start').value;
            task.endDate = document.getElementById('task-detail-end').value;
            task.assignee = document.getElementById('task-detail-assignee').value;
            task.status = document.getElementById('task-detail-status').value;
            task.priority = document.getElementById('task-detail-priority').value;
            task.progress = parseInt(document.getElementById('task-detail-progress').value);
            task.isMilestone = document.getElementById('task-detail-milestone').checked;
            task.dependencies = dependencies;
            task.memo = document.getElementById('task-detail-memo').value;

            // 완료 상태면 진행률 100%
            if (task.status === 'done') {
                task.progress = 100;
            }

            // 변경 이력 추가
            DataManager.addChangeLog(
                'update',
                'task',
                task.id,
                `작업 수정: ${oldTitle} → ${title}`,
                AppState.currentRole
            );

            // 저장 및 화면 갱신
            DataManager.saveData();
            closeTaskDetailModal();
            renderWbsChart();
            UIController.showToast('✅ 작업이 저장되었습니다', 'success');
        }

// deleteTaskFromModal
        function deleteTaskFromModal() {
            const task = DataStore.tasks.find(t => t.id === currentEditingTaskId);
            if (!task) return;

            if (!confirm(`"${task.title}" 작업을 삭제하시겠습니까?`)) {
                return;
            }

            // 하위 작업도 함께 삭제

            deleteRecursive(currentEditingTaskId);

            DataManager.addChangeLog('delete', 'task', currentEditingTaskId, `작업 삭제: ${task.title}`, AppState.currentRole);
            DataManager.saveData();
            closeTaskDetailModal();
            renderWbsChart();
            UIController.showToast('✅ 작업이 삭제되었습니다', 'success');
        }

// renderGanttChart
        function renderGanttChart() {
            renderWbsChart();
        }

// renderWorkload
        function renderWorkload() {
            const projectId = AppState.currentProjectId;
            if (!projectId) return;

            const workers = DataStore.workers;
            const tasks = DataStore.tasks.filter(t => t.projectId === projectId);

            const html = workers.map(worker => {
                const workerTasks = tasks.filter(t => t.assignee === worker.name);
                const total = workerTasks.length;
                const done = workerTasks.filter(t => t.status === 'done').length;
                const inProgress = workerTasks.filter(t => t.status === 'inprogress').length;
                const overdue = workerTasks.filter(t => ScheduleEngine.isTaskOverdue(t)).length;

                const loadPercent = total > 0 ? Math.min(100, (inProgress / 5) * 100) : 0; // 5개 이상이면 100%

                return `
                    <div class="workload-item">
                        <div class="workload-top">
                            <div class="workload-name">${worker.name} <span class="person-badge">${worker.task}</span></div>
                            <div class="workload-stats">
                                <span>전체 ${total}</span>
                                <span>완료 ${done}</span>
                                <span>진행 ${inProgress}</span>
                                ${overdue > 0 ? `<span style="color:var(--danger)">지연 ${overdue}</span>` : ''}
                            </div>
                        </div>
                        <div class="workload-bar-outer">
                            <div class="workload-bar-inner" style="width:${loadPercent}%; background:${loadPercent >= 80 ? 'var(--danger)' : loadPercent >= 50 ? 'var(--warning)' : 'var(--secondary)'};"></div>
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-sub); margin-top:4px;">
                            업무 부하: ${Math.round(loadPercent)}% ${loadPercent >= 80 ? '⚠️ 과부하' : ''}
                        </div>
                    </div>
                `;
            }).join('');

            document.getElementById('workload-list').innerHTML = html || '<div style="text-align:center; color:var(--text-sub); padding:40px;">등록된 작업자가 없습니다</div>';
        }

// generateMonthlyReport
        function generateMonthlyReport() {
            const projectId = AppState.currentProjectId;
            if (!projectId) return;

            const project = DataStore.projects.find(p => p.id === projectId);
            const now = new Date();
            const monthStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

            document.getElementById('monthly-report-proj-name').textContent = project.name;
            document.getElementById('monthly-report-month').textContent = monthStr;

            // 이번 달 작업 필터링
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const firstDayStr = ScheduleEngine.formatDate(firstDay);
            const lastDayStr = ScheduleEngine.formatDate(lastDay);

            const tasks = DataStore.tasks.filter(t => t.projectId === projectId);
            const monthTasks = tasks.filter(t =>
                t.startDate <= lastDayStr && t.endDate >= firstDayStr
            );

            const completed = monthTasks.filter(t => t.status === 'done');
            const inProgress = monthTasks.filter(t => t.status === 'inprogress');
            const totalProgress = ScheduleEngine.calculateProjectProgress(projectId);

            const html = `
                <div style="text-align:center; padding:20px 0;">
                    <div style="font-size:2.5rem; font-weight:900; color:var(--primary);">${totalProgress}%</div>
                    <div style="font-size:1.1rem; color:var(--text-sub);">전체 진행률</div>
                </div>

                <div class="report-section">
                    <h2 class="report-section-title done">✅ 이번 달 완료 (${completed.length}건)</h2>
                    <div class="report-task-list">
                        ${completed.map(t => `<div class="report-task-item">• ${t.title} (${t.assignee || '미지정'})</div>`).join('') || '<div style="color:var(--text-sub)">완료 작업 없음</div>'}
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="report-section-title plan">🚀 진행 중 (${inProgress.length}건)</h2>
                    <div class="report-task-list">
                        ${inProgress.map(t => `<div class="report-task-item">• ${t.title} - ${t.progress || 0}%</div>`).join('') || '<div style="color:var(--text-sub)">진행 중 작업 없음</div>'}
                    </div>
                </div>
            `;

            document.getElementById('monthly-report-content').innerHTML = html;
            UIController.showToast('✅ 월간 보고서가 생성되었습니다', 'success');
        }

// loadSampleData
        function loadSampleData() {
            if (!confirm('⚠️ 현재 데이터가 모두 삭제됩니다!\n샘플 데이터를 불러오시겠습니까?')) {
                return;
            }

            DataManager.initializeSampleData();

            // 프로젝트 선택 드롭다운 재구성
            const projectSelect = document.getElementById('current-project-select');
            projectSelect.innerHTML = '';
            DataStore.projects.forEach(proj => {
                const option = document.createElement('option');
                option.value = proj.id;
                option.textContent = proj.name;
                projectSelect.appendChild(option);
            });
            projectSelect.value = AppState.currentProjectId;

            // 화면 새로고침
            UIController.renderCurrentView();

            UIController.showToast('✅ 샘플 데이터가 로드되었습니다!', 'success');

            // 안내 메시지
            setTimeout(() => {
                alert(`📦 샘플 데이터 로드 완료!\n\n✅ 로드된 내용:\n• 프로젝트: 신규 모바일 앱 개발\n• 작업자: 6명 (기획/디자인/퍼블/개발/TA)\n• 작업: 15개 (계층 구조 포함)\n• RISK: 2건\n• 휴일: 8개\n• 변경 이력: 3건\n\n💡 대시보드, WBS, RISK 메뉴를 확인해보세요!`);
            }, 500);
        }

// showDataStructureHelp
        function showDataStructureHelp() {
            const helpContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 프로젝트 관리 시스템 데이터 구조 설명
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎒 1. 전체 데이터는 하나의 큰 가방입니다!
   └─ 이름: "pmSystemData"
   └─ 저장 위치: 브라우저 로컬스토리지
   └─ 파일 형태: JSON (텍스트 파일)

📦 2. 가방 안에는 8개의 작은 상자가 있어요

   📁 상자 1: projects (프로젝트 목록)
      └─ "우리가 진행하는 프로젝트들"
      └─ 예: "모바일 앱 개발", "웹사이트 리뉴얼"
      └─ 각 프로젝트마다 고유번호(id), 이름, 색깔이 있어요

   📁 상자 2: tasks (작업 목록)
      └─ "해야 할 일들의 리스트"
      └─ 예: "디자인 작업", "코딩하기", "테스트하기"
      └─ 누가, 언제부터, 언제까지, 얼마나 완성했는지 기록

   📁 상자 3: workers (작업자 목록)
      └─ "프로젝트에 참여하는 사람들"
      └─ 예: "김개발", "이디자인", "박기획"
      └─ 이름, 전화번호, 이메일, 담당 업무 기록

   📁 상자 4: managers (업무 담당자)
      └─ "팀을 이끄는 리더들"
      └─ 예: "홍PL", "최팀장"
      └─ 누가 어떤 팀원을 관리하는지 기록

   📁 상자 5: parts (담당업무 구분)
      └─ "일의 종류를 나누는 기준"
      └─ 예: "기획", "디자인", "개발", "테스트"
      └─ 각 업무마다 색깔이 있어요

   📁 상자 6: risks (위험 요소)
      └─ "프로젝트에 문제가 될 수 있는 것들"
      └─ 예: "일정 지연", "인력 부족"
      └─ 얼마나 심각한지, 어떻게 대응하는지 기록

   📁 상자 7: holidays (휴일)
      └─ "쉬는 날 목록"
      └─ 예: "설날", "추석", "크리스마스"
      └─ 날짜 계산할 때 빼야 해요

   📁 상자 8: changelog (변경 이력)
      └─ "누가 무엇을 바꿨는지 기록"
      └─ 예: "홍PL이 작업 진행률을 60%→80%로 변경"
      └─ 시간, 사용자, 변경 내용 저장

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 3. 데이터가 어떻게 생겼는지 볼까요?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

예시) 작업(Task) 하나의 모습:

{
  "id": "task_123",           ← 고유번호 (중복되지 않아요)
  "projectId": "proj_456",    ← 어떤 프로젝트 작업인지
  "title": "로그인 화면 만들기",  ← 작업 이름
  "assignee": "김개발",        ← 담당자
  "startDate": "2026-07-01",  ← 시작날짜
  "endDate": "2026-07-10",    ← 마감날짜
  "status": "inprogress",     ← 상태 (진행중)
  "priority": "high",         ← 중요도 (높음)
  "progress": 60,             ← 진행률 (60%)
  "memo": "디자인 확인 필요"    ← 메모
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 4. 데이터는 어디에 어떻게 저장되나요?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 저장 장소 2곳:

1️⃣ 브라우저 로컬스토리지 (자동 저장)
   • 위치: 브라우저 안 보이지 않는 저장소
   • 언제: 작업 추가/수정/삭제할 때마다 자동
   • 특징: 빠르고 편리하지만, 브라우저 데이터 삭제하면 사라져요

2️⃣ JSON 파일 (수동 백업)
   • 위치: 컴퓨터 폴더 (다운로드 폴더 등)
   • 언제: "💾 전체 저장(JSON)" 버튼 누를 때
   • 특징: 파일로 저장되어서 안전해요!
   • 파일명 예시: PMSystem_Backup_2026-07-20.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 5. 폐쇄망에서 데이터 공유하는 방법
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

상황: 인터넷이 안 되는 환경에서 팀원들과 협업!

방법 1: USB 메모리 사용
  1. PM이 "💾 전체 저장(JSON)" 클릭
  2. JSON 파일을 USB에 복사
  3. 팀원에게 USB 전달
  4. 팀원이 "📂 불러오기" 클릭하여 파일 선택
  5. 데이터 동기화 완료! ✅

방법 2: 공유 폴더 사용
  1. 회사 내부 공유 폴더 지정
  2. "백업 관리"에서 로컬 폴더 설정
  3. 자동으로 JSON 파일 저장
  4. 팀원들이 같은 폴더에서 최신 파일 불러오기

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 6. JSON 파일을 열어보면?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

메모장으로 JSON 파일을 열면 이렇게 생겼어요:

{
  "projects": [ ... ],    ← 프로젝트들
  "tasks": [ ... ],       ← 작업들
  "workers": [ ... ],     ← 작업자들
  "risks": [ ... ],       ← 위험들
  ...
}

💡 직접 수정할 수도 있지만, 조심해야 해요!
   - 쉼표(,) 하나만 빠져도 오류 발생
   - 프로그램에서 수정하는 게 안전해요

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 7. 데이터 연결 구조 (중요!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

작업(Task)과 다른 데이터가 연결되는 방법:

작업 ━━━━━━┓
           ┣━━ projectId로 연결 ━━→ 프로젝트
           ┣━━ assignee로 연결 ━━→ 작업자
           ┣━━ parentId로 연결 ━━→ 상위 작업
           ┗━━ 날짜로 연결 ━━━━━→ 휴일

예시:
  작업: "로그인 개발"
    └─ projectId: "proj_123"
        → "모바일 앱" 프로젝트에 속함
    └─ assignee: "김개발"
        → 김개발이 담당
    └─ parentId: "task_100"
        → "앱 개발"의 하위 작업

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 8. 정리하면...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎒 시스템 = 큰 가방 1개
📦 가방 안 = 8개 상자 (프로젝트, 작업, 사람, RISK 등)
📄 각 데이터 = 고유번호 + 여러 정보
💾 저장 = 브라우저(자동) + JSON파일(수동)
🔗 연결 = ID로 서로 연결됨
🔄 공유 = USB나 공유폴더로 JSON 전달

이제 이해되셨나요? 😊
            `;

            // 새 창에 표시
            const helpWindow = window.open('', '데이터 구조 설명', 'width=800,height=600');
            helpWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>데이터 구조 설명</title>
                    <style>
                        body {
                            font-family: 'Malgun Gothic', sans-serif;
                            padding: 20px;
                            background: #f3f4f6;
                            line-height: 1.8;
                        }
                        pre {
                            background: white;
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            white-space: pre-wrap;
                            font-size: 14px;
                            overflow-x: auto;
                        }
                        .btn {
                            background: #2563eb;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 16px;
                            margin: 10px 0;
                        }
                        .btn:hover {
                            background: #1e40af;
                        }
                    </style>
                </head>
                <body>
                    <button class="btn" onclick="window.print()">🖨️ 인쇄하기</button>
                    <button class="btn" onclick="window.close()">닫기</button>
                    <pre>${helpContent}</pre>
                </body>
                </html>
            `);
        }

// deleteRecursive
        function deleteRecursive(id) {
            const children = DataStore.tasks.filter(t => t.parentId === id);
            children.forEach(child => deleteRecursive(child.id));
            DataStore.tasks = DataStore.tasks.filter(t => t.id !== id);
        }
