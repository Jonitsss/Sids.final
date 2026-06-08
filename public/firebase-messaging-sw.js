importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD3SVO6eq3iWeWU9HVvUaEuggta0wOqzfA",
  authDomain: "sids-eb607.firebaseapp.com",
  projectId: "sids-eb607",
  storageBucket: "sids-eb607.firebasestorage.app",
  messagingSenderId: "1067881169301",
  appId: "1:1067881169301:web:eac636beada9e0af84369c",
});

const messaging = firebase.messaging();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = "/notificaciones";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
