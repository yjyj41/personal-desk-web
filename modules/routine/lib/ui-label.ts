// Display labels only. The original stored enum values stay unchanged.
const labels:Record<string,string>={
 '월':'Mon','화':'Tue','수':'Wed','목':'Thu','금':'Fri','토':'Sat','일':'Sun',
 '아침':'Breakfast','점심':'Lunch','간식':'Snack','저녁':'Dinner','영양제':'Supplements',
 '걷기':'Walking','러닝':'Running','수영':'Swimming','자전거':'Cycling','준비·정리':'Warm-up / cool-down','휴식':'Rest','기타 유산소':'Other aerobic','근력':'Strength','근력운동':'Strength','유산소 운동':'Aerobic','근력 + 유산소':'Strength + aerobic',
 '가볍게 · 저강도':'Easy · low intensity','대화 가능 · 중강도':'Can talk · moderate','대화 어려움 · 고강도':'Hard to talk · vigorous','준비·정리·휴식 (집계 제외)':'Warm-up / rest · not counted',
 '미기록':'Not recorded','미시작':'Not started','마시지 않음':'No alcohol','마심':'Drank alcohol','수행':'Completed','쉬기':'Resting','불편으로 중단':'Stopped due to discomfort','전문가 상담 예정':'Planning a consultation','없음':'None','있음':'Yes','가능':'Able','어려움':'Difficult','해당 없음':'Not applicable','기억 안 남':'Cannot remember','충분히 유지':'Maintained sufficiently','원치 않게 중간에 약해짐':'Weakened earlier than wanted','파트너와':'With a partner','혼자':'Alone',
 '단백질 (g)':'Protein (g)','열량 (kcal)':'Calories (kcal)','채소·과일 (인분) · 감자 제외':'Fruit & vegetables (portions, excluding potatoes)','생선':'Fish','콩·두부·렌틸':'Beans, tofu, lentils','무염 견과류':'Unsalted nuts','통곡물':'Whole grains','중·고강도 유산소 (분)':'Moderate / vigorous activity (min)','40분 이상 세션 (회)':'Sessions of 40+ min','근력 (회)':'Strength sessions'
};
export const uiLabel=(value:string)=>labels[value]??value;
