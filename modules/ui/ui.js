        const UIController = {
            /**
             * 5-1. 화면 전환
             */
            switchView(viewName, menuElement) {
                // 모든 뷰 숨김
                document.querySelectorAll('.view-container').forEach(v => {
                    v.classList.remove('active');
                });

                // 선택된 뷰 표시
                const targetView = document.getElementById('view-' + viewName);
                if (targetView) {
                    targetView.classList.add('active');
                    AppState.currentView = viewName;
                }

                // 메뉴 활성화 상태 업데이트
                document.querySelectorAll('.nav-item, .nav-subitem').forEach(item => {
                    item.classList.remove('active');
                });
                if (menuElement) {
                    menuElement.classList.add('active');
                }

                // 페이지 타이틀 업데이트
                const titles = {
                    'dashboard': '대시보드',
                    'pl-dashboard': '내 팀 대시보드',
                    'wbs': '작업 목록 (WBS)',
                    'risks': 'RISK 관리',
                    'weekly-report': '주간 보고서',
                    'client-report': '고객 보고 뷰',
                    'changelog': '변경 이력',
                    'projects': '프로젝트 관리',
                    'workers': '작업자 관리',
                    'parts': '담당업무 구분',
                    'dashboard-settings': '대시보드 설정',
                    'backup': '백업 관리',
                };
                document.getElementById('page-title').textContent = titles[viewName] || viewName;

                // 뷰별 렌더링
                this.renderCurrentView();

                // 모바일 사이드바 닫기
                this.closeSidebar();
            },

            /**
             * 5-2. 현재 뷰 렌더링
             */
            renderCurrentView() {
                switch (AppState.currentView) {
                    case 'dashboard':
                        DashboardRenderer.render();
                        break;
                    case 'pl-dashboard':
                        PLDashboardRenderer.render();
                        break;
                    case 'dashboard-settings':
                        renderDashboardSettings();
                        break;
                    case 'wbs':
                        WBSRenderer.render();
                        break;
                    case 'wbs-chart':
                        renderWbsChart(); // 일정 차트 렌더링
                        break;
                    case 'workload':
                        renderWorkload();
                        break;
                    case 'holidays':
                        renderHolidayList();
                        break;
                    case 'risks':
                        RiskRenderer.render();
                        break;
                    case 'weekly-report':
                        // 버튼 클릭으로 생성
                        break;
                    case 'monthly-report':
                        // 버튼 클릭으로 생성
                        break;
                    case 'client-report':
                        // 버튼 클릭으로 생성
                        break;
                    case 'changelog':
                        ChangelogRenderer.render();
                        break;
                    case 'projects':
                        renderProjectList();
                        break;
                    case 'workers':
                        renderWorkerList();
                        break;
                    case 'managers':
                        renderManagerList();
                        break;
                    case 'parts':
                        renderPartList();
                        break;
                    case 'backup':
                        // 정적 화면
                        break;
                }
            },

            /**
             * 5-3. 토스트 알림 표시
             */
            showToast(message, type = 'info') {
                const container = document.getElementById('toast-container');
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                toast.textContent = message;

                container.appendChild(toast);

                setTimeout(() => {
                    toast.remove();
                }, 3000);
            },

            /**
             * 5-4. 사이드바 토글 (모바일)
             */
            toggleSidebar() {
                const sidebar = document.getElementById('sidebar');
                const backdrop = document.getElementById('sidebar-backdrop');

                sidebar.classList.toggle('open');
                backdrop.classList.toggle('show');
            },

            /**
             * 5-5. 사이드바 닫기
             */
            closeSidebar() {
                const sidebar = document.getElementById('sidebar');
                const backdrop = document.getElementById('sidebar-backdrop');

                sidebar.classList.remove('open');
                backdrop.classList.remove('show');
            },

            /**
             * 5-6. 역할별 UI 업데이트 (Phase 1)
             */
            updateUIByRole(role) {
                const plDashboardNav = document.getElementById('nav-pl-dashboard');

                if (role.startsWith('pl_')) {
                    // PL인 경우 전용 대시보드 표시
                    plDashboardNav.style.display = 'block';
                } else {
                    plDashboardNav.style.display = 'none';
                }
            },
        };