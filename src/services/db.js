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
  updateDoc
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

// ==========================================
// MOCK & LOCAL STORAGE 데이터베이스 도우미
// ==========================================
const MOCK_USERS_KEY = 'badminton_users';
const MOCK_ATTENDANCE_KEY = 'badminton_attendance';
const MOCK_MESSAGES_KEY = 'badminton_messages';
const CURRENT_USER_KEY = 'badminton_current_user';

// 가상 데모용 데이터 초기 시딩
const seedMockData = () => {
  if (!localStorage.getItem(MOCK_USERS_KEY)) {
    const mockUsers = [
      { id: 'user-admin', email: 'admin@admin.com', name: '최고 관리자', password: import.meta.env.VITE_ADMIN_PASSWORD || '2026', isAdmin: true },
      { id: 'user-dohyun', email: 'dohyun@badminton.com', name: '미스터 도현', password: 'password123' },
      { id: 'user-minsu', email: 'minsu@badminton.com', name: '김민수', password: 'password123' },
      { id: 'user-suji', email: 'suji@badminton.com', name: '이수지', password: 'password123' },
      { id: 'user-jieun', email: 'jieun@badminton.com', name: '박지은', password: 'password123' },
    ];
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(mockUsers));
  }

  if (!localStorage.getItem(MOCK_ATTENDANCE_KEY)) {
    const today = new Date();
    const formatDate = (offsetDays) => {
      const d = new Date(today);
      d.setDate(today.getDate() + offsetDays);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const mockAttendance = [
      { id: 'att-1', user_id: 'user-dohyun', user_name: '미스터 도현', attendance_date: formatDate(0) },
      { id: 'att-2', user_id: 'user-minsu', user_name: '김민수', attendance_date: formatDate(0) },
      { id: 'att-3', user_id: 'user-suji', user_name: '이수지', attendance_date: formatDate(0) },
      { id: 'att-4', user_id: 'user-dohyun', user_name: '미스터 도현', attendance_date: formatDate(1) },
      { id: 'att-5', user_id: 'user-jieun', user_name: '박지은', attendance_date: formatDate(1) },
      { id: 'att-6', user_id: 'user-minsu', user_name: '김민수', attendance_date: formatDate(2) },
      { id: 'att-past1', user_id: 'user-dohyun', user_name: '미스터 도현', attendance_date: formatDate(-1) },
      { id: 'att-past2', user_id: 'user-minsu', user_name: '김민수', attendance_date: formatDate(-1) },
      { id: 'att-past3', user_id: 'user-suji', user_name: '이수지', attendance_date: formatDate(-2) },
      { id: 'att-past4', user_id: 'user-dohyun', user_name: '미스터 도현', attendance_date: formatDate(-3) },
    ];
    localStorage.setItem(MOCK_ATTENDANCE_KEY, JSON.stringify(mockAttendance));
  }

  if (!localStorage.getItem(MOCK_MESSAGES_KEY)) {
    const getTodayStr = () => {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const today = getTodayStr();
    const mockMessages = [
      { id: 'msg-1', user_id: 'user-minsu', user_name: '김민수', message_date: today, message_text: '오늘 컨디션 최상입니다! 다들 코트에서 뵙죠 🏸', created_at: new Date().toISOString() },
      { id: 'msg-2', user_id: 'user-suji', user_name: '이수지', message_date: today, message_text: '새 라켓 들고 갑니다. 기대되네요!', created_at: new Date().toISOString() },
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
    if (!user) throw new Error('로그인이 필요합니다.');

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
    if (isFirebaseConfigured) {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const users = [];
        querySnapshot.forEach((doc) => {
          users.push(doc.data());
        });
        
        // 만약 users가 비어있을 경우 (기존 가입한 유저들이 users에 기록이 안 되었을 시)
        // 출석부 목록에서 고유 사용자를 추출하여 폴백 데이터로 활용
        if (users.length === 0) {
          const attendanceRef = collection(db, 'attendance');
          const attSnapshot = await getDocs(attendanceRef);
          const userMap = {};
          attSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.user_id && data.user_name) {
              userMap[data.user_id] = { id: data.user_id, name: data.user_name };
            }
          });
          return Object.values(userMap);
        }
        return users;
      } catch (err) {
        console.error('회원 목록 조회 실패:', err);
        return [];
      }
    } else {
      const mockUsers = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      return mockUsers.map(({ id, email, name, isAdmin }) => ({ id, email, name, isAdmin }));
    }
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
  }
};
