import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy,
  writeBatch,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';

// 환경 변수에서 Firebase 정보 추출
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 필수 설정인 apiKey가 유효한 형식인지 검사하여 온라인 모드 활성화 여부 결정
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  firebaseConfig.projectId
);

// Firebase 초기화 (설정이 있는 경우만)
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isFirebaseConfigured ? getAuth(app) : null;
export const db = isFirebaseConfigured ? getFirestore(app) : null;

// 공식 등록 회원 26명 명단
export const OFFICIAL_MEMBERS = [
  '강승국', '강현동', '고서희', '김도현', '김문호', '김민회', '김성수', '김용범',
  '김주희', '김현수', '김회영', '박주현', '변란희', '변태식', '심영면', '안병림',
  '오세영', '유재준', '이병호', '이성대', '이승우', '이재욱', '이주엽', '이혜인',
  '조성복', '조현정'
];

// ==========================================
// MOCK & LOCAL STORAGE 데이터베이스 도우미
// ==========================================
const MOCK_USERS_KEY = 'badminton_users_v3';
const MOCK_ATTENDANCE_KEY = 'badminton_attendance';
const MOCK_MESSAGES_KEY = 'badminton_messages';
const CURRENT_USER_KEY = 'badminton_current_user';

// 공식 데이터 시딩
const seedMockData = () => {
  let users = [];
  const stored = localStorage.getItem(MOCK_USERS_KEY);
  if (stored) {
    try {
      users = JSON.parse(stored);
    } catch (e) {
      users = [];
    }
  }

  // 관리자 계정 보장
  if (!users.some(u => u.isAdmin || u.email === 'admin@admin.com')) {
    users.push({
      id: 'user-admin',
      email: 'admin@admin.com',
      name: '최고 관리자',
      password: import.meta.env.VITE_ADMIN_PASSWORD || '2026',
      isAdmin: true
    });
  }

  // 공식 회원 26명 등록 보장
  OFFICIAL_MEMBERS.forEach((name, idx) => {
    if (!users.some(u => u.name === name)) {
      users.push({
        id: `user-member-${idx + 1}`,
        email: '',
        name: name,
        password: 'password123',
        isAdmin: false
      });
    }
  });

  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

  if (!localStorage.getItem(MOCK_ATTENDANCE_KEY)) {
    localStorage.setItem(MOCK_ATTENDANCE_KEY, JSON.stringify([]));
  }

  if (!localStorage.getItem(MOCK_MESSAGES_KEY)) {
    const today = new Date().toISOString().split('T')[0];
    const mockMessages = [
      { id: 'msg-1', user_id: 'user-admin', user_name: '관리자', message_date: today, message_text: '배드민턴 클럽 출석부에 오신 것을 환영합니다! 🏸', created_at: new Date().toISOString() },
    ];
    localStorage.setItem(MOCK_MESSAGES_KEY, JSON.stringify(mockMessages));
  }
};

// 모의 데이터 시딩 실행
seedMockData();

// ==========================================
// 서비스 API 정의
// ==========================================

