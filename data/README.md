# 프로젝트 데이터 구조 설명서

이 프로젝트의 모든 데이터는 `project_data.json` 하나로 관리됩니다.
이 문서는 JSON의 각 필드가 무엇을 의미하는지, 어떤 관계를 가지는지 설명합니다.

---

## 전체 구조

```
project_data.json
├── projects       : 프로젝트 목록
├── tasks          : 작업(WBS) 목록
├── workers        : 작업자 목록
├── managers       : PL/팀장 목록
├── parts          : 업무 영역 구분
├── risks          : 리스크 목록
├── holidays       : 휴일 목록
├── plComments     : PL 주간 코멘트
└── changelog      : 변경 이력 로그
```

---

## 상세 필드 설명

### projects (프로젝트 목록)
프로젝트 자체의 정보입니다. 보통 1개의 프로젝트만 사용합니다.
| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 고유 식별자 (예: "proj_1234567890") |
| name | string | 프로젝트 이름 |
| color | string | 대시보드에서 사용할 색상 코드 (예: "#2563eb") |
| createdAt | string | 생성 일시 (ISO 문자열) |

### tasks (작업 목록 - 가장 중요)
WBS(Work Breakdown Structure)의 각 작업 항목입니다.
| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 작업 고유 ID (예: "task_1", "task_1_1") |
| projectId | string | 소속 프로젝트 ID |
| title | string | 작업 이름 |
| wbsCode | string | WBS 코드 (예: "1.0", "1.1") |
| status | string | todo / inprogress / review / done / cancel |
| priority | string | high / medium / low |
| progress | number | 진행률 0~100 |
| startDate | string | 시작일 (YYYY-MM-DD) |
| endDate | string | 마감일 (YYYY-MM-DD) |
| assignee | string | 담당자 이름 (workers.name 참조) |
| parentId | string | 부모 작업 ID (하위작업일 경우) |
| dependencies | array | 선행 작업 ID 목록 |
| memo | string | 작업 비고 |
| isMilestone | boolean | 마일스톤 여부 |
| createdAt | string | 생성 일시 |

### workers (작업자 목록)
프로젝트에 참여하는 작업자 정보입니다.
| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 작업자 고유 ID |
| name | string | 작업자 이름 |
| task | string | 소속 업무 영역 (parts.name 참조) |
| phone | string | 연락처 |
| email | string | 이메일 |
| memo | string | 특이사항 |

### managers (PL/팀장 목록)
프로젝트의 PL 또는 팀장 정보입니다.
| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 관리자 고유 ID |
| name | string | 이름 |
| task | string | 직책/역할 |
| phone | string | 연락처 |
| email | string | 이메일 |
| workers | array | 관리하는 작업자 이름 목록 |

### parts (업무 영역 구분)
작업을 분류하는 영역입니다.
| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 영역 고유 ID |
| name | string | 영역 이름 (예: "기획", "개발") |
| color | string | 대시보드 색상 코드 |
| order | number | 정렬 순서 |

### risks (리스크 목록)
프로젝트 리스크 관리 항목입니다.
| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 리스크 고유 ID |
| projectId | string | 소속 프로젝트 ID |
| title | string | 리스크 제목 |
| description | string | 상세 설명 |
| category | string | 리스크 분류 (external, resource, technical, schedule) |
| severity | string | critical / high / medium / low |
| probability | string | 발생 확률 (high / medium / low) |
| impact | string | 영향도 (high / medium / low) |
| status | string | open / mitigating / mitigated / escalated |
| updates | array | 조치 이력 목록 |
| createdAt | string | 생성 일시 |
| autoDetected | boolean | 자동 감지 여부 |

### holidays (휴일 목록)
프로젝트 기간 동안의 휴일입니다.
| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 휴일 고유 ID |
| startDate | string | 휴일 시작일 |
| endDate | string | 휴일 종료일 (당일인 경우 startDate와 동일) |
| name | string | 휴일 이름 |

### plComments (PL 주간 코멘트)
각 PL이 주간 보고를 위해 남기는 코멘트입니다.
키 형식: `{projectId}_{파트명}` (예: "proj_123_개발")
값: 코멘트 문자열

### changelog (변경 이력)
시스템 내에서 발생한 변경 사항을 기록합니다.
| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 로그 고유 ID |
| timestamp | string | 변경 발생 일시 |
| user | string | 변경자 이름 |
| action | string | create / update / delete |
| targetType | string | 대상 타입 (task, risk, project 등) |
| targetId | string | 대상 ID |
| details | string | 변경 상세 내용 |

---

## 데이터 관계도

```
projects (1) ──→ (N) tasks
                    ├── assignee → workers.name
                    ├── parentId → tasks.id (상위)
                    └── dependencies → tasks.id (선행)

projects (1) ──→ (N) risks
                    └── projectId → projects.id

workers (N) ──→ (1) parts
                    └── task → parts.name

managers (1) ──→ (N) workers
                    └── workers[] (관리 대상 이름 목록)
```

---

## 검증 규칙

1. **작업 날짜**: task.endDate >= task.startDate
2. **진행률**: task.progress는 0 이상 100 이하
3. **의존성**: task.dependencies에 포함된 ID는 반드시 tasks에 존재
4. **parentId**: task.parentId가 존재하면 반드시 tasks에 존재
5. **assignee**: task.assignee는 workers.name과 일치해야 함
6. **리스크 category**: external, resource, technical, schedule 중 하나
7. **상수값**: status, priority, severity 등은 상수 정의를 따를 것

---

마지막 업데이트: 2026-07-21
