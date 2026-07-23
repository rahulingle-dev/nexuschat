import React from 'react';
import { MessageSquare, Users, UserPlus, User, Sparkles, Sun, Moon } from 'lucide-react';
import { formatAvatarUrl } from '../services/api';

export const NavRail = ({
  currentUser,
  activeNavTab,
  setActiveNavTab,
  onOpenMyProfile,
  onOpenNewChat,
  onOpenNewGroup,
  theme,
  onToggleTheme
}) => {
  const userAvatarUrl = formatAvatarUrl(currentUser?.avatarUrl);

  return (
    <div className="nav-rail-container">
      {/* App Logo Badge */}
      <div className="rail-logo-box" title="NexusChat Web">
        <div className="rail-logo-glow" />
        <Sparkles size={22} className="text-cyan-400" />
      </div>

      {/* Primary Navigation Buttons */}
      <div className="rail-nav-group">
        <button
          type="button"
          className={`rail-nav-btn ${activeNavTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveNavTab('chats')}
          title="All Chats"
        >
          <MessageSquare size={20} />
          <span className="rail-tooltip">Chats</span>
        </button>

        <button
          type="button"
          className="rail-nav-btn"
          onClick={onOpenNewChat}
          title="New Direct Chat"
        >
          <UserPlus size={20} />
          <span className="rail-tooltip">New Chat</span>
        </button>

        <button
          type="button"
          className="rail-nav-btn"
          onClick={onOpenNewGroup}
          title="Create Group"
        >
          <Users size={20} />
          <span className="rail-tooltip">New Group</span>
        </button>

        <button
          type="button"
          className={`rail-nav-btn ${activeNavTab === 'profile' ? 'active' : ''}`}
          onClick={onOpenMyProfile}
          title="My Profile"
        >
          <User size={20} />
          <span className="rail-tooltip">My Profile</span>
        </button>
      </div>

      {/* Bottom Profile & Theme Toggle */}
      <div className="rail-bottom-group">
        <button
          type="button"
          className="rail-nav-btn theme-toggle-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-400" />}
          <span className="rail-tooltip">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button
          type="button"
          className="rail-user-avatar-btn"
          onClick={onOpenMyProfile}
          title={`${currentUser?.fullName || 'Profile'} (@${currentUser?.username})`}
        >
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="" className="rail-avatar-img" />
          ) : (
            <span className="rail-avatar-txt">
              {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
            </span>
          )}
          <span className="rail-online-dot" />
        </button>
      </div>
    </div>
  );
};
