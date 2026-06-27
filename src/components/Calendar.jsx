import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users, Check, AlertCircle, CalendarDays } from 'lucide-react';
// 대한민국 공휴일 데이터셋 및 제헌절(7월 17일) 지정 상수
const FIXED_HOLIDAYS = new Set([
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

const HOLIDAYS_SET = new Set([
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

import { dbService } from '../services/db';


export default function Calendar({ currentUser, attendanceList, onRefreshAttendance, onOpenLogin, currentDate, setCurrentDate }) {
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [dayAttendees, setDayAttendees] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [editingAttId, setEditingAttId] = useState(null);
  const [moveDate, setMoveDate] = useState('');
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');

  const isAdmin = currentUser && (currentUser.isAdmin || currentUser.email === 'admin@admin.com');

  // 하루 전 날짜로 이동 (UTC 시간대 오차 방지 파싱)
  const handlePrevDay = () => {
    setErrorMsg('');
    if (!selectedDateStr) return;
    const parts = selectedDateStr.split('-');
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    date.setDate(date.getDate() - 1);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const prevStr = `${yyyy}-${mm}-${dd}`;
    
    setSelectedDateStr(prevStr);
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  // 하루 다음 날짜로 이동 (UTC 시간대 오차 방지 파싱)
  const handleNextDay = () => {
    setErrorMsg('');
    if (!selectedDateStr) return;
    const parts = selectedDateStr.split('-');
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    date.setDate(date.getDate() + 1);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const nextStr = `${yyyy}-${mm}-${dd}`;
    
    setSelectedDateStr(nextStr);
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
  };

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
    const parts = dateStr.split('-');
    const yearNum = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10);
    const dayNum = parseInt(parts[2], 10);
    const date = new Date(yearNum, monthNum - 1, dayNum);
    
    // 1. 일요일 체크
    if (date.getDay() === 0) return true;

    // 2. 매년 고정 법정공휴일 및 제헌절(7월 17일) 체크
    const mmDd = `${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    if (FIXED_HOLIDAYS.has(mmDd)) return true;

    // 3. 연도별 대체공휴일 및 음력 변동 공휴일 체크
    if (HOLIDAYS_SET.has(dateStr)) return true;

    return false;
  };

  // 토요일 여부 체크 (파란색 표시용)
  const isBlueDay = (dateStr) => {
    const parts = dateStr.split('-');
    const yearNum = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10);
    const dayNum = parseInt(parts[2], 10);
    const date = new Date(yearNum, monthNum - 1, dayNum);
    return date.getDay() === 6; // 토요일
  };

  // 관리자일 경우 전체 회원 목록 로드
  useEffect(() => {
    const fetchUsers = async () => {
      if (isAdmin) {
        try {
          const users = await dbService.getAllUsers();
          setAllUsers(users);
        } catch (err) {
          console.error('회원 목록 조회 실패:', err);
        }
      }
    };
    fetchUsers();
  }, [currentUser, isAdmin, attendanceList]);

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

    // 2. 과거 날짜 수정 불가 정책 적용 (최고 관리자는 예외)
    const parts = dateStr.split('-');
    const targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    
    const todayParts = todayStr.split('-');
    const todayDate = new Date(parseInt(todayParts[0], 10), parseInt(todayParts[1], 10) - 1, parseInt(todayParts[2], 10));

    if (targetDate < todayDate && !isAdmin) {
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

  // 관리자용: 출석 취소 처리
  const handleDeleteAttendee = async (attendanceRecord) => {
    if (confirm(`${attendanceRecord.user_name} 회원의 ${selectedDateStr} 출석을 취소하시겠습니까?`)) {
      try {
        await dbService.toggleAttendance(
          selectedDateStr, 
          false, 
          { id: attendanceRecord.user_id, name: attendanceRecord.user_name }
        );
        onRefreshAttendance();
      } catch (err) {
        setErrorMsg('출석 취소에 실패했습니다.');
        console.error(err);
      }
    }
  };

  // 관리자용: 출석 날짜 변경(이동) 처리
  const handleMoveAttendance = async (attId, newDate) => {
    if (!newDate) return;
    try {
      await dbService.changeAttendanceDate(attId, newDate);
      setEditingAttId(null);
      
      // 날짜 이동 후 해당 날짜로 포커스를 맞춤
      setSelectedDateStr(newDate);
      
      // 연도/월이 달라질 경우 달력 현재 날짜도 변경
      const parts = newDate.split('-');
      setCurrentDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
      
      onRefreshAttendance();
    } catch (err) {
      setErrorMsg('출석 날짜 변경에 실패했습니다.');
      console.error(err);
    }
  };

  // 관리자용: 출석 강제 추가 처리
  const handleAddAttendee = async (e) => {
    e.preventDefault();
    if (!selectedUserToAdd) return;
    const targetUser = allUsers.find(u => u.id === selectedUserToAdd);
    if (!targetUser) return;

    try {
      await dbService.toggleAttendance(selectedDateStr, true, targetUser);
      setSelectedUserToAdd('');
      onRefreshAttendance();
    } catch (err) {
      setErrorMsg('출석 추가에 실패했습니다.');
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
    const parts = dateStr.split('-');
    const targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const todayParts = todayStr.split('-');
    const todayDate = new Date(parseInt(todayParts[0], 10), parseInt(todayParts[1], 10) - 1, parseInt(todayParts[2], 10));

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={handlePrevDay} 
                className="calendar-nav-btn" 
                style={{ width: '28px', height: '28px', borderRadius: '8px', padding: 0 }}
                title="이전 날짜"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="day-detail-date" style={{ fontWeight: 800, fontSize: '1rem' }}>{selectedDateStr}</span>
              <button 
                onClick={handleNextDay} 
                className="calendar-nav-btn" 
                style={{ width: '28px', height: '28px', borderRadius: '8px', padding: 0 }}
                title="다음 날짜"
              >
                <ChevronRight size={14} />
              </button>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>출석 현황</span>
            </div>
            
            <div className="badge badge-blue">
              <Users size={12} style={{ marginRight: '4px' }} />
              총 {dayAttendees.length}명 참여 예정
            </div>
          </div>

          <div className="day-attendees-title">참여자 명단</div>
          
          {dayAttendees.length > 0 ? (
            <div className="day-attendees-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
              {dayAttendees.map((a) => {
                const isEditing = editingAttId === a.id;
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div className="attendee-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="attendee-dot-active"></span>
                      <span style={{ fontWeight: 600 }}>{a.user_name}</span>
                      
                      {isAdmin && !isEditing && (
                        <div style={{ display: 'flex', gap: '6px', marginLeft: '6px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '6px' }}>
                          <button 
                            onClick={() => {
                              setEditingAttId(a.id);
                              setMoveDate(selectedDateStr);
                            }}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '0.85rem' }}
                            title="날짜 수정(이동)"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteAttendee(a)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '0.85rem' }}
                            title="출석 취소"
                          >
                            ❌
                          </button>
                        </div>
                      )}
                    </div>

                    {isAdmin && isEditing && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        padding: '4px 8px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--glass-border)' 
                      }}>
                        <input 
                          type="date" 
                          value={moveDate}
                          onChange={(e) => setMoveDate(e.target.value)}
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: 'white',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            fontSize: '0.8rem'
                          }}
                        />
                        <button 
                          onClick={() => handleMoveAttendance(a.id, moveDate)}
                          className="badge badge-neon"
                          style={{ border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 6px' }}
                        >
                          이동
                        </button>
                        <button 
                          onClick={() => setEditingAttId(null)}
                          className="badge"
                          style={{ border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 6px', background: '#6b7280' }}
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-attendees">아직 신청자가 없습니다. 제일 먼저 신청해 보세요! 🏸</div>
          )}

          {/* 최고 관리자 전용: 출석 수동 추가 폼 */}
          {isAdmin && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-neon)', marginBottom: '8px' }}>
                🛠️ 최고 관리자 전용: 출석 인원 추가
              </div>
              <form onSubmit={handleAddAttendee} style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={selectedUserToAdd}
                  onChange={(e) => setSelectedUserToAdd(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="">-- 추가할 회원 선택 --</option>
                  {allUsers
                    .filter(u => !dayAttendees.some(att => att.user_id === u.id))
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email || '이메일 없음'})
                      </option>
                    ))
                  }
                </select>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '0.85rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  disabled={!selectedUserToAdd}
                >
                  추가
                </button>
              </form>
            </div>
          )}

          {/* 조작 설명 문구 (가독성 배너화) */}
          <div className="day-detail-guide">
            <span>
              💡 <strong>오늘 또는 미래 날짜</strong>의 달력 칸을 클릭하면 출석 참여/취소를 간편하게 토글할 수 있습니다.
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              {isAdmin 
                ? '(최고 관리자 권한 활성화됨: 과거 날짜 조작 및 타인 출석 관리가 가능합니다.)' 
                : '(과거 날짜는 출석 조작이 비활성화됩니다.)'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
