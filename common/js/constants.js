/* =================================================================
   constants.js - 프로젝트 상수 정의
   [업무: 상태/우선순위/리스크 상태·심각도 등 전역 상수 관리]
   ================================================================= */

// 작업 상태 상수
const TASK_STATUS = {
    TODO: 'todo',
    INPROGRESS: 'inprogress',
    REVIEW: 'review',
    DONE: 'done',
    CANCEL: 'cancel',
};

// 작업 우선순위 상수
const PRIORITY = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
};

// 리스크 상태 상수
const RISK_STATUS = {
    OPEN: 'open',
    MITIGATING: 'mitigating',
    MITIGATED: 'mitigated',
    ESCALATED: 'escalated',
};

// 리스크 심각도 상수
const RISK_SEVERITY = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
};