export const dbService = {
  // ------------------------------------------
  // 1. 회원 인증 API
  // ------------------------------------------
  async signUp(email, password, name) {
    if (isFirebaseConfigured) {
      // Firebase 회원가입
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Firebase Auth 유저 프로필 이름 정보 업데이트
      await updateProfile(userCredential.user, { displayName: name });
      
      // Firestore에 사용자 정보 기록
      try {
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userDocRef, {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: name,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Firestore users 테이블 저장 실패:', err);
      }
      
      return { 
        id: userCredential.user.uid, 
        email: userCredential.user.email, 
        name: name 
      };
    } else {
      // LocalStorage 회원가입
      const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      if (users.find(u => u.email === email)) {
        throw new Error('이미 등록된 이메일 주소입니다.');
      }
      const newUser = { id: `user-${Date.now()}`, email, name, password };
      users.push(newUser);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
      
      this.saveLocalSession(newUser);
      return newUser;
    }
  },

  async signIn(email, password) {
    if (isFirebaseConfigured) {
      // Firebase 로그인 (정식 보안 인증)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        name: userCredential.user.displayName || '사용자',
      };
      if (user.email && user.email.toLowerCase() === 'admin@admin.com') {
        user.isAdmin = true;
        user.name = '관리자';
        try {
          await updateProfile(userCredential.user, { displayName: '관리자' });
          const userDocRef = doc(db, 'users', userCredential.user.uid);
          await setDoc(userDocRef, { name: '관리자' }, { merge: true });
          // 기존 출석 데이터의 user_name도 '관리자'로 일괄 동기화
          this.fixAdminAttendanceNames(user.id);
        } catch (e) {
          console.error('관리자 이름 동기화 실패:', e);
        }
      }
      this.saveLocalSession(user);
      return user;
    } else {
      // LocalStorage 로그인 (로컬 데모 개발 모드 전용)
      // 최고 관리자 계정 가상 인증 처리
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '2026';
      if (email && email.toLowerCase() === 'admin@admin.com' && password === adminPassword) {
        const adminUser = {
          id: 'user-admin',
          email: 'admin@admin.com',
          name: '관리자',
          isAdmin: true
        };
        this.saveLocalSession(adminUser);
        return adminUser;
      }

      const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      this.saveLocalSession(user);
      return user;
    }
  },

  async signOut() {
    if (isFirebaseConfigured) {
      await firebaseSignOut(auth);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  async getCurrentUser() {
    const localUserStr = localStorage.getItem(CURRENT_USER_KEY);
    if (localUserStr) {
      const localUser = JSON.parse(localUserStr);
      if (localUser.email && localUser.email.toLowerCase() === 'admin@admin.com') {
        localUser.name = '관리자';
        return localUser;
      }
    }

    if (isFirebaseConfigured) {
      // Firebase Auth의 현재 로그인 관찰
      return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          if (user) {
            const userData = {
              id: user.uid,
              email: user.email,
              name: user.displayName || '사용자'
            };
            if (user.email && user.email.toLowerCase() === 'admin@admin.com') {
              userData.isAdmin = true;
              userData.name = '관리자';
              if (user.displayName !== '관리자') {
                updateProfile(user, { displayName: '관리자' }).catch(console.error);
              }
              const userDocRef = doc(db, 'users', user.uid);
              setDoc(userDocRef, { name: '관리자' }, { merge: true }).catch(console.error);
              // 기존 출석 데이터의 user_name도 '관리자'로 일괄 동기화
              this.fixAdminAttendanceNames(user.uid);
            }
            resolve(userData);
          } else {
            resolve(localUserStr ? JSON.parse(localUserStr) : null);
          }
        });
      });
    } else {
      if (localUserStr) {
        const user = JSON.parse(localUserStr);
        if (user.email && user.email.toLowerCase() === 'admin@admin.com') {
          user.name = '관리자';
        }
        return user;
      }
      return null;
    }
  },

  saveLocalSession(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin || false
    }));
  },

  // ------------------------------------------
  // 2. 출석 체크 API
  // ------------------------------------------
  async getAttendance(year, month) {
    if (isFirebaseConfigured) {
      // Firestore에서 특정 연도/월 범위의 모든 출석 문서 로드
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`; // 안전하게 넓은 범위로 조회

      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef, 
        where('attendance_date', '>=', startDate), 
        where('attendance_date', '<=', endDate)
      );
      
      const querySnapshot = await getDocs(q);
      const attendance = [];
      querySnapshot.forEach((doc) => {
        attendance.push({ id: doc.id, ...doc.data() });
      });
      return attendance;
    } else {
      const allAttendance = JSON.parse(localStorage.getItem(MOCK_ATTENDANCE_KEY) || '[]');
      return allAttendance.filter(item => {
        const parts = item.attendance_date.split('-');
        return parseInt(parts[0]) === year && parseInt(parts[1]) === month;
      });
    }
  },

  async toggleAttendance(dateString, isAttending, user) {
    if (!user) throw new Error('회원 정보를 찾을 수 없습니다.');

    if (isFirebaseConfigured) {
      // 중복 체크 방지 및 심플한 삭제를 위해 문서 ID 형식을 '유저ID_날짜'로 고정
      const docId = `${user.id}_${dateString}`;
      const docRef = doc(db, 'attendance', docId);

      if (isAttending) {
        await setDoc(docRef, {
          user_id: user.id,
          user_name: user.name,
          attendance_date: dateString,
          created_at: new Date().toISOString()
        });
      } else {
        await deleteDoc(docRef);
      }
    } else {
      // LocalStorage
      const allAttendance = JSON.parse(localStorage.getItem(MOCK_ATTENDANCE_KEY) || '[]');
      
      if (isAttending) {
        if (allAttendance.some(a => a.user_id === user.id && a.attendance_date === dateString)) {
          return;
        }
        allAttendance.push({
          id: `att-${Date.now()}`,
          user_id: user.id,
          user_name: user.name,
          attendance_date: dateString
        });
      } else {
        const index = allAttendance.findIndex(a => a.user_id === user.id && a.attendance_date === dateString);
        if (index > -1) {
          allAttendance.splice(index, 1);
        }
      }
      localStorage.setItem(MOCK_ATTENDANCE_KEY, JSON.stringify(allAttendance));
    }
  },

  // ------------------------------------------
  // 3. 한마디 방명록 API
  // ------------------------------------------
  async getMessages(year, month) {
    if (isFirebaseConfigured) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const messagesRef = collection(db, 'social_messages');
      const q = query(
        messagesRef, 
        where('message_date', '>=', startDate),
        where('message_date', '<=', endDate)
      );
      
      const querySnapshot = await getDocs(q);
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      // 복합 인덱스 요구 우회를 위해 클라이언트 사이드 정렬 수행
      messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return messages;
    } else {
      const allMessages = JSON.parse(localStorage.getItem(MOCK_MESSAGES_KEY) || '[]');
      return allMessages.filter(m => {
        const parts = m.message_date.split('-');
        return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
      });
    }
  },

  async addMessage(dateString, text, user) {
    if (!user) throw new Error('로그인이 필요합니다.');
    const trimmed = text.trim();
    if (!trimmed) return null;

    if (isFirebaseConfigured) {
      const messageData = {
        user_id: user.id,
        user_name: user.name,
        message_date: dateString,
        message_text: trimmed,
        created_at: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'social_messages'), messageData);
      return { id: docRef.id, ...messageData };
    } else {
      const allMessages = JSON.parse(localStorage.getItem(MOCK_MESSAGES_KEY) || '[]');
      const newMessage = {
        id: `msg-${Date.now()}`,
        user_id: user.id,
        user_name: user.name,
        message_date: dateString,
        message_text: trimmed,
        created_at: new Date().toISOString()
      };
      allMessages.push(newMessage);
      localStorage.setItem(MOCK_MESSAGES_KEY, JSON.stringify(allMessages));
      return newMessage;
    }
  },

  async deleteMessage(messageId, user) {
    if (!user) throw new Error('로그인이 필요합니다.');

    if (isFirebaseConfigured) {
      const docRef = doc(db, 'social_messages', messageId);
      // 단순 편의상 클라이언트 단에서 검증하고 데이터 삭제 (보안 룰 적용을 추천)
      await deleteDoc(docRef);
    } else {
      const allMessages = JSON.parse(localStorage.getItem(MOCK_MESSAGES_KEY) || '[]');
      const index = allMessages.findIndex(m => m.id === messageId && m.user_id === user.id);
      if (index > -1) {
        allMessages.splice(index, 1);
        localStorage.setItem(MOCK_MESSAGES_KEY, JSON.stringify(allMessages));
      } else {
        throw new Error('삭제 권한이 없거나 메시지가 존재하지 않습니다.');
      }
    }
  },

  async getAllUsers() {
    const userMap = {};

    // 1. 기본 공식 26명 명단 기본 적재 (로그인하지 않아도 빠른 출석체크 카드가 즉시 나타남)
    OFFICIAL_MEMBERS.forEach((name, idx) => {
      userMap[name] = {
        id: `user-member-${idx + 1}`,
        name: name,
        email: '',
        isAdmin: false
      };
    });

    // 2. 로컬스토리지에 저장된 추가 회원 및 수정된 정보 병합
    try {
      const localUsers = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      localUsers.forEach(u => {
        if (u.name) {
          userMap[u.name] = {
            id: u.id || `user-${u.name}`,
            name: u.name.trim(),
            email: u.email || '',
            isAdmin: Boolean(u.isAdmin)
          };
        }
      });
    } catch (e) {}

    // 3. Firebase 설정 시 Firestore 데이터 병합
    if (isFirebaseConfigured && db) {
      // A. users 컬렉션 조회
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const uid = data.id || docSnap.id;
          const userName = data.name || data.displayName || data.userName;
          if (userName) {
            userMap[userName.trim()] = {
              id: uid,
              name: userName.trim(),
              email: data.email || '',
              isAdmin: Boolean(data.isAdmin || (data.email && data.email.toLowerCase() === 'admin@admin.com'))
            };
          }
        });
      } catch (err) {
        console.warn('Firestore users 컬렉션 조회 (기본 공식 명단 활용):', err);
      }

      // B. 출석 기록(attendance)에 존재하는 회원 보완
      try {
        const attSnapshot = await getDocs(collection(db, 'attendance'));
        attSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const uid = data.user_id;
          const userName = data.user_name;
          if (uid && userName && userName !== '관리자' && !userMap[userName.trim()]) {
            userMap[userName.trim()] = {
              id: uid,
              name: userName.trim(),
              email: '',
              isAdmin: false
            };
          }
        });
      } catch (attErr) {
        console.warn('출석 기록에서 회원 목록 보완 중 알림:', attErr);
      }
    }

    return Object.values(userMap);
  },

  async changeAttendanceDate(attendanceId, newDateString) {
    if (isFirebaseConfigured) {
      const docRef = doc(db, 'attendance', attendanceId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('해당 출석 데이터가 존재하지 않습니다.');
      }
      const data = docSnap.data();
      
      // 새 문서 ID 포맷: '유저UID_날짜'
      const newDocId = `${data.user_id}_${newDateString}`;
      const newDocRef = doc(db, 'attendance', newDocId);

      // 새 문서 생성 후 기존 문서 삭제
      await setDoc(newDocRef, {
        ...data,
        attendance_date: newDateString,
        updated_at: new Date().toISOString()
      });
      await deleteDoc(docRef);
    } else {
      const allAttendance = JSON.parse(localStorage.getItem(MOCK_ATTENDANCE_KEY) || '[]');
      const item = allAttendance.find(a => a.id === attendanceId);
      if (!item) {
        throw new Error('해당 출석 데이터가 존재하지 않습니다.');
      }
      
      // 혹시 해당 유저가 새 날짜에 이미 출석체크 되어 있다면 중복 방지 (기존 것 삭제하고 덮어씀)
      const isDuplicate = allAttendance.some(a => a.user_id === item.user_id && a.attendance_date === newDateString);
      if (isDuplicate) {
        const index = allAttendance.findIndex(a => a.id === attendanceId);
        allAttendance.splice(index, 1);
      } else {
        item.attendance_date = newDateString;
      }
      
      localStorage.setItem(MOCK_ATTENDANCE_KEY, JSON.stringify(allAttendance));
    }
  },

  async fixAdminAttendanceNames(userId) {
    if (!isFirebaseConfigured || !userId) return;
    try {
      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, where('user_id', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      let count = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.user_name !== '관리자') {
          batch.update(doc.ref, { user_name: '관리자' });
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
        console.log(`관리자 출석 이름 ${count}개 수정 완료.`);
      }
    } catch (e) {
      console.error('관리자 출석 이름 일괄 수정 실패:', e);
    }
  },

  // 관리자 전용: 새 회원(이름) 추가
  async addUser(name, email = '') {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('회원 이름을 입력해 주세요.');

    if (isFirebaseConfigured) {
      const newId = `user-${Date.now()}`;
      const userDocRef = doc(db, 'users', newId);
      const newUserData = {
        id: newId,
        name: trimmedName,
        email: email.trim(),
        created_at: new Date().toISOString()
      };
      await setDoc(userDocRef, newUserData);
      return newUserData;
    } else {
      const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      if (users.some(u => u.name === trimmedName)) {
        throw new Error(`이미 "${trimmedName}" 회원이 등록되어 있습니다.`);
      }
      const newId = `user-member-${Date.now()}`;
      const newUser = {
        id: newId,
        name: trimmedName,
        email: email.trim(),
        password: 'password123',
        isAdmin: false
      };
      users.push(newUser);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
      return newUser;
    }
  },

  // 관리자 전용: 회원 이름 변경 (출석 데이터도 동기화)
  async updateUserName(targetUser, newName) {
    const trimmedName = newName.trim();
    if (!trimmedName) throw new Error('새 이름을 입력해 주세요.');
    const userId = typeof targetUser === 'object' && targetUser !== null
      ? (targetUser.id || targetUser.user_id)
      : targetUser;

    if (!userId) throw new Error('유효한 회원 ID를 찾을 수 없습니다.');

    if (isFirebaseConfigured) {
      // 1. users 컬렉션 업데이트
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, { name: trimmedName }, { merge: true });

      // 2. attendance 기록 일괄 업데이트
      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, where('user_id', '==', userId));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { user_name: trimmedName });
      });
      await batch.commit();
    } else {
      // 1. MOCK_USERS 업데이트
      const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      const user = users.find(u => u.id === userId);
      if (user) {
        user.name = trimmedName;
        localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
      }

      // 2. MOCK_ATTENDANCE 업데이트
      const allAttendance = JSON.parse(localStorage.getItem(MOCK_ATTENDANCE_KEY) || '[]');
      allAttendance.forEach(a => {
        if (a.user_id === userId) {
          a.user_name = trimmedName;
        }
      });
      localStorage.setItem(MOCK_ATTENDANCE_KEY, JSON.stringify(allAttendance));
    }
  },

  // 관리자 전용: 회원 삭제
  async deleteUser(userId) {
    if (!userId) return;

    if (isFirebaseConfigured) {
      const userDocRef = doc(db, 'users', userId);
      await deleteDoc(userDocRef);
    } else {
      const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      const filtered = users.filter(u => u.id !== userId);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(filtered));
    }
  },

  // 클럽 대표 배너 사진 조회 (Firestore 2중 조회 + LocalStorage 폴백)
  async getClubBanner() {
    if (isFirebaseConfigured && db) {
      // 1. settings/club 우선 조회
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'club'));
        if (settingsDoc.exists() && settingsDoc.data().banner_image) {
          const banner = settingsDoc.data().banner_image;
          try { localStorage.setItem('badminton_club_banner', banner); } catch (e) {}
          return banner;
        }
      } catch (err) {
        console.warn('Firebase settings/club 배너 조회 확인:', err);
      }

      // 2. attendance/club_banner 보조 조회 (기존 보안 규칙 호환용)
      try {
        const fallbackDoc = await getDoc(doc(db, 'attendance', 'club_banner'));
        if (fallbackDoc.exists() && fallbackDoc.data().banner_image) {
          const banner = fallbackDoc.data().banner_image;
          try { localStorage.setItem('badminton_club_banner', banner); } catch (e) {}
          return banner;
        }
      } catch (err) {
        console.warn('Firebase attendance/club_banner 배너 조회 확인:', err);
      }
    }
    return localStorage.getItem('badminton_club_banner') || null;
  },

  // 클럽 대표 배너 사진 실시간 구독 (모바일 ↔ 웹 간 실시간 자동 반영)
  subscribeClubBanner(callback) {
    if (!isFirebaseConfigured || !db) return () => {};

    let unsub1 = () => {};
    let unsub2 = () => {};

    try {
      unsub1 = onSnapshot(doc(db, 'settings', 'club'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && 'banner_image' in data) {
            callback(data.banner_image || null);
          }
        }
      }, (err) => {
        console.warn('settings/club 실시간 수신 대기:', err);
      });
    } catch (e) {
      console.warn('unsub1 설정 실패:', e);
    }

    try {
      unsub2 = onSnapshot(doc(db, 'attendance', 'club_banner'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && 'banner_image' in data) {
            callback(data.banner_image || null);
          }
        }
      }, (err) => {
        console.warn('attendance/club_banner 실시간 수신 대기:', err);
      });
    } catch (e) {
      console.warn('unsub2 설정 실패:', e);
    }

    return () => {
      try { if (typeof unsub1 === 'function') unsub1(); } catch (e) {}
      try { if (typeof unsub2 === 'function') unsub2(); } catch (e) {}
    };
  },

  // 관리자 전용: 클럽 대표 배너 사진 저장 (Firestore 및 LocalStorage 동기화)
  async updateClubBanner(imageDataUrl) {
    if (!imageDataUrl) return;

    // 1. 브라우저 로컬 스토리지에 안전하게 보관 (용량 초과 시 예외 무시)
    try {
      localStorage.setItem('badminton_club_banner', imageDataUrl);
    } catch (e) {
      console.warn('로컬 스토리지 한도 초과 (클라우드 저장 계속 진행):', e);
    }

    // 2. Firebase Cloud Firestore 실시간 저장 (모바일-웹 모든 기기 공유)
    if (isFirebaseConfigured && db) {
      const payload = {
        banner_image: imageDataUrl,
        user_id: auth?.currentUser?.uid || 'admin',
        attendance_date: 'setting',
        updated_at: new Date().toISOString()
      };

      // settings/club 저장 시도
      try {
        await setDoc(doc(db, 'settings', 'club'), {
          banner_image: imageDataUrl,
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Firebase settings/club 배너 저장 주의:', err);
      }

      // attendance/club_banner 저장 시도 (보안 규칙 호환 보장)
      try {
        await setDoc(doc(db, 'attendance', 'club_banner'), payload, { merge: true });
      } catch (err) {
        console.warn('Firebase attendance/club_banner 배너 저장 주의:', err);
      }
    }
    return imageDataUrl;
  },

  // 관리자 전용: 클럽 대표 배너 사진 초기화 (기본 사진으로 복원)
  async resetClubBanner() {
    try {
      localStorage.removeItem('badminton_club_banner');
    } catch (e) {}

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'settings', 'club'), {
          banner_image: null,
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Firebase settings 배너 초기화:', err);
      }

      try {
        await setDoc(doc(db, 'attendance', 'club_banner'), {
          banner_image: null,
          user_id: auth?.currentUser?.uid || 'admin',
          attendance_date: 'setting',
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Firebase attendance 배너 초기화:', err);
      }
    }
  }
};
