import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Image as ImageIcon, Music, Video, Send, FileUp, Sparkles, RefreshCw } from 'lucide-react';
import { uploadAttachment } from '../services/api';

export const AttachmentModal = ({ isOpen, onClose, token, onSendAttachment, onOpenCamera }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);
  const [fileCategoryFilter, setFileCategoryFilter] = useState('*');

  if (!isOpen) return null;

  const triggerFileInput = (acceptType = '*') => {
    setFileCategoryFilter(acceptType);
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const handleUploadAndSend = async () => {
    if (!selectedFile) {
      setError('Please select a file to attach.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const res = await uploadAttachment(selectedFile, token);
      onSendAttachment({
        fileUrl: res.fileUrl,
        fileName: res.fileName || selectedFile.name,
        fileSize: res.fileSize || selectedFile.size,
        messageType: res.messageType ?? 4,
        content: caption.trim()
      });
      setSelectedFile(null);
      setCaption('');
      onClose();
    } catch (err) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg attachment-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="att-header-icon">
              <FileUp size={18} className="text-cyan-400" />
            </div>
            <h3>Share Media & Files</h3>
          </div>
          <button type="button" className="close-modal-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && <div className="auth-alert alert-error mb-4">{error}</div>}

          {!selectedFile ? (
            <div className="att-selection-view">
              {/* Quick Type Selection Grid */}
              <div className="att-quick-grid">
                <button
                  type="button"
                  className="att-type-card type-image"
                  onClick={() => triggerFileInput('image/*,video/*')}
                >
                  <div className="att-type-icon-box">
                    <ImageIcon size={24} />
                  </div>
                  <span className="att-type-title">Photos & Videos</span>
                  <span className="att-type-desc">PNG, JPG, MP4, MOV</span>
                </button>

                <button
                  type="button"
                  className="att-type-card type-doc"
                  onClick={() => triggerFileInput('.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt')}
                >
                  <div className="att-type-icon-box">
                    <FileText size={24} />
                  </div>
                  <span className="att-type-title">Documents</span>
                  <span className="att-type-desc">PDF, DOCX, ZIP, TXT</span>
                </button>

                <button
                  type="button"
                  className="att-type-card type-audio"
                  onClick={() => triggerFileInput('audio/*')}
                >
                  <div className="att-type-icon-box">
                    <Music size={24} />
                  </div>
                  <span className="att-type-title">Audio & Music</span>
                  <span className="att-type-desc">MP3, WAV, M4A</span>
                </button>

                {onOpenCamera && (
                  <button
                    type="button"
                    className="att-type-card type-camera"
                    onClick={() => {
                      onClose();
                      onOpenCamera();
                    }}
                  >
                    <div className="att-type-icon-box">
                      <Sparkles size={24} />
                    </div>
                    <span className="att-type-title">Webcam Shot</span>
                    <span className="att-type-desc">Take instant photo</span>
                  </button>
                )}
              </div>

              {/* Drag and Drop Zone */}
              <div
                className={`att-dropzone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => triggerFileInput('*')}
              >
                <UploadCloud size={36} className="text-cyan-400 mb-2" />
                <span className="drop-main-txt">Click or drop any file here to upload</span>
                <span className="drop-sub-txt">Maximum size up to 50MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden-file-input"
                />
              </div>
            </div>
          ) : (
            <div className="att-preview-container">
              {/* Rich File Preview */}
              <div className="att-preview-card">
                <div className="att-preview-media">
                  {selectedFile.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="preview-img-element"
                    />
                  ) : selectedFile.type.startsWith('video/') ? (
                    <video
                      controls
                      src={URL.createObjectURL(selectedFile)}
                      className="preview-video-element"
                    />
                  ) : selectedFile.type.startsWith('audio/') ? (
                    <div className="preview-audio-box">
                      <Music size={40} className="text-cyan-400 mb-2" />
                      <audio controls src={URL.createObjectURL(selectedFile)} className="w-full" />
                    </div>
                  ) : (
                    <div className="preview-file-box">
                      <FileText size={48} className="text-cyan-400 mb-2" />
                      <span className="file-ext-badge">
                        {selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="att-preview-meta">
                  <div className="att-file-info">
                    <span className="att-filename">{selectedFile.name}</span>
                    <span className="att-filesize">{formatFileSize(selectedFile.size)}</span>
                  </div>

                  <button
                    type="button"
                    className="btn-change-file"
                    onClick={() => setSelectedFile(null)}
                  >
                    <RefreshCw size={14} /> Change File
                  </button>
                </div>
              </div>

              {/* Caption Box */}
              <div className="form-input-group mt-4">
                <label>Add Caption / Description (Optional)</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Type a message caption for this file..."
                  className="modal-input"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer justify-between">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {selectedFile && (
            <button
              type="button"
              className="btn-primary flex items-center gap-2"
              disabled={uploading}
              onClick={handleUploadAndSend}
            >
              {uploading ? <div className="spinner" /> : <><Send size={16} /> Send Attachment</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
