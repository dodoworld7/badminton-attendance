// 대한민국 공휴일 데이터셋 및 제헌절(7월 17일) 지정 상수
export const FIXED_HOLIDAYS = new Set([
  '01-01', // 신정
  '03-01', // 삼일절
  '05-05', // 어린이날
  '06-06', // 현충일
  '07-17', // 제헌절
  '08-15', // 광복절
  '10-03', // 개천절
  '10-09', // 한글날
  '12-25'  // 성탄절
]);

export const HOLIDAYS_SET = new Set([
  // 2025년 대체/음력 공휴일
  '2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30',
  '2025-03-03', '2025-05-06', '2025-06-03', '2025-10-05',
  '2025-10-06', '2025-10-07', '2025-10-08',

  // 2026년 대체/음력 공휴일
  '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-02',
  '2026-05-24', '2026-05-25', '2026-06-03', '2026-08-17',
  '2026-09-24', '2026-09-25', '2026-09-26', '2026-10-05',

  // 2027년 대체/음력 공휴일
  '2027-02-05', '2027-02-06', '2027-02-07', '2027-02-09',
  '2027-05-13', '2027-05-14', '2027-08-16', '2027-09-14',
  '2027-09-15', '2027-09-16', '2027-10-04', '2027-10-11'
]);

// 공휴일 명칭 매핑
export const HOLIDAY_NAMES = {
  // 고정 공휴일 (MM-DD)
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '07-17': '제헌절',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절',

  // 2025년
  '2025-01-27': '설날 연휴', '2025-01-28': '설날', '2025-01-29': '설날 연휴', '2025-01-30': '대체공휴일',
  '2025-03-03': '대체공휴일', '2025-05-06': '대체공휴일', '2025-06-03': '부처님오신날',
  '2025-10-05': '추석 연휴', '2025-10-06': '추석', '2025-10-07': '추석 연휴', '2025-10-08': '대체공휴일',

  // 2026년
  '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴', '2026-03-02': '대체공휴일',
  '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일', '2026-06-03': '대체공휴일', '2026-08-17': '대체공휴일',
  '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴', '2026-10-05': '대체공휴일',

  // 2027년
  '2027-02-05': '설날 연휴', '2027-02-06': '설날', '2027-02-07': '설날 연휴', '2027-02-09': '대체공휴일',
  '2027-05-13': '부처님오신날', '2027-05-14': '대체공휴일', '2027-08-16': '대체공휴일',
  '2027-09-14': '추석 연휴', '2027-09-15': '추석', '2027-09-16': '추석 연휴',
  '2027-10-04': '대체공휴일', '2027-10-11': '대체공휴일'
};

// 공휴일 여부 확인 (일요일 제외한 순수 공휴일)
export const isHoliday = (dateStr) => {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  const mmDd = `${parts[1]}-${parts[2]}`;
  return FIXED_HOLIDAYS.has(mmDd) || HOLIDAYS_SET.has(dateStr);
};

// 공휴일 이름 반환 (예: '추석', '추석 연휴', '어린이날')
export const getHolidayName = (dateStr) => {
  if (!dateStr) return null;
  if (HOLIDAY_NAMES[dateStr]) return HOLIDAY_NAMES[dateStr];
  const parts = dateStr.split('-');
  const mmDd = `${parts[1]}-${parts[2]}`;
  if (HOLIDAY_NAMES[mmDd]) return HOLIDAY_NAMES[mmDd];
  return null;
};

// 일요일 또는 공휴일 판정 (빨간 날)
export const isRedDay = (dateStr) => {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  const yearNum = parseInt(parts[0], 10);
  const monthNum = parseInt(parts[1], 10);
  const dayNum = parseInt(parts[2], 10);
  const date = new Date(yearNum, monthNum - 1, dayNum);
  
  // 1. 일요일
  if (date.getDay() === 0) return true;

  // 2. 고정 법정공휴일 또는 대체공휴일
  return isHoliday(dateStr);
};

// 토요일 판정 (파란 날)
export const isBlueDay = (dateStr) => {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  const yearNum = parseInt(parts[0], 10);
  const monthNum = parseInt(parts[1], 10);
  const dayNum = parseInt(parts[2], 10);
  const date = new Date(yearNum, monthNum - 1, dayNum);
  return date.getDay() === 6;
};

// 클럽 정기 운영일 여부 (토요일, 일요일, 공휴일만 운영)
export const isClubOperatingDay = (dateStr) => {
  return isBlueDay(dateStr) || isRedDay(dateStr);
};
