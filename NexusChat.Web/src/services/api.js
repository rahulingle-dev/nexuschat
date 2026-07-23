import axios from 'axios';

const getBaseUrl = () => {
  const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const port = isHttps ? '7201' : '5009';
  const protocol = isHttps ? 'https' : 'http';
  
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    return `${protocol}://${hostname}:${port}/api`;
  }
  return `${protocol}://localhost:${port}/api`;
};

export const BASE_URL = getBaseUrl();
export const SERVER_HOST = BASE_URL.replace('/api', '');

export const formatAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('/')) return `${SERVER_HOST}${url}`;
  return url;
};

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

export const sendOtp = (email, purpose = 'Register') => 
  apiCall('/auth/send-otp', 'POST', { email, purpose });

export const registerUser = (userData) => 
  apiCall('/auth/register', 'POST', userData);

export const loginUser = (credentials) => 
  apiCall('/auth/login', 'POST', credentials);

export const logoutUser = (userId, token = null) => 
  apiCall('/auth/logout', 'POST', { userId }, token);

export const sendForgotPasswordOtp = (email) => 
  apiCall('/auth/forgot-password/send-otp', 'POST', { email });

export const resetPassword = (data) => 
  apiCall('/auth/forgot-password/reset', 'POST', data);

export const getUserChats = (userId, filter = 'All', token = null) => 
  apiCall(`/chats?userId=${userId}&filter=${filter}`, 'GET', null, token);

export const createDirectChat = (user1Id, user2Id, token = null) => 
  apiCall('/chats/direct', 'POST', { user1Id, user2Id, creatorId: user1Id, targetUserId: user2Id }, token);

export const createGroupChat = (name, creatorId, memberUserIds, imageUrl = null, token = null) => 
  apiCall('/chats/group', 'POST', { name, creatorId, memberUserIds, imageUrl }, token);

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

export const clearChat = (chatId, userId, token = null) => 
  apiCall(`/chats/${chatId}/clear?userId=${userId}`, 'DELETE', null, token);

export const getChatMessages = (chatId, userId = null, skip = 0, take = 50, token = null) => {
  const query = userId ? `?userId=${userId}&skip=${skip}&take=${take}` : `?skip=${skip}&take=${take}`;
  return apiCall(`/messages/${chatId}${query}`, 'GET', null, token);
};

export const sendMessage = (messageData, token = null) => 
  apiCall('/messages', 'POST', messageData, token);

export const markAsRead = (chatId, userId, token = null) => 
  apiCall('/messages/mark-read', 'POST', { chatId, userId }, token);

export const deleteMessage = (messageId, userId, deleteForEveryone = false, token = null) => 
  apiCall(`/messages/${messageId}?userId=${userId}&deleteForEveryone=${deleteForEveryone}`, 'DELETE', null, token);

export const addReaction = (messageId, userId, emoji, token = null) => 
  apiCall('/messages/reaction', 'POST', { messageId, userId, emoji }, token);

export const searchUsers = (query, token = null) => 
  apiCall(`/users/search?query=${encodeURIComponent(query)}`, 'GET', null, token);

export const lookupUserByUsername = (username, token = null) => 
  apiCall(`/users/lookup/${encodeURIComponent(username)}`, 'GET', null, token);

export const updateUserProfile = (userId, fullName, bio, avatarUrl = null, token = null) => 
  apiCall(`/users/profile/${userId}`, 'PUT', { fullName, bio, avatarUrl }, token);

export const uploadAttachment = async (fileObj, token = null) => {
  const formData = new FormData();
  formData.append('file', fileObj);

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await api.post('/messages/upload', formData, {
      headers: { ...headers, 'Content-Type': 'multipart/form-data' }
    });
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
