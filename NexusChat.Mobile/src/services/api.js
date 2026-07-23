import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const port = isHttps ? '7201' : '5009';
  const protocol = isHttps ? 'https' : 'http';

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    return `${protocol}://${hostname}:${port}/api`;
  }

  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const laptopIp = hostUri.split(':')[0];
      if (laptopIp && laptopIp !== 'localhost' && laptopIp !== '127.0.0.1') {
        return `${protocol}://${laptopIp}:${port}/api`;
      }
    }
  } catch (e) {}

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5009/api';
  }

  return `${protocol}://localhost:${port}/api`;
};

export const BASE_URL = getBaseUrl();
export const SERVER_HOST = BASE_URL.replace('/api', '');
console.log('[API Config] Target Backend API Base URL:', BASE_URL);

// Create Axios Instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const apiCall = async (endpoint, method = 'GET', body = null, token = null) => {
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await api({
      url: endpoint,
      method,
      data: body,
      headers,
    });

    return response.data;
  } catch (err) {
    console.error(`[API Error] ${method} ${endpoint}:`, err);

    let errorMessage = 'Network error or backend server is not reachable.';
    if (err.response) {
      const data = err.response.data;
      if (typeof data === 'string') {
        errorMessage = data;
      } else if (data && typeof data === 'object') {
        errorMessage = data.message || data.title || JSON.stringify(data);
      } else {
        errorMessage = `Request failed with status ${err.response.status}`;
      }
    } else if (err.request) {
      errorMessage = `Cannot connect to backend server at ${BASE_URL}. Please ensure backend is running.`;
    } else if (err.message) {
      errorMessage = err.message;
    }

    throw new Error(errorMessage);
  }
};

export const uploadAttachment = async (fileObj, token = null) => {
  const formData = new FormData();
  formData.append('file', fileObj);

  const headers = {
    'Content-Type': 'multipart/form-data',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await api.post('/messages/upload', formData, { headers });
    const data = response.data;
    if (data.fileUrl && data.fileUrl.startsWith('/')) {
      data.fileUrl = `${SERVER_HOST}${data.fileUrl}`;
    }
    return data;
  } catch (err) {
    console.error('[API Upload Error]', err);
    let errorMessage = 'File upload failed';
    if (err.response) {
      errorMessage = err.response.data?.message || (typeof err.response.data === 'string' ? err.response.data : 'Upload error');
    } else if (err.message) {
      errorMessage = err.message;
    }
    throw new Error(errorMessage);
  }
};

export const sendOtp = (email, purpose = 'Register') => 
  apiCall('/auth/send-otp', 'POST', { email, purpose });

export const registerUser = (userData) => 
  apiCall('/auth/register', 'POST', userData);

export const loginUser = (credentials) => 
  apiCall('/auth/login', 'POST', credentials);

export const sendForgotPasswordOtp = (email) => 
  apiCall('/auth/forgot-password/send-otp', 'POST', { email });

export const resetPassword = (data) => 
  apiCall('/auth/forgot-password/reset', 'POST', data);

export const lookupUserByUsername = (username) => 
  apiCall(`/users/lookup/${username}`);

export const searchUsers = (query) => 
  apiCall(`/users/search?query=${encodeURIComponent(query)}`);

export const getUserChats = (userId, filter = 'All') => 
  apiCall(`/chats?userId=${userId}&filter=${filter}`);

export const createDirectChat = (user1Id, user2Id) => 
  apiCall('/chats/direct', 'POST', { user1Id, user2Id });

export const createGroupChat = (name, creatorId, memberUserIds, imageUrl = null) => 
  apiCall('/chats/group', 'POST', { name, creatorId, memberUserIds, imageUrl });

export const getChatMessages = (chatId, skip = 0, take = 50) => 
  apiCall(`/messages/${chatId}?skip=${skip}&take=${take}`);

export const sendMessage = (messageData) => 
  apiCall('/messages', 'POST', messageData);

export const markAsRead = (chatId, userId) => 
  apiCall('/messages/mark-read', 'POST', { chatId, userId });

export const deleteMessage = (messageId, userId, token = null) =>
  apiCall(`/messages/${messageId}?userId=${userId}`, 'DELETE', null, token);

export const clearChat = (chatId, userId, token = null) =>
  apiCall(`/chats/${chatId}/clear?userId=${userId}`, 'DELETE', null, token);

export const updateGroupName = (chatId, name, token = null) =>
  apiCall(`/chats/group/${chatId}/name`, 'PUT', { name }, token);

export const addGroupMember = (chatId, userId, token = null) =>
  apiCall(`/chats/group/${chatId}/members`, 'POST', { userId }, token);

export const removeGroupMember = (chatId, userId, token = null) =>
  apiCall(`/chats/group/${chatId}/members/${userId}`, 'DELETE', null, token);

export const deleteGroup = (chatId, token = null) =>
  apiCall(`/chats/group/${chatId}`, 'DELETE', null, token);

export const toggleChatFlag = (chatId, userId, flagType, token = null) =>
  apiCall('/chats/toggle-flag', 'POST', { chatId, userId, flagType }, token);

export const updateUserProfile = (userId, fullName, bio, avatarUrl = null, token = null) =>
  apiCall(`/users/profile/${userId}`, 'PUT', { fullName, bio, avatarUrl }, token);

export const logoutUser = (userId, token = null) =>
  apiCall('/auth/logout', 'POST', { userId }, token);
