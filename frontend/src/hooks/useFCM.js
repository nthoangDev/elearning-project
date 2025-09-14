import { useEffect } from 'react';
import { initMessaging, getFcmToken, onMessage, isSupported } from '../firebase/firebaseClient';
import { authApis } from '../configs/Apis';
import { toast } from 'react-toastify';

export default function useFCM({ onDeadline }) {
  useEffect(() => {
    let messaging = null;
    let mounted = true;

    (async () => {
      try {
        if (!(await isSupported())) return;
        messaging = await initMessaging();
        if (!messaging) return;

        // 1) Xin quyền & lấy token
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;

        const token = await getFcmToken(messaging);
        if (!token) return;

        // 2) Register token về server
        await authApis().post('/api/student/notifications/fcm/register', {
          token, platform: 'web'
        });

        // 3) Lắng nghe message khi app foreground
        onMessage(messaging, (payload) => {
          const t = payload?.notification?.title || 'Thông báo';
          const b = payload?.notification?.body || '';
          toast.info(`${t}\n${b}`, { autoClose: 6000 });

          const type = payload?.data?.type;
          if (type === 'DEADLINE') onDeadline?.(payload?.data || {});
        });
      } catch (e) {
        // ignore
      }
    })();

    return () => { mounted = false; };
  }, [onDeadline]);
}
