import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { onSocketEvent, offSocketEvent } from '../services/socket';
import { COLORS } from '../utils/theme';

const InquiryDetailsScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Comment states
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const scrollViewRef = useRef(null);

  // Metadata update states
  const [isUpdating, setIsUpdating] = useState(false);
  const [priorityModalVisible, setPriorityModalVisible] = useState(false);
  const [assigneeModalVisible, setAssigneeModalVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Track keyboard visibility for input safe areas
  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      () => setIsKeyboardVisible(true)
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const fetchTaskDetails = useCallback(async () => {
    try {
      const response = await api.get(`/api/tasks/${id}`);
      setTask(response.data);
    } catch (error) {
      console.error('[Details Screen] Failed to load task details:', error.message);
      Alert.alert('Error', 'Failed to load inquiry details. It may have been deleted.');
      navigation.goBack();
    }
  }, [id, navigation]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/api/auth/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('[Details Screen] Failed to load handlers:', error.message);
    }
  }, []);

  // Listen to socket comments for real-time chat updates
  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchTaskDetails(), fetchUsers()]);
      setLoading(false);
    };
    init();

    const handleSocketComment = (data) => {
      console.log('[Details Screen] Realtime comment received:', data);
      if (data && data.taskId === id && data.comment) {
        setTask((prevTask) => {
          if (!prevTask) return null;
          // Avoid duplicates
          if (prevTask.comments.find((c) => c.id === data.comment.id)) return prevTask;
          return {
            ...prevTask,
            comments: [...prevTask.comments, data.comment],
          };
        });
        
        // Auto scroll chat to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const handleSocketStatusUpdate = (data) => {
      console.log('[Details Screen] Realtime status updated in details:', data);
      if (data && data.taskId === id) {
        fetchTaskDetails();
      }
    };

    onSocketEvent('new_comment', handleSocketComment);
    onSocketEvent('task_status_updated', handleSocketStatusUpdate);

    return () => {
      offSocketEvent('new_comment', handleSocketComment);
      offSocketEvent('task_status_updated', handleSocketStatusUpdate);
    };
  }, [id, fetchTaskDetails, fetchUsers]);

  const handleMetadataChange = async (field, val) => {
    setIsUpdating(true);
    setPriorityModalVisible(false);
    setAssigneeModalVisible(false);

    try {
      const payload = { [field]: val };
      const response = await api.put(`/api/tasks/${id}`, payload);
      setTask((prev) => ({ ...prev, ...response.data }));
      
      // Refresh to pull updated status histories / comments
      await fetchTaskDetails();
    } catch (error) {
      console.error('[Details Screen] Metadata update failed:', error.message);
      Alert.alert('Access Denied', error.response?.data?.error || 'Failed to update variable.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setCommentSubmitting(true);
    try {
      // Outgoing payload automatically encrypted
      const response = await api.post(`/api/tasks/${id}/comments`, { content: newComment.trim() });
      
      // Append manually if socket didn't broadcast to us directly (or backup)
      setTask((prev) => {
        if (!prev) return null;
        if (prev.comments.find((c) => c.id === response.data.id)) return prev;
        return {
          ...prev,
          comments: [...prev.comments, response.data],
        };
      });

      setNewComment('');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('[Details Screen] Failed to post comment:', error.message);
      Alert.alert('Error', 'Failed to save comment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading || !task) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Decrypting inquiry files...</Text>
      </View>
    );
  }

  // Parse AI Summary
  let aiSummary = {};
  if (task.aiSummary && typeof task.aiSummary === 'string') {
    try {
      aiSummary = JSON.parse(task.aiSummary);
    } catch (e) {
      // Ignore
    }
  }

  // Sorted timeline list combining comments and history logs
  const timeline = [
    ...(task.comments || []).map((c) => ({ ...c, timelineType: 'comment' })),
    ...(task.statusHistory || []).map((h) => ({ ...h, timelineType: 'history' })),
  ].sort((a, b) => new Date(a.createdAt || a.changedAt).getTime() - new Date(b.createdAt || b.changedAt).getTime());

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Metadata Overview Block */}
          <View style={styles.headerBlock}>
            <View style={styles.badgeRow}>
              <Text style={styles.badgeId}>{task.inquiryId}</Text>
              <Text style={[styles.badge, styles.badgePriority]}>{task.priority}</Text>
              <Text style={[styles.badge, styles.badgeStatus]}>{task.status.replace('_', ' ')}</Text>
            </View>
            <Text style={styles.subjectText}>{task.subject}</Text>
            <Text style={styles.metaLabelText}>
              Client: <Text style={styles.metaValText}>{task.customerName}</Text> &bull; {task.senderEmail}
            </Text>
            <Text style={styles.dateText}>
              Received: {new Date(task.createdAt).toLocaleString()}
            </Text>
          </View>

          {/* Controls Editor Block */}
          {user?.role !== 'STAFF' && (
            <View style={styles.editorBlock}>
              <Text style={styles.sectionHeader}>Task Settings</Text>
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setPriorityModalVisible(true)}
                  disabled={isUpdating}
                >
                  <Text style={styles.editBtnLabel}>Priority: {task.priority}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setAssigneeModalVisible(true)}
                  disabled={isUpdating}
                >
                  <Text style={styles.editBtnLabel}>
                    Handler: {task.assignedUser?.name || 'Unassigned'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Email Body Block */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>Inquiry Email Description</Text>
            <View style={styles.emailBodyCard}>
              <Text style={styles.emailBodyText}>{task.description}</Text>
            </View>
          </View>

          {/* AI Extracted Items */}
          {aiSummary.products && aiSummary.products.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeader}>AI Extracted Items</Text>
              <View style={styles.productsCard}>
                {aiSummary.products.map((p, idx) => (
                  <View key={idx} style={styles.productRow}>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.productQty}>Qty: {p.quantity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Comments & Activity Log Chat Area */}
          <View style={[styles.sectionBlock, { marginBottom: 12 }]}>
            <Text style={styles.sectionHeader}>Activity Timeline & Notes</Text>
            <View style={styles.timelineContainer}>
              {timeline.map((item, idx) => {
                if (item.timelineType === 'comment') {
                  const isMe = item.userId === user?.id;
                  return (
                    <View
                      key={`c-${item.id || idx}`}
                      style={[styles.commentWrapper, isMe ? styles.commentMe : styles.commentOther]}
                    >
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUser}>
                          {isMe ? 'You' : item.user?.name || 'Unknown Handler'}
                        </Text>
                        <Text style={styles.commentTime}>
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text style={styles.commentBody}>{item.content}</Text>
                    </View>
                  );
                } else {
                  return (
                    <View key={`h-${item.id || idx}`} style={styles.historyWrapper}>
                      <Text style={styles.historyText}>
                        🔄 {item.changedBy?.name || 'System'} changed status to{' '}
                        <Text style={styles.historyHighlight}>{item.toStatus}</Text> on{' '}
                        {new Date(item.changedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  );
                }
              })}
              {timeline.length === 0 && (
                <Text style={styles.emptyTimeline}>No team chat yet.</Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Real-time comment input box */}
        <View style={[
          styles.inputContainer,
          { 
            paddingBottom: isKeyboardVisible 
              ? 12 
              : Math.max(insets.bottom, 16) + 12 
          }
        ]}>
          <TextInput
            style={styles.commentInput}
            placeholder="Post secure update note..."
            placeholderTextColor="#94a3b8"
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!newComment.trim() || commentSubmitting) && styles.sendBtnDisabled]}
            onPress={handleAddComment}
            disabled={!newComment.trim() || commentSubmitting}
          >
            {commentSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Priority selector modal */}
        <Modal
          visible={priorityModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPriorityModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Set Priority</Text>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={styles.modalOption}
                  onPress={() => handleMetadataChange('priority', p)}
                >
                  <Text style={styles.modalOptionText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Assignee selector modal */}
        <Modal
          visible={assigneeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAssigneeModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Assign Handler</Text>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleMetadataChange('assignedUserId', '')}
              >
                <Text style={[styles.modalOptionText, { color: COLORS.danger }]}>Unassigned</Text>
              </TouchableOpacity>
              {users.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.modalOption}
                  onPress={() => handleMetadataChange('assignedUserId', u.id)}
                >
                  <Text style={styles.modalOptionText}>
                    {u.name} ({u.role})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flexContainer: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 10,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  headerBlock: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeId: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  badge: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgePriority: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    color: COLORS.textDark,
  },
  badgeStatus: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    color: COLORS.primary,
  },
  subjectText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    lineHeight: 24,
  },
  metaLabelText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  metaValText: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  dateText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  editorBlock: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    gap: 10,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flex: 1,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  editBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emailBodyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  emailBodyText: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  productsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  productQty: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  timelineContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    gap: 12,
    minHeight: 120,
  },
  commentWrapper: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '85%',
  },
  commentMe: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.15)',
  },
  commentOther: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 16,
  },
  commentUser: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  commentTime: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  commentBody: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 18,
  },
  historyWrapper: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(241, 245, 249, 0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  historyHighlight: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyTimeline: {
    textAlign: 'center',
    color: COLORS.textMuted,
    paddingVertical: 32,
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: COLORS.textDark,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  sendBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
});

export default InquiryDetailsScreen;
