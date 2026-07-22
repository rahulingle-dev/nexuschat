import React, { useState, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { uploadAttachment } from '../services/api';

export const AttachmentModal = ({ isOpen, onClose, onSendAttachment, token }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreviewUrl(event.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const triggerFilePicker = (acceptType) => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      if (acceptType) input.accept = acceptType;
      input.onchange = (e) => handleFileChange(e);
      input.click();
    }
  };

  const handleUploadAndSend = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      let uploadResult = null;
      try {
        uploadResult = await uploadAttachment(selectedFile, token);
      } catch (err) {
        console.warn('Backend upload failed, creating local object URL:', err);
        // Fallback for preview
        const localUrl = URL.createObjectURL(selectedFile);
        const isImg = selectedFile.type.startsWith('image/');
        uploadResult = {
          fileUrl: localUrl,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          messageType: isImg ? 1 : 2
        };
      }

      const finalContent = caption.trim() || (uploadResult.messageType === 1 ? '📷 Photo Attachment' : `📁 ${selectedFile.name}`);

      onSendAttachment({
        content: finalContent,
        messageType: uploadResult.messageType,
        fileUrl: uploadResult.fileUrl,
        fileName: uploadResult.fileName || selectedFile.name,
        fileSize: uploadResult.fileSize || selectedFile.size
      });

      handleReset();
      onClose();
    } catch (error) {
      console.error('Failed attachment send:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setCaption('');
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Send Attachment</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#8696a0" />
            </TouchableOpacity>
          </View>

          {!selectedFile ? (
            <View style={styles.pickerGrid}>
              <TouchableOpacity style={styles.optionBox} onPress={() => triggerFilePicker('image/*')}>
                <View style={[styles.iconCircle, { backgroundColor: '#e91e63' }]}>
                  <Ionicons name="image" size={26} color="#fff" />
                </View>
                <Text style={styles.optionLabel}>Photos & Media</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionBox} onPress={() => triggerFilePicker('.pdf,.doc,.docx,.txt,.zip,.rar')}>
                <View style={[styles.iconCircle, { backgroundColor: '#7f66ff' }]}>
                  <Ionicons name="document" size={26} color="#fff" />
                </View>
                <Text style={styles.optionLabel}>Document</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionBox} onPress={() => triggerFilePicker('audio/*')}>
                <View style={[styles.iconCircle, { backgroundColor: '#ff9800' }]}>
                  <Ionicons name="musical-notes" size={26} color="#fff" />
                </View>
                <Text style={styles.optionLabel}>Audio File</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionBox} onPress={() => triggerFilePicker('*')}>
                <View style={[styles.iconCircle, { backgroundColor: '#00a884' }]}>
                  <Ionicons name="folder-open" size={26} color="#fff" />
                </View>
                <Text style={styles.optionLabel}>Browse File</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              {filePreviewUrl ? (
                <Image source={{ uri: filePreviewUrl }} style={styles.previewImage} resizeMode="contain" />
              ) : (
                <View style={styles.fileCard}>
                  <Ionicons name="document-text-outline" size={48} color="#00a884" />
                  <Text style={styles.previewFileName}>{selectedFile.name}</Text>
                  <Text style={styles.previewFileSize}>{formatSize(selectedFile.size)}</Text>
                </View>
              )}

              <View style={styles.captionBox}>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Add a caption..."
                  placeholderTextColor="#8696a0"
                  style={styles.captionInput}
                />
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity onPress={handleReset} style={styles.changeBtn}>
                  <Text style={styles.changeTxt}>Change File</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleUploadAndSend}
                  style={styles.sendBtn}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.sendTxt}>Send Attachment</Text>
                      <Ionicons name="send" size={16} color="#fff" style={{ marginLeft: 6 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(11, 20, 26, 0.85)',
    justifyContent: 'flex-end'
  },
  card: {
    backgroundColor: '#111b21',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222d34'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e9edef'
  },
  closeBtn: {
    padding: 4
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingVertical: 10,
    gap: 16
  },
  optionBox: {
    alignItems: 'center',
    width: 130,
    padding: 16,
    backgroundColor: '#202c33',
    borderRadius: 16
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  optionLabel: {
    color: '#e9edef',
    fontSize: 13,
    fontWeight: '500'
  },
  previewContainer: {
    alignItems: 'center'
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#0b141a'
  },
  fileCard: {
    width: '100%',
    padding: 24,
    backgroundColor: '#202c33',
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 14
  },
  previewFileName: {
    color: '#e9edef',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center'
  },
  previewFileSize: {
    color: '#8696a0',
    fontSize: 12,
    marginTop: 4
  },
  captionBox: {
    width: '100%',
    backgroundColor: '#202c33',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16
  },
  captionInput: {
    color: '#e9edef',
    fontSize: 14
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  changeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  changeTxt: {
    color: '#8696a0',
    fontSize: 14,
    fontWeight: '600'
  },
  sendBtn: {
    backgroundColor: '#00a884',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center'
  },
  sendTxt: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  }
});
