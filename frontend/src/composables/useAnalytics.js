/**
 * 用户行为埋点 composable
 * 用于追踪用户行为，支持页面访问、点击、操作等事件
 */

import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { analyticsAPI } from '@/api';

const eventQueue = ref([]);
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 5000;
let batchTimer = null;
let initialized = false;
let beforeUnloadBound = false;

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

const flushEvents = async () => {
  if (eventQueue.value.length === 0) return;

  const events = [...eventQueue.value];
  eventQueue.value = [];

  try {
    await analyticsAPI.trackEvents(events);
  } catch (error) {
    console.warn('[Analytics] 批量上报失败:', error);
    eventQueue.value = [...events, ...eventQueue.value];
  }
};

const startBatchTimer = () => {
  if (batchTimer) return;
  batchTimer = setInterval(flushEvents, BATCH_INTERVAL);
};

const stopBatchTimer = () => {
  if (!batchTimer) return;
  clearInterval(batchTimer);
  batchTimer = null;
};

const bindBeforeUnload = () => {
  if (beforeUnloadBound || typeof window === 'undefined') return;
  beforeUnloadBound = true;
  window.addEventListener('beforeunload', () => {
    if (eventQueue.value.length === 0) return;
    const data = JSON.stringify({ events: eventQueue.value });
    navigator.sendBeacon('/api/analytics/events', data);
  });
};

export function useAnalytics() {
  const route = useRoute();
  const sessionId = getSessionId();

  const queueEvent = (event) => {
    eventQueue.value.push({
      ...event,
      sessionId,
    });

    if (eventQueue.value.length >= BATCH_SIZE) {
      flushEvents();
    }
  };

  const trackPageView = (page = null) => {
    queueEvent({
      eventType: 'page_view',
      eventName: 'page_view',
      page: page || route?.path || window.location.pathname,
    });
  };

  const trackClick = (component, action, metadata = null) => {
    queueEvent({
      eventType: 'click',
      eventName: `${component}_${action}`,
      page: route?.path || window.location.pathname,
      metadata,
    });
  };

  const trackAction = (name, metadata = null) => {
    queueEvent({
      eventType: 'action',
      eventName: name,
      page: route?.path || window.location.pathname,
      metadata,
    });
  };

  const trackError = (error, context = null) => {
    queueEvent({
      eventType: 'error',
      eventName: 'error',
      page: route?.path || window.location.pathname,
      metadata: { error, context },
    });
  };

  onMounted(() => {
    bindBeforeUnload();
    startBatchTimer();
  });

  onUnmounted(() => {
    flushEvents();
  });

  return {
    trackPageView,
    trackClick,
    trackAction,
    trackError,
    flushEvents,
  };
}

export function initAnalytics(router) {
  if (initialized) return;
  initialized = true;

  bindBeforeUnload();
  startBatchTimer();

  router.afterEach((to) => {
    const sessionId = getSessionId();
    eventQueue.value.push({
      sessionId,
      eventType: 'page_view',
      eventName: 'page_view',
      page: to.path,
      metadata: {
        name: to.name,
        query: to.query,
      },
    });
  });
}

export default useAnalytics;
