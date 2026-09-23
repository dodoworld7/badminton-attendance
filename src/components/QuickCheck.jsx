import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, Zap, CheckCircle2, Circle, Users, RefreshCw, Search, 
  ShieldAlert, Shield, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Sparkles, RotateCcw
} from 'lucide-react';
import { dbService } from '../services/db';
import { isClubOperatingDay, isRedDay, isBlueDay, getHolidayName, isHoliday } from '../utils/holidays';

// 오늘 날짜 YYYY-MM-DD 반환
const getTodayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// 날짜를 한국어 형식으로 표시 (예: 2026년 9월 25일 (금) · 추석)
const formatKoreanDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const holidayName = getHolidayName(dateStr);
  const base = `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일 (${weekdays[d.getDay()]})`;
  return holidayName ? `${base} · ${holidayName}` : base;
};

// 특정 날짜가 속한 주의 월요일부터 일요일까지 7일간의 날짜 목록 계산
const getWeekDaysForDate = (dateStr, todayStr) => {
  if (!dateStr) return [];
  const parts = dateStr.split('-');
  const baseDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  
  // 한국 주간 기준: 월요일(1) 시작 ~ 일요일(0) 끝
  const day = baseDate.getDay();
  // 월요일과의 차이 (월:0, 화:-1, ..., 토:-5, 일:-6)
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMonday);

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekList = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dStr = `${yyyy}-${mm}-${dd}`;
    const dayOfWeek = weekdays[d.getDay()];

    const isOp = isClubOperatingDay(dStr);
    const holidayName = getHolidayName(dStr);
    const isSat = d.getDay() === 6;
    const isSun = d.getDay() === 0;

    weekList.push({
      dateStr: dStr,
      year: yyyy,
      month: parseInt(mm, 10),
      day: parseInt(dd, 10),
      dayOfWeek,
      isOperating: isOp, // 토, 일, 공휴일 (출석 가능)
      holidayName,
      isSat,
      isSun,
      isToday: dStr === todayStr,
      isSelected: dStr === dateStr
    });
  }

  return weekList;
};

// 오늘이 평일(미운영일)인 경우, 빠른 출석 체크 모달을 열었을 때 바로 카드를 누를 수 있도록
// 이번 주의 클럽 운영일(토·일·공휴일) 중 가장 가까운 날짜를 기본값으로 선택해 줍니다.
const getDefaultOperatingDate = (todayStr) => {
  if (isClubOperatingDay(todayStr)) return todayStr;
  const week = getWeekDaysForDate(todayStr, todayStr);
  const operatingDay = week.find((d) => d.isOperating);
  return operatingDay ? operatingDay.dateStr : todayStr;
};

