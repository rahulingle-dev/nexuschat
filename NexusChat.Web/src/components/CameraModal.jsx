import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RefreshCw, Send } from 'lucide-react';
import { uploadAttachment } from '../services/api';

export const CameraModal = ({ isOpen, onClose, token, onSendAttachment }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedPhoto]);

  const startCamera = async () => {
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check browser camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedPhoto(file);
          stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleSendPhoto = async () => {
    if (!capturedPhoto) return;
    setUploading(true);
    setError('');
    try {
      const res = await uploadAttachment(capturedPhoto, token);
      onSendAttachment({
        fileUrl: res.fileUrl,
        fileName: res.fileName || capturedPhoto.name,
        fileSize: res.fileSize || capturedPhoto.size,
        messageType: 1, // Image
        content: 'Photo taken with camera'
      });
      setCapturedPhoto(null);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Camera Capture</h3>
          <button type="button" className="close-modal-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body text-center">
          {error && <div className="alert alert-error mb-3">{error}</div>}

          {!capturedPhoto ? (
            <div className="camera-viewfinder">
              <video ref={videoRef} autoPlay playsInline className="webcam-video" />
              <canvas ref={canvasRef} className="hidden-canvas" />
            </div>
          ) : (
            <div className="camera-preview-box">
              <img
                src={URL.createObjectURL(capturedPhoto)}
                alt="Captured Snapshot"
                className="captured-img-preview"
              />
            </div>
          )}
        </div>

        <div className="modal-footer justify-between">
          {!capturedPhoto ? (
            <button
              type="button"
              className="btn-primary flex-1 justify-center"
              onClick={handleCapture}
              disabled={!!error}
            >
              <Camera size={18} /> Capture Photo
            </button>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={handleRetake}>
                <RefreshCw size={16} /> Retake
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSendPhoto}
                disabled={uploading}
              >
                {uploading ? <div className="spinner" /> : <><Send size={16} /> Send Photo</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
