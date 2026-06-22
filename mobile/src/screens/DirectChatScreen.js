import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { onSocketEvent, offSocketEvent, emitSocketEvent } from '../services/socket';
import { COLORS } from '../utils/theme';

const DirectChatScreen = ({ route, navigation }) => {
  const { user: otherUser } = route.params;
  const { user: currentUser, setActiveChatUser } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    console.log('[DirectChatScreen] Safe Area Insets:', insets);
  }, [insets]);

  // Fetch direct messages history
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/chat/messages/${otherUser.id}`);
      setMessages(response.data || []);
    } catch (error) {
      console.error('[Direct Chat Screen] Error fetching message history:', error.message);
    } finally {
      setLoading(false);
    }
  }, [otherUser.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Set active chat user and handle real-time socket events
  useEffect(() => {
    setActiveChatUser(otherUser.id);

    const handleReceiveMessage = (message) => {
      if (!message) return;
      
      const isRelevant =
        (message.senderId === otherUser.id && message.receiverId === currentUser?.id) ||
        (message.senderId === currentUser?.id && message.receiverId === otherUser.id);

      if (isRelevant) {
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    };

    onSocketEvent('receive_direct_message', handleReceiveMessage);

    return () => {
      setActiveChatUser(null);
      offSocketEvent('receive_direct_message', handleReceiveMessage);
    };
  }, [otherUser.id, currentUser, setActiveChatUser]);

  // Auto scroll to bottom and track keyboard visibility
  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const content = inputText.trim();
    
    // Clear input immediately to make UI feel instant
    setInputText('');
    
    emitSocketEvent('send_direct_message', {
      receiverId: otherUser.id,
      content: content,
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const renderMessageItem = ({ item, index }) => {
    const isMe = item.senderId === currentUser?.id;
    const prevItem = index > 0 ? messages[index - 1] : null;
    
    // Determine whether to show date header
    const showDateHeader = !prevItem || 
      new Date(item.createdAt).toDateString() !== new Date(prevItem.createdAt).toDateString();

    return (
      <View>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{formatDate(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperOther]}>
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
              {item.content}
            </Text>
            <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Fetching encrypted chat history...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id || Math.random().toString()}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>Encrypted Channel</Text>
                <Text style={styles.emptyText}>
                  Messages sent here are end-to-end encrypted with the server using AES-256-CBC.
                </Text>
              </View>
            }
          />
        )}

        <View style={[
          styles.inputContainer,
          { 
            paddingBottom: isKeyboardVisible 
              ? 8 
              : Math.max(insets.bottom, 16) + 12 
          }
        ]}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.sendButtonText}>➔</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 15,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 14,
  },
  dateHeaderText: {
    fontSize: 11,
    color: COLORS.textMuted,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    fontWeight: '600',
  },
  bubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 8,
    width: '100%',
  },
  bubbleWrapperMe: {
    justifyContent: 'flex-end',
  },
  bubbleWrapperOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 1,
    elevation: 0.5,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: COLORS.white,
  },
  messageTextOther: {
    color: COLORS.textDark,
  },
  timeText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeTextOther: {
    color: COLORS.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 100,
    color: COLORS.textDark,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DirectChatScreen;
