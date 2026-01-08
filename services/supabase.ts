
import { createClient } from '@supabase/supabase-js';
import { Message, Role } from '../types';

/**
 * Supabase Configuration for Suji
 * Bucket Name: 'images'
 */

const SUPABASE_URL = 'https://ywzuppeybsovxneealjr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XR0b1oYeXdwBd9KZxr0c5Q_JeaZtXEP';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const base64ToBlob = (base64Data: string): Blob => {
  const parts = base64Data.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
};

export const uploadImageToBucket = async (base64Data: string): Promise<string | null> => {
  try {
    if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;

    const blob = base64ToBlob(base64Data);
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}.png`;
    const filePath = `suji-uploads/${fileName}`;

    const { error } = await supabase.storage
      .from('images')
      .upload(filePath, blob, {
        contentType: blob.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      if (error.message.includes('security policy') || error.message.includes('RLS')) {
        console.warn("Storage upload blocked by RLS. Falling back to base64 data.");
      } else {
        console.error("Supabase Storage Error:", error.message);
      }
      return base64Data;
    }

    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (e) {
    console.error("Image upload process failed:", e);
    return base64Data;
  }
};

export const createSession = async (title: string = 'New Chat...') => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ title }])
      .select()
      .single();
    
    if (error) throw error;
    return data || { id: `local-${Date.now()}`, title, created_at: new Date().toISOString() };
  } catch (e) {
    return { id: `local-${Date.now()}`, title, created_at: new Date().toISOString() };
  }
};

export const updateSessionTitle = async (sessionId: string, title: string) => {
  if (sessionId.startsWith('local-')) return;
  try {
    await supabase.from('sessions').update({ title }).eq('id', sessionId);
  } catch (e) {}
};

export const deleteSession = async (sessionId: string) => {
  if (sessionId.startsWith('local-')) return;
  try {
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (error) throw error;
  } catch (e) {
    console.error("Delete session failed", e);
    throw e;
  }
};

export const saveMessage = async (sessionId: string, msg: Message) => {
  if (sessionId.startsWith('local-')) return null;
  try {
    const payload: any = {
      session_id: sessionId,
      role: msg.role,
      text: msg.text,
      image_data: msg.imageData,
      sources: msg.sources,
      suggestions: msg.suggestions,
      quiz_data: msg.quizData,
      is_quiz_setup: msg.isQuizSetup,
      suggested_topic: msg.suggestedTopic,
      is_bookmarked: msg.isBookmarked || false,
      is_liked: msg.isLiked || false,
      is_love_effect: msg.isLoveEffect || false,
      created_at: msg.timestamp.toISOString()
    };
    const { data, error } = await supabase.from('messages').insert([payload]).select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("Save message failed", e);
    return null;
  }
};

/**
 * Checks if a message ID is a temporary local ID or a real database ID.
 * Temporary IDs start with u-, b-, w-, e-, or local-
 */
const isTemporaryId = (id: string | number) => {
  const sId = id.toString();
  return sId.startsWith('u-') || sId.startsWith('b-') || sId.startsWith('w-') || sId.startsWith('e-') || sId.startsWith('local-');
};

export const updateMessageBookmark = async (messageId: string, isBookmarked: boolean) => {
  if (!messageId || isTemporaryId(messageId)) return;
  try {
    const { error } = await supabase.from('messages').update({ is_bookmarked: isBookmarked }).eq('id', messageId);
    if (error) throw error;
  } catch (e) {
    console.error("Bookmark update failed", e);
  }
};

export const updateMessageImageData = async (messageId: string, imageData: string) => {
  if (!messageId || isTemporaryId(messageId)) return;
  try {
    await supabase.from('messages').update({ image_data: imageData }).eq('id', messageId);
  } catch (e) {}
};

export const fetchBookmarkedMessages = async (): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('is_bookmarked', true)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(row => ({
      id: row.id,
      role: row.role as Role,
      text: row.text,
      timestamp: new Date(row.created_at),
      imageData: row.image_data,
      sources: row.sources,
      suggestions: row.suggestions,
      quizData: row.quiz_data,
      isQuizSetup: row.is_quiz_setup,
      suggestedTopic: row.suggested_topic,
      isBookmarked: row.is_bookmarked,
      isLiked: row.is_liked,
      isLoveEffect: row.is_love_effect,
      session_id: row.session_id
    }));
  } catch (e) { return []; }
};

export const fetchMessagesBySession = async (sessionId: string): Promise<Message[]> => {
  if (sessionId.startsWith('local-')) return [];
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return (data || []).map(row => ({
      id: row.id,
      role: row.role as Role,
      text: row.text,
      timestamp: new Date(row.created_at),
      imageData: row.image_data,
      sources: row.sources,
      suggestions: row.suggestions,
      quizData: row.quiz_data,
      isQuizSetup: row.is_quiz_setup,
      suggestedTopic: row.suggested_topic,
      isBookmarked: row.is_bookmarked,
      isLiked: row.is_liked,
      isLoveEffect: row.is_love_effect,
      session_id: row.session_id
    }));
  } catch (e) { return []; }
};

export const fetchSessions = async () => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  } catch (e) { return []; }
};

export const saveQuizResult = async (topic: string, score: number, total: number) => {
  try {
    await supabase.from('quiz_results').insert([{ topic, score, total, created_at: new Date().toISOString() }]);
  } catch (e) {}
};
