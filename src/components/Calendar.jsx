import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users, Check, AlertCircle, CalendarDays, ShieldAlert, Zap } from 'lucide-react';
import { isRedDay, isBlueDay, isClubOperatingDay, getHolidayName } from '../utils/holidays';
import { dbService } from '../services/db';


export default function Calendar({ currentUser, attendanceList, onRefreshAttendance, onOpenLogin, currentDate, setCurrentDate, onOpenQuickCheck }) {
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [dayAttendees, setDayAttendees] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingAttId, setEditingAttId] = useState(null);
  const [moveDate, setMoveDate] = useState('');

  const isAdmin = currentUser && (currentUser.isAdmin || (currentUser.email && currentUser.email.toLowerCase() === 'admin@admin.com'));

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

  // 오늘 날짜 문자열 YYYY-MM-DD (로컬 시간 기준)
  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const todayStr = getTodayStr();

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

  // 날짜 클릭 이벤트 핸들러
  const handleDayClick = async (day) => {
    setErrorMsg('');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);

    // 0. 클럽 운영일 체크 (토요일, 일요일, 공휴일만 운영)
    if (!isClubOperatingDay(dateStr)) {
      setErrorMsg('우리 클럽은 토요일, 일요일, 공휴일에만 운영합니다. 평일에는 출석 체크가 불가능합니다. 🏸');
      return;
    }

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



  // 선택된 날짜의 참석자 리스트 필터링 (등록 시간 오름차순 정렬)
  useEffect(() => {
    if (selectedDateStr) {
      const attendees = attendanceList.filter((a) => a.attendance_date === selectedDateStr);
      attendees.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });
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
    if (!isClubOperatingDay(dateStr)) classes += ' weekday-closed';

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
            const isOperating = isClubOperatingDay(dateStr);

            return (
              <div
                key={day}
                className={getDayClassNames(day)}
                onClick={() => handleDayClick(day)}
                title={!isOperating ? '평일 (클럽 정기 운동 미운영일 - 토·일·공휴일만 운영)' : '클릭하여 출석 체크 / 취소'}
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
              <span className="day-detail-date" style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{selectedDateStr}</span>
                {getHolidayName(selectedDateStr) && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#dc2626',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 700
                  }}>
                    🌕 {getHolidayName(selectedDateStr)}
                  </span>
                )}
              </span>
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="badge badge-blue">
                <Users size={12} style={{ marginRight: '4px' }} />
                총 {dayAttendees.length}명 참여 예정
              </div>
              {onOpenQuickCheck && (
                <button
                  onClick={() => onOpenQuickCheck(selectedDateStr)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(245,158,11,0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  title="이 날짜로 빠른 출석 체크 모달 열기"
                >
                  <Zap size={12} />
                  빠른 출석
                </button>
              )}
            </div>
          </div>

          {!isClubOperatingDay(selectedDateStr) && (
            <div style={{
              margin: '12px 0 6px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldAlert size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span>본 날짜는 <strong>평일(미운영일)</strong>입니다. 우리 클럽은 <strong>토요일, 일요일, 공휴일</strong>에만 운영하므로 평일 출석은 체크할 수 없습니다. 🏸</span>
            </div>
          )}

          <div className="day-attendees-title">참여자 명단</div>
          
          {dayAttendees.length > 0 ? (
            <div className="day-attendees-list" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
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
