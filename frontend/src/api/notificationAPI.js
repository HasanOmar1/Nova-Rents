import axios from "axios";

const BASE_URL = "/notifications";

export const getMyNotifications = async () => {
  const response = await axios.get(`${BASE_URL}/my-notifications`, );
    
  return response.data;
};

export const getUnreadNotificationsCount = async () => {
  const response = await axios.get(`${BASE_URL}/unread-notifications-count`);
  return response.data;
};

export async function markNotificationAsRead(notificationId) {
  const response = await axios.put(
    `${BASE_URL}/mark-notification-as-read/${notificationId}`,
    {},
  );

  return response.data;
}

