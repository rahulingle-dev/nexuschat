import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { uploadAttachment } from '../services/api';

export const CameraModal = ({ isOpen, onClose, onSendAttachment, token }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [webrtcSupported, setWebrtcSupported] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCapturedImage(null);
    setHasPermission(null);
    if (Platform.OS === 'web') {
      const hasWebRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      setWebrtcSupported(hasWebRTC);

      if (!hasWebRTC) {
        setHasPermission(true);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error('Camera permission error:', err);
        setHasPermission(false);
      }
    } else {
      setHasPermission(true);
    }
  };

  const triggerMobileCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleMobileCameraCapture = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = () => {
    if (Platform.OS === 'web' && videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      stopCamera();
    } else {
      setCapturedImage('https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800');
    }
  };

  const handleRetake = () => {
    startCamera();
  };

  const handleSend = async () => {
    if (!capturedImage) return;
    setUploading(true);
    try {
      let fileToSend;
      const filename = `camera_${Date.now()}.jpg`;

      if (Platform.OS === 'web' && capturedImage.startsWith('data:')) {
        const byteCharacters = atob(capturedImage.split(',')[1]);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        const blob = new Blob(byteArrays, { type: 'image/jpeg' });
        fileToSend = new File([blob], filename, { type: 'image/jpeg' });
      } else {
        fileToSend = {
          uri: capturedImage,
          name: filename,
          type: 'image/jpeg'
        };
      }

      let uploadResult = null;
      try {
        uploadResult = await uploadAttachment(fileToSend, token);
      } catch (err) {
        console.warn('Backend upload failed, creating local object URL:', err);
        const localUrl = Platform.OS === 'web' ? URL.createObjectURL(fileToSend) : capturedImage;
        uploadResult = {
          fileUrl: localUrl,
          fileName: filename,
          fileSize: 102400,
          messageType: 1
        };
      }

      onSendAttachment({
        content: '📷 Camera Photo',
        messageType: 1,
        fileUrl: uploadResult.fileUrl,
        fileName: uploadResult.fileName || filename,
        fileSize: uploadResult.fileSize || 102400
      });

      handleCancel();
    } catch (err) {
      console.error('Failed to send camera photo:', err);
      alert('Failed to send photo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    stopCamera();
    setCapturedImage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Camera Capture</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn} disabled={uploading}>
              <Ionicons name="close" size={24} color="#8696a0" />
            </TouchableOpacity>
          </View>

          {/* Camera View / Photo Preview */}
          <View style={styles.cameraBox}>
            {capturedImage ? (
              <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="contain" />
            ) : hasPermission === null ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#00a884" />
                <Text style={styles.statusTxt}>Requesting Camera Permission...</Text>
              </View>
            ) : hasPermission === false ? (
              <View style={styles.centerBox}>
                <Ionicons name="camera-reverse-outline" size={64} color="#ef4444" />
                <Text style={[styles.statusTxt, { color: '#ef4444' }]}>Camera Access Denied</Text>
                <TouchableOpacity onPress={startCamera} style={styles.retryBtn}>
                  <Text style={styles.retryTxt}>Grant Permission & Retry</Text>
                </TouchableOpacity>
              </View>
            ) : !webrtcSupported ? (
              <View style={styles.centerBox}>
                <Ionicons name="camera-outline" size={64} color="#00a884" />
                <Text style={styles.statusTxt}>
                  Live camera preview requires an HTTPS connection.
                </Text>
                <Text style={[styles.statusTxt, { marginTop: 4, fontSize: 12 }]}>
                  Please capture a photo using your device's native camera instead:
                </Text>
                <TouchableOpacity onPress={triggerMobileCamera} style={styles.retryBtn}>
                  <Text style={styles.retryTxt}>Capture Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.videoWrapper}>
                {Platform.OS === 'web' ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                  />
                ) : (
                  <View style={styles.centerBox}>
                    <Text style={styles.statusTxt}>Native Camera Simulation</Text>
                  </View>
                )}
                <TouchableOpacity onPress={handleCapture} style={styles.captureBtn}>
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Hidden HTML Camera Input for Web Fallback */}
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleMobileCameraCapture}
            />
          )}

          {/* Action Row */}
          {capturedImage && (
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleCancel} style={styles.actionBtn} disabled={uploading}>
                <Ionicons name="close-circle-outline" size={20} color="#8696a0" />
                <Text style={[styles.actionTxt, { color: '#8696a0' }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleRetake} style={styles.actionBtn} disabled={uploading}>
                <Ionicons name="refresh-circle-outline" size={20} color="#00a884" />
                <Text style={[styles.actionTxt, { color: '#00a884' }]}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSend} style={[styles.actionBtn, styles.sendBtn]} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={[styles.actionTxt, { color: '#fff', fontWeight: 'bold' }]}>Send</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 20, 26, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  container: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#111b21',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222d34',
    padding: 20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e9edef'
  },
  closeBtn: {
    padding: 4
  },
  cameraBox: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#0b141a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222d34'
  },
  videoWrapper: {
    flex: 1,
    position: 'relative'
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  statusTxt: {
    color: '#8696a0',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center'
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#00a884',
    borderRadius: 20
  },
  retryTxt: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 12
  },
  captureBtn: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  captureInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff'
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    gap: 12
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#202c33',
    borderWidth: 1,
    borderColor: '#374248'
  },
  sendBtn: {
    backgroundColor: '#00a884',
    borderColor: '#00a884'
  },
  actionTxt: {
    fontSize: 14,
    fontWeight: '600'
  }
});
