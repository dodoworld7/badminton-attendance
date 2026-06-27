import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users, Check, AlertCircle, CalendarDays } from 'lucide-react';
import { dbService } from '../services/db';

// 2026년 기준 대한민국 주요 공휴일 목록 (MM-DD 형식) - 달력 내 빨간색 표시용
const HOLIDAYS_2026 = [
  '01-01', // 신정
  '02-16', '02-17', '02-18', // 설날 연휴
  '03-01', // 삼일절
  '03-02', // 대체공휴일 (삼일절)
  '05-05', // 어린이날 / 석가탄신일
  '05-06', // 대체공휴일
  '06-06', // 현충일
  '08-15', // 광복절
  '08-17', // 대체공휴일 (광복절)
  '09-24', '09-25', '09-26', // 추석 연휴
  '10-03', // 개천절
  '10-05', // 대체공휴일 (개천절)
  '10-09', // 한글날
  '12-25', // 성탄절
];

export default function Calendar({ currentUser, attendanceList, onRefreshAttendance, onOpenLogin }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [dayAttendees, setDayAttendees] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed

  // 오늘 날짜 문자열 YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // 달력 연/월 이동
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  // 특정 월의 첫째 날의 요일과 총 일수 구하기
  const firstDayIndex = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();

  // 이전 달의 공백 생성
  const blankDays = Array(firstDayIndex).fill(null);
  // 현재 달의 날짜 배열 생성 (1 ~ totalDays)
  const daysInMonth = Array.from({ length: totalDays }, (_, i) => i + 1);

  // 일요일/공휴일 여부 체크 (빨간색 표시용)
  const isRedDay = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    if (date.getDay() === 0) return true; // 일요일

    const mmDd = dateStr.substring(5); // MM-DD
    return HOLIDAYS_2026.includes(mmDd);
  };

  // 토요일 여부 체크 (파란색 표시용)
  const isBlueDay = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.getDay() === 6; // 토요일
  };

  // 날짜 클릭 이벤트 핸들러
  const handleDayClick = async (day) => {
    setErrorMsg('');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);

    // 1. 로그인 확인
    if (!currentUser) {
      setErrorMsg('출석 체크를 하시려면 먼저 로그인해 주셔야 합니다! 🏸');
      onOpenLogin();
      return;
    }

    // 2. 과거 날짜 수정 불가 정책 적용
    const targetDate = new Date(dateStr + 'T00:00:00');
    const todayDate = new Date(todayStr + 'T00:00:00');

    if (targetDate < todayDate) {
      setErrorMsg('과거 날짜의 출석은 수정(참여/취소)할 수 없습니다. 🚫');
      return;
    }

    // 현재 유저의 해당 날짜 출석 여부 확인
    const isAlreadyAttending = attendanceList.some(
      (a) => a.attendance_date === dateStr && a.user_id === currentUser.id
    );

    try {
      // 출석 토글 (참여 -> 취소 / 미참여 -> 참여)
      await dbService.toggleAttendance(dateStr, !isAlreadyAttending, currentUser);
      onRefreshAttendance();
    } catch (err) {
      setErrorMsg('출석 상태를 변경하는 도중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  // 선택된 날짜의 참석자 리스트 필터링
  useEffect(() => {
    if (selectedDateStr) {
      const attendees = attendanceList.filter((a) => a.attendance_date === selectedDateStr);
      setDayAttendees(attendees);
    } else {
      setSelectedDateStr(todayStr);
    }
  }, [selectedDateStr, attendanceList, todayStr]);

  // 해당 날짜에 출석 체크한 사람들 목록 구하기 (달력 셀 렌더링용)
  const getAttendeesForDay = (day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendanceList.filter((a) => a.attendance_date === dateStr);
  };

  // 날짜 정보 헬퍼 (클래스네임 바인딩)
  const getDayClassNames = (day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const targetDate = new Date(dateStr + 'T00:00:00');
    const todayDate = new Date(todayStr + 'T00:00:00');

    let classes = 'calendar-day-cell';
    
    if (dateStr === todayStr) classes += ' today';
    if (targetDate < todayDate) classes += ' past';
    if (dateStr === selectedDateStr) classes += ' selected';

    return classes;
  };

  // 요일 텍스트 컬러 지정용 style 헬퍼
  const getDayNumberStyle = (day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (isRedDay(dateStr)) {
      return { color: '#ef4444' }; // 빨간색 (일요일, 공휴일)
    }
    if (isBlueDay(dateStr)) {
      return { color: '#3b82f6' }; // 파란색 (토요일)
    }
    return {};
  };

  return (
    <div className="glass-panel active-glow">
      <h2 className="section-title">
        <CalendarDays size={20} />
        출석 달력
      </h2>

      {errorMsg && (
        <div className="auth-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="calendar-widget">
        {/* 달력 헤더 */}
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </button>
          <div className="calendar-current-month">
            {year}년 {month}월
          </div>
          <button className="calendar-nav-btn" onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 달력 요일 표시 */}
        <div className="calendar-grid">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, index) => {
            let color = 'var(--text-secondary)';
            if (index === 0) color = '#ef4444'; // 일요일
            if (index === 6) color = '#3b82f6'; // 토요일
            return (
              <div key={d} className="calendar-weekday" style={{ color }}>
                {d}
              </div>
            );
          })}

          {/* 이전 달 빈 칸 */}
          {blankDays.map((_, i) => (
            <div key={`blank-${i}`} className="calendar-day-cell empty"></div>
          ))}

          {/* 이번 달 날짜 */}
          {daysInMonth.map((day) => {
            const dayAttendeesList = getAttendeesForDay(day);
            const userIsAttending = currentUser && dayAttendeesList.some((a) => a.user_id === currentUser.id);
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            return (
              <div
                key={day}
                className={getDayClassNames(day)}
                onClick={() => handleDayClick(day)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span className="calendar-day-number" style={getDayNumberStyle(day)}>
                    {day}
                  </span>
                  {userIsAttending && (
                    <span className="badge badge-neon" style={{ padding: '2px 4px', fontSize: '0.65rem' }}>
                      참여
                    </span>
                  )}
                </div>

                <div className="calendar-attendance-dots">
                  {dayAttendeesList.slice(0, 3).map((a, i) => (
                    <span key={i} className="attendance-dot" title={a.user_name}></span>
                  ))}
                  {dayAttendeesList.length > 3 && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-neon)', fontWeight: 'bold' }}>
                      +{dayAttendeesList.length - 3}
                    </span>
                  )}
                </div>

                {dayAttendeesList.length > 0 && (
                  <span className="calendar-attendance-count">
                    {dayAttendeesList.length}명
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 날짜 클릭 시 상세 패널 */}
      {selectedDateStr && (
        <div className="day-detail-panel">
          <div className="day-detail-header">
            <span className="day-detail-date">{selectedDateStr} 출석 현황</span>
            <div className="badge badge-blue">
              <Users size={12} style={{ marginRight: '4px' }} />
              총 {dayAttendees.length}명 참여 예정
            </div>
          </div>

          <div className="day-attendees-title">참여자 명단</div>
          
          {dayAttendees.length > 0 ? (
            <div className="day-attendees-list">
              {dayAttendees.map((a) => (
                <div key={a.id} className="attendee-badge">
                  <span className="attendee-dot-active"></span>
                  <span>{a.user_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-attendees">아직 신청자가 없습니다. 제일 먼저 신청해 보세요! 🏸</div>
          )}

          {/* 조작 설명 문구 */}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            💡 <strong>오늘 또는 미래 날짜</strong>의 달력 칸을 클릭하면 출석 참여/취소를 간편하게 토글할 수 있습니다.
            <br />
            (과거 날짜는 출석 조작이 비활성화됩니다.)
          </p>
        </div>
      )}
    </div>
  );
}