export default function QuickCheck({ 
  isOpen, 
  onClose, 
  onRefreshAttendance, 
  attendanceList,
  initialDateStr 
}) {
  const todayStr = getTodayStr();
  const defaultDate = initialDateStr || getDefaultOperatingDate(todayStr);
  const [selectedDateStr, setSelectedDateStr] = useState(defaultDate);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(null); // 처리 중인 userId
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 현재 선택된 날짜가 속한 주의 7일간 날짜들 (상단 날짜가 바뀌면 자동으로 그 주의 날짜들로 갱신)
  const currentWeekDays = useMemo(() => {
    return getWeekDaysForDate(selectedDateStr, todayStr);
  }, [selectedDateStr, todayStr]);

  // 모달이 열릴 때 초기 날짜 설정
  useEffect(() => {
    if (isOpen) {
      if (initialDateStr) {
        setSelectedDateStr(initialDateStr);
      } else {
        setSelectedDateStr(getDefaultOperatingDate(todayStr));
      }
      setSearchTerm('');
      setErrorMsg('');
    }
  }, [isOpen, initialDateStr, todayStr]);

  // 선택된 날짜의 클럽 운영 여부 (토, 일, 공휴일)
  const isOperating = isClubOperatingDay(selectedDateStr);
  const holidayName = getHolidayName(selectedDateStr);

  // 선택된 날짜에 출석한 user_id 목록
  const attendedIds = useMemo(() => {
    return new Set(
      attendanceList
        .filter((a) => a.attendance_date === selectedDateStr)
        .map((a) => a.user_id)
    );
  }, [attendanceList, selectedDateStr]);

  // 전체 회원 목록 불러오기
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const allUsers = await dbService.getAllUsers();
      // 이름 가나다 순 정렬
      const sorted = [...allUsers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
      setUsers(sorted);
    } catch (err) {
      console.error('회원 목록 로드 실패:', err);
      setErrorMsg('회원 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen, loadUsers]);

  // 날짜 하루 전/다음 날 이동
  const handleDateChangeBy = (offsetDays) => {
    if (!selectedDateStr) return;
    const parts = selectedDateStr.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + offsetDays);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDateStr(`${yyyy}-${mm}-${dd}`);
    setErrorMsg('');
  };

  // 회원 카드 클릭 → 출석 토글
  const handleToggle = async (user) => {
    if (toggling) return; // 처리 중 중복 방지

    // 클럽 운영일 체크 (토, 일, 공휴일만 운영)
    if (!isOperating) {
      setErrorMsg(`선택하신 날짜(${formatKoreanDate(selectedDateStr)})는 평일(미운영일)입니다. 클럽은 토·일·공휴일에만 출석 체크가 가능합니다. 🏸`);
      return;
    }

    setToggling(user.id);
    setErrorMsg('');
    try {
      const isAttending = attendedIds.has(user.id);
      await dbService.toggleAttendance(selectedDateStr, !isAttending, user);
      await onRefreshAttendance();
    } catch (err) {
      console.error('출석 토글 실패:', err);
      const isPermission = err.code === 'permission-denied' || (err.message && err.message.includes('permission'));
      if (isPermission) {
        setErrorMsg(`⚠️ Firebase Firestore 보안 규칙 권한 오류: 비로그인 쓰기 권한이 Firebase 콘솔에서 아직 허용되지 않았습니다. (규칙 업데이트 필요)`);
      } else {
        setErrorMsg(`${user.name}님 출석 처리 중 오류: ${err.message || '네트워크 오류가 발생했습니다.'}`);
      }
    } finally {
      setToggling(null);
    }
  };

  if (!isOpen) return null;

  const attendedCount = attendedIds.size;

  // 검색어 필터링
  const filteredUsers = users.filter((u) => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 날짜 텍스트 컬러 (빨간날/파란날)
  const isRed = isRedDay(selectedDateStr);
  const isBlue = isBlueDay(selectedDateStr);
  const dateColor = isRed ? '#ef4444' : isBlue ? '#2563eb' : 'var(--text-primary, #1e293b)';

  return (
    // 모달 오버레이
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--glass-bg, #ffffff)',
          border: '1px solid var(--glass-border, rgba(0,0,0,0.1))',
          borderRadius: '24px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2), 0 0 0 1px rgba(245,158,11,0.2)',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.25s ease'
        }}
      >
        {/* 모달 상단 헤더 */}
        <div style={{
          padding: '16px 22px 12px',
          borderBottom: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(59,130,246,0.06) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: '#f59e0b',
              color: '#ffffff',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(245,158,11,0.4)'
            }}>
              <Zap size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)' }}>
                빠른 출석 체크
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #64748b)' }}>
                토·일·공휴일만 출석 체크가 가능합니다. (로그인 불필요)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={loadUsers}
              title="회원 목록 새로고침"
              disabled={loading}
              style={{
                background: 'rgba(0,0,0,0.05)',
                border: '1px solid var(--glass-border, rgba(0,0,0,0.1))',
                borderRadius: '10px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary, #64748b)'
              }}
            >
              <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(0,0,0,0.05)',
                border: '1px solid var(--glass-border, rgba(0,0,0,0.1))',
                borderRadius: '10px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary, #64748b)',
                flexShrink: 0
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 📅 날짜 선택 컨트롤 패널 */}
        <div style={{
          padding: '12px 18px',
          background: 'rgba(248, 250, 252, 0.95)',
          borderBottom: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* 1행: 날짜 네비게이션 & 직접 선택 인풋 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <button
              onClick={() => handleDateChangeBy(-1)}
              title="하루 전 날짜로 이동"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1px solid var(--glass-border, rgba(0,0,0,0.12))',
                background: '#ffffff',
                cursor: 'pointer',
                color: 'var(--text-primary, #334155)',
                fontSize: '0.82rem',
                fontWeight: 600,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <ChevronLeft size={16} />
              <span>이전</span>
            </button>

            {/* 가운데 날짜 표시 + 달력 인풋 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              padding: '6px 14px',
              borderRadius: '12px',
              border: '1px solid var(--glass-border, rgba(0,0,0,0.15))',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              position: 'relative'
            }}>
              <CalendarIcon size={17} style={{ color: dateColor, flexShrink: 0 }} />
              <span style={{
                fontWeight: 800,
                fontSize: '0.95rem',
                color: dateColor,
                letterSpacing: '-0.3px',
                whiteSpace: 'nowrap'
              }}>
                {formatKoreanDate(selectedDateStr)}
              </span>

              {/* 브라우저 기본 달력 피커 (클릭 시 직접 원하는 날짜 선택) */}
              <input
                type="date"
                value={selectedDateStr}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDateStr(e.target.value);
                    setErrorMsg('');
                  }
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%'
                }}
                title="클릭하여 날짜 변경"
              />
            </div>

            <button
              onClick={() => handleDateChangeBy(1)}
              title="다음 날짜로 이동"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1px solid var(--glass-border, rgba(0,0,0,0.12))',
                background: '#ffffff',
                cursor: 'pointer',
                color: 'var(--text-primary, #334155)',
                fontSize: '0.82rem',
                fontWeight: 600,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <span>다음</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 2행: 선택된 날짜가 속한 주간(월~일)의 날짜 바 (선택은 토, 일, 공휴일만 가능) */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
              padding: '0 2px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)' }}>
                📅 해당 주간 날짜 (토·일·공휴일만 출석 선택 가능)
              </span>

              {selectedDateStr !== todayStr && (
                <button
                  onClick={() => { setSelectedDateStr(todayStr); setErrorMsg(''); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: '#d97706',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '2px 4px'
                  }}
                  title="오늘 날짜로 이동"
                >
                  <RotateCcw size={11} />
                  오늘로 복귀
                </button>
              )}
            </div>

            {/* 7일간 요일 및 날짜 그리드 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px'
            }}>
              {currentWeekDays.map((item) => {
                const isSelected = item.isSelected;
                const isOp = item.isOperating; // 토, 일, 공휴일
                const holiday = item.holidayName;

                // 요일 텍스트 색상
                let yoilColor = '#64748b';
                if (item.isSun || holiday) yoilColor = '#ef4444';
                else if (item.isSat) yoilColor = '#2563eb';

                // 스타일 분기
                let bg = '#ffffff';
                let border = '1px solid rgba(0,0,0,0.08)';
                let textColor = '#1e293b';
                let opacity = 1;
                let cursor = 'pointer';

                if (!isOp) {
                  // 평일 미운영일
                  bg = 'rgba(0,0,0,0.02)';
                  border = '1px solid rgba(0,0,0,0.05)';
                  textColor = '#94a3b8';
                  opacity = isSelected ? 0.9 : 0.45;
                  cursor = 'not-allowed';
                  if (isSelected) {
                    border = '1.5px solid #cbd5e1';
                    bg = 'rgba(0,0,0,0.04)';
                  }
                } else {
                  // 토, 일, 공휴일 (선택 가능)
                  if (isSelected) {
                    if (holiday) {
                      bg = 'rgba(234,88,12,0.12)';
                      border = '2px solid #ea580c';
                      textColor = '#c2410c';
                    } else if (item.isSat) {
                      bg = 'rgba(37,99,235,0.12)';
                      border = '2px solid #2563eb';
                      textColor = '#1d4ed8';
                    } else {
                      bg = 'rgba(239,68,68,0.12)';
                      border = '2px solid #ef4444';
                      textColor = '#dc2626';
                    }
                  } else {
                    if (holiday) {
                      bg = 'rgba(254,243,199,0.4)';
                      border = '1px solid rgba(245,158,11,0.4)';
                    } else if (item.isSat) {
                      border = '1px solid rgba(37,99,235,0.3)';
                    } else {
                      border = '1px solid rgba(239,68,68,0.3)';
                    }
                  }
                }

                return (
                  <button
                    key={item.dateStr}
                    onClick={() => {
                      if (!isOp) {
                        setErrorMsg(`${item.month}월 ${item.day}일(${item.dayOfWeek})은 평일(클럽 미운영일)입니다. 토·일·공휴일만 출석 체크가 가능합니다. 🏸`);
                        return;
                      }
                      setSelectedDateStr(item.dateStr);
                      setErrorMsg('');
                    }}
                    disabled={!isOp}
                    title={
                      !isOp
                        ? `${item.month}/${item.day}(${item.dayOfWeek}) 평일 - 미운영`
                        : holiday
                        ? `${item.month}/${item.day}(${item.dayOfWeek}) ${holiday} (출석 가능)`
                        : `${item.month}/${item.day}(${item.dayOfWeek}) 주말 운영일 (출석 가능)`
                    }
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      padding: '8px 2px',
                      borderRadius: '12px',
                      background: bg,
                      border: border,
                      color: textColor,
                      cursor: cursor,
                      opacity: opacity,
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      position: 'relative'
                    }}
                  >
                    {/* 요일 */}
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: isOp ? yoilColor : '#94a3b8'
                    }}>
                      {item.dayOfWeek}
                    </span>

                    {/* 날짜 숫자 */}
                    <span style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      lineHeight: 1.1
                    }}>
                      {item.day}
                    </span>

                    {/* 상태 라벨 (공휴일명 / 운영 / 미운영) */}
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      color: !isOp
                        ? '#94a3b8'
                        : holiday
                        ? '#ea580c'
                        : item.isSat
                        ? '#2563eb'
                        : '#ef4444'
                    }}>
                      {holiday ? holiday.slice(0, 4) : isOp ? '운영' : '미운영'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3행: 운영 여부 상태 안내 및 출석 인원 수 */}
        <div style={{
          padding: '10px 20px',
          background: isOperating 
            ? (holidayName ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.08)')
            : 'rgba(239,68,68,0.08)',
          borderBottom: `1px solid ${
            isOperating 
              ? (holidayName ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.2)')
              : 'rgba(239,68,68,0.2)'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isOperating ? (
              holidayName ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#b45309',
                  background: 'rgba(245,158,11,0.18)',
                  padding: '3px 10px',
                  borderRadius: '12px'
                }}>
                  <Sparkles size={13} style={{ color: '#d97706' }} />
                  🌕 공휴일 ({holidayName}) · 클럽 운영일 (출석 가능)
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#059669',
                  background: 'rgba(16,185,129,0.15)',
                  padding: '3px 10px',
                  borderRadius: '12px'
                }}>
                  <CheckCircle2 size={13} />
                  클럽 운영일 (출석 가능)
                </span>
              )
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#dc2626',
                background: 'rgba(239,68,68,0.15)',
                padding: '3px 10px',
                borderRadius: '12px'
              }}>
                <ShieldAlert size={13} />
                평일 (클럽 미운영일)
              </span>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>
              {isOperating ? '회원 이름을 누르면 즉시 출석/취소됩니다.' : '토·일·공휴일만 출석 체크가 가능합니다.'}
            </span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: attendedCount > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${attendedCount > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: '20px',
            padding: '3px 10px',
            fontSize: '0.8rem',
            color: attendedCount > 0 ? '#059669' : 'var(--text-secondary, #64748b)',
            fontWeight: 700
          }}>
            <Users size={13} />
            <span>{attendedCount}명 출석 완료</span>
          </div>
        </div>

        {/* 에러 메시지 (알림) */}
        {errorMsg && (
          <div style={{
            padding: '9px 20px',
            background: 'rgba(239,68,68,0.12)',
            borderBottom: '1px solid rgba(239,68,68,0.25)',
            fontSize: '0.82rem',
            color: '#b91c1c',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <ShieldAlert size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 회원 이름 검색창 */}
        <div style={{ padding: '12px 20px 6px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.03)',
            border: '1px solid var(--glass-border, rgba(0,0,0,0.1))',
            borderRadius: '12px',
            padding: '8px 12px'
          }}>
            <Search size={15} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="회원 이름 검색 (예: 김도현, 강승국...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.85rem',
                color: 'var(--text-primary, #1e293b)'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 회원 카드 그리드 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>
          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 0',
              color: 'var(--text-secondary, #64748b)',
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#f59e0b' }} />
              회원 목록 불러오는 중...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 0',
              color: 'var(--text-secondary, #64748b)',
              fontSize: '0.9rem'
            }}>
              {searchTerm ? `'${searchTerm}' 검색 결과가 없습니다.` : '등록된 회원이 없습니다.'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '10px'
            }}>
              {filteredUsers.map((user) => {
                const attended = attendedIds.has(user.id);
                const isProcessing = toggling === user.id;

                return (
                  <button
                    key={user.id}
                    onClick={() => handleToggle(user)}
                    disabled={!!toggling || !isOperating}
                    title={!isOperating ? '평일은 출석 체크가 제한됩니다' : `${user.name} 출석 토글 (${selectedDateStr})`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '14px 10px',
                      borderRadius: '16px',
                      border: attended
                        ? '2px solid #10b981'
                        : '1.5px solid var(--glass-border, rgba(0,0,0,0.08))',
                      background: attended
                        ? 'rgba(16,185,129,0.12)'
                        : !isOperating
                        ? 'rgba(0,0,0,0.02)'
                        : 'var(--surface-color, #ffffff)',
                      cursor: !isOperating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      opacity: isProcessing ? 0.6 : (!isOperating ? 0.6 : 1),
                      position: 'relative',
                      boxShadow: attended 
                        ? '0 6px 16px rgba(16,185,129,0.18)' 
                        : '0 2px 6px rgba(0,0,0,0.02)',
                      transform: attended ? 'translateY(-1px)' : 'none'
                    }}
                  >
                    {/* 상태 아이콘 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {attended ? (
                        <CheckCircle2 size={24} style={{ color: '#10b981' }} />
                      ) : (
                        <Circle size={24} style={{ color: 'var(--text-secondary, #cbd5e1)' }} />
                      )}
                    </div>

                    {/* 회원 이름 */}
                    <div style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: attended ? '#059669' : 'var(--text-primary, #1e293b)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>{user.name}</span>
                      {user.isAdmin && (
                        <Shield size={12} style={{ color: '#8b5cf6' }} title="관리자" />
                      )}
                    </div>

                    {/* 출석 여부 라벨 */}
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: attended ? '#10b981' : 'var(--text-secondary, #94a3b8)',
                      background: attended ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.04)',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      {isProcessing ? '처리 중...' : attended ? '✓ 출석 완료' : '미출석'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.02)'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>
            총 회원 <strong>{filteredUsers.length}</strong>명 · <strong>{formatKoreanDate(selectedDateStr)}</strong> 기준
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: '10px',
              border: '1px solid var(--glass-border, rgba(0,0,0,0.15))',
              background: '#ffffff',
              color: 'var(--text-primary, #334155)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
