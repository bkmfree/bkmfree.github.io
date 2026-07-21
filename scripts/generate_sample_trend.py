import json
from pathlib import Path

path = Path('D:/proj/claude/data/project_data.json')
data = json.loads(path.read_text(encoding='utf-8'))
project_id = data['projects'][0]['id']

base_dates = {
    '2026-06-21': '2026-06-21',
    '2026-06-28': '2026-06-28',
}
base = '2026-07-21'

def date(offset_days):
    from datetime import datetime, timedelta
    d = datetime.strptime('2026-07-21', '%Y-%m-%d') + timedelta(days=offset_days)
    return d.strftime('%Y-%m-%d')

tasks = [
    # Week 1: Jun 23 ~ Jul 5 (기준: 해당 주 종료일 기준 완료 3)
    {'id':'w1_t1','projectId':project_id,'title':'요구사항 분석 및 기획','wbsCode':'1.0','status':'done','priority':'high','progress':100,'startDate':'2026-06-21','endDate':'2026-07-03','assignee':'김기획','part':'기획','isMilestone':True,'dependencies':[],'createdAt':base},
    {'id':'w1_t2','projectId':project_id,'title':'기획서 초안 작성','wbsCode':'1.1','status':'done','priority':'high','progress':100,'startDate':'2026-06-25','endDate':'2026-07-05','assignee':'김기획','part':'기획','isMilestone':False,'dependencies':['w1_t1'],'createdAt':base},
    {'id':'w1_t3','projectId':project_id,'title':'UI 리서치','wbsCode':'2.0','status':'done','priority':'medium','progress':100,'startDate':'2026-06-26','endDate':'2026-07-04','assignee':'이디자인','part':'디자인','isMilestone':False,'dependencies':[],'createdAt':base},
    
    # Week 2: Jul 6 ~ Jul 12 (완료 5)
    {'id':'w2_t1','projectId':project_id,'title':'와이어프레임','wbsCode':'2.1','status':'done','priority':'medium','progress':100,'startDate':'2026-07-06','endDate':'2026-07-10','assignee':'이디자인','part':'디자인','isMilestone':False,'dependencies':['w1_t3'],'createdAt':base},
    {'id':'w2_t2','projectId':project_id,'title':'API 명세 검증','wbsCode':'4.0','status':'done','priority':'high','progress':100,'startDate':'2026-07-07','endDate':'2026-07-12','assignee':'정개발','part':'개발','isMilestone':False,'dependencies':['w1_t1'],'createdAt':base},
    {'id':'w2_t3','projectId':project_id,'title':'개발 환경 구축','wbsCode':'4.1','status':'done','priority':'high','progress':100,'startDate':'2026-07-08','endDate':'2026-07-11','assignee':'정개발','part':'개발','isMilestone':False,'dependencies':['w2_t2'],'createdAt':base},
    {'id':'w2_t4','projectId':project_id,'title':'기획서 확정','wbsCode':'1.2','status':'done','priority':'high','progress':100,'startDate':'2026-07-09','endDate':'2026-07-09','assignee':'김기획','part':'기획','isMilestone':True,'dependencies':['w1_t2'],'createdAt':base},
    {'id':'w2_t5','projectId':project_id,'title':'퍼블 가이드','wbsCode':'3.0','status':'done','priority':'medium','progress':100,'startDate':'2026-07-10','endDate':'2026-07-12','assignee':'박퍼블','part':'퍼블리셔','isMilestone':False,'dependencies':['w2_t1'],'createdAt':base},
    
    # Week 3: Jul 13 ~ Jul 19 (완료 7)
    {'id':'w3_t1','projectId':project_id,'title':'UI 디자인 확정','wbsCode':'2.2','status':'done','priority':'high','progress':100,'startDate':'2026-07-13','endDate':'2026-07-15','assignee':'이디자인','part':'디자인','isMilestone':True,'dependencies':['w2_t1'],'createdAt':base},
    {'id':'w3_t2','projectId':project_id,'title':'화면 설계서','wbsCode':'1.3','status':'done','priority':'medium','progress':100,'startDate':'2026-07-14','endDate':'2026-07-16','assignee':'김기획','part':'기획','isMilestone':False,'dependencies':['w2_t4'],'createdAt':base},
    {'id':'w3_t3','projectId':project_id,'title':'프론트엔드 스캐폴딩','wbsCode':'4.2','status':'done','priority':'high','progress':100,'startDate':'2026-07-14','endDate':'2026-07-17','assignee':'최개발','part':'개발','isMilestone':False,'dependencies':['w2_t3'],'createdAt':base},
    {'id':'w3_t4','projectId':project_id,'title':'ERD 설계','wbsCode':'4.3','status':'done','priority':'medium','progress':100,'startDate':'2026-07-15','endDate':'2026-07-18','assignee':'정개발','part':'개발','isMilestone':False,'dependencies':['w3_t3'],'createdAt':base},
    {'id':'w3_t5','projectId':project_id,'title':'메인 퍼블리싱','wbsCode':'3.1','status':'done','priority':'medium','progress':100,'startDate':'2026-07-15','endDate':'2026-07-19','assignee':'박퍼블','part':'퍼블리셔','isMilestone':False,'dependencies':['w3_t1'],'createdAt':base},
    {'id':'w3_t6','projectId':project_id,'title':'QA 시나리오','wbsCode':'5.0','status':'done','priority':'medium','progress':100,'startDate':'2026-07-16','endDate':'2026-07-19','assignee':'강테스트','part':'TA','isMilestone':False,'dependencies':['w2_t5'],'createdAt':base},
    {'id':'w3_t7','projectId':project_id,'title':'1차 빌드','wbsCode':'4.4','status':'done','priority':'high','progress':100,'startDate':'2026-07-17','endDate':'2026-07-17','assignee':'정개발','part':'개발','isMilestone':True,'dependencies':['w3_t4'],'createdAt':base},
    
    # Week 4: Jul 21 ~ Jul 27 (현재 주 -> 완료 2, 진행중 포함)
    {'id':'w4_t1','projectId':project_id,'title':'1차 API 연동','wbsCode':'4.5','status':'inprogress','priority':'high','progress':80,'startDate':'2026-07-21','endDate':'2026-07-26','assignee':'정개발','part':'개발','isMilestone':False,'dependencies':['w3_t7'],'createdAt':base},
    {'id':'w4_t2','projectId':project_id,'title':'QA 테스트','wbsCode':'5.1','status':'inprogress','priority':'high','progress':70,'startDate':'2026-07-22','endDate':'2026-07-28','assignee':'강테스트','part':'TA','isMilestone':False,'dependencies':['w3_t6'],'createdAt':base},
    {'id':'w4_t3','projectId':project_id,'title':'버그 수정','wbsCode':'4.6','status':'todo','priority':'medium','progress':0,'startDate':'2026-07-24','endDate':'2026-07-30','assignee':'최개발','part':'개발','isMilestone':False,'dependencies':['w4_t2'],'createdAt':base},
    {'id':'w4_t4','projectId':project_id,'title':'성능 개선','wbsCode':'4.7','status':'todo','priority':'medium','progress':0,'startDate':'2026-07-23','endDate':'2026-07-29','assignee':'최개발','part':'개발','isMilestone':False,'dependencies':['w4_t3'],'createdAt':base},
    {'id':'w4_t5','projectId':project_id,'title':'UAT 준비','wbsCode':'7.0','status':'todo','priority':'high','progress':0,'startDate':'2026-07-25','endDate':'2026-07-31','assignee':'홍PL','part':'AA','isMilestone':False,'dependencies':['w4_t4'],'createdAt':base},
    {'id':'w4_t6','projectId':project_id,'title':'오픈 준비 점검','wbsCode':'0.1','status':'todo','priority':'high','progress':0,'startDate':'2026-07-28','endDate':'2026-07-30','assignee':'홍PL','part':'AA','isMilestone':True,'dependencies':['w4_t5'],'createdAt':base},
]

data['tasks'] = tasks
path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'주간 추세 샘플 task 생성 완료: {len(tasks)}개')
