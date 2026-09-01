/**
 * CLES Common Storage Specification
 * Schema: cles-user-data / 1.0
 *
 * Question content lives in data.json.
 * User learning data lives in a stable localStorage namespace and can be
 * exported/imported independently of app releases.
 */
const CLESStorage = (() => {
  const KEY = 'cles.userdata.v1';
  const SCHEMA = 'cles-user-data';
  const SCHEMA_VERSION = '1.0';

  const LEGACY_LOG_KEYS = [
    'clesv1logs',
    'cles_v1_logs',
    'clesThinkVs5Logs'
  ];

  const LEGACY_STATE_KEYS = {
    idx: ['clesv1idx'],
    order: ['clesv1order'],
    sessionOrder: ['clesv1sessionOrder', 'cles_v1_sessionOrder'],
    sessionPos: ['clesv1sessionPos', 'cles_v1_sessionPos'],
    sessionId: ['clesv1activeSession', 'cles_v1_sessionId'],
    lastWeak: ['clesv1lastWeak', 'cles_v1_lastWeak']
  };

  function emptyData() {
    return {
      schema: SCHEMA,
      schema_version: SCHEMA_VERSION,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      logs: [],
      state: {},
      migrations: []
    };
  }

  function safeParse(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }

  function normalizeLog(log) {
    if (!log || typeof log !== 'object') return null;
    return {
      ...log,
      ts: log.ts || new Date().toISOString(),
      session_id: log.session_id || log.sessionId || '',
      item_id: log.item_id || log.id || '',
      correct_answer: log.correct_answer || log.type || '',
      mastery_score: Number(log.mastery_score ?? log.mastery ?? 0)
    };
  }

  function dedupeLogs(logs) {
    const seen = new Set();
    return logs.filter(Boolean).filter(log => {
      const key = [
        log.ts || '',
        log.session_id || '',
        log.item_id || '',
        log.answer || '',
        log.time_sec ?? ''
      ].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function migrateLegacy() {
    const data = emptyData();
    let migrated = false;
    const foundLogs = [];

    LEGACY_LOG_KEYS.forEach(key => {
      const value = safeParse(localStorage.getItem(key), []);
      if (Array.isArray(value) && value.length) {
        value.forEach(x => foundLogs.push(normalizeLog(x)));
        data.migrations.push({ from: key, at: new Date().toISOString() });
        migrated = true;
      }
    });

    Object.entries(LEGACY_STATE_KEYS).forEach(([target, keys]) => {
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        data.state[target] = ['order', 'sessionOrder'].includes(target)
          ? safeParse(raw, [])
          : raw;
        data.migrations.push({ from: key, to: target, at: new Date().toISOString() });
        migrated = true;
        break;
      }
    });

    data.logs = dedupeLogs(foundLogs);
    if (migrated) {
      data.updated_at = new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(data));
    }
    return migrated ? data : null;
  }

  function load() {
    let data = safeParse(localStorage.getItem(KEY), null);
    if (!data) data = migrateLegacy() || emptyData();

    data.schema = SCHEMA;
    data.schema_version = SCHEMA_VERSION;
    data.logs = dedupeLogs((Array.isArray(data.logs) ? data.logs : []).map(normalizeLog));
    data.state = data.state && typeof data.state === 'object' ? data.state : {};
    data.migrations = Array.isArray(data.migrations) ? data.migrations : [];
    return data;
  }

  function save(payload) {
    const current = load();
    const next = {
      ...current,
      schema: SCHEMA,
      schema_version: SCHEMA_VERSION,
      updated_at: new Date().toISOString(),
      logs: dedupeLogs((payload.logs || current.logs || []).map(normalizeLog)),
      state: { ...current.state, ...(payload.state || {}) }
    };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  function clearUserData() {
    const next = emptyData();
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  function exportBundle(meta = {}) {
    const data = load();
    return {
      schema: SCHEMA,
      schema_version: SCHEMA_VERSION,
      exported_at: new Date().toISOString(),
      app_version: meta.appVersion || '',
      question_bank_version: meta.questionBankVersion || '',
      user_data: data
    };
  }

  function importBundle(input) {
    let source = input;

    // Current common backup format
    if (source && source.schema === SCHEMA && source.user_data) {
      source = source.user_data;
    }

    // Direct canonical user data
    if (source && source.schema === SCHEMA && Array.isArray(source.logs)) {
      const current = load();
      const merged = {
        ...current,
        ...source,
        schema: SCHEMA,
        schema_version: SCHEMA_VERSION,
        logs: dedupeLogs([
          ...(current.logs || []),
          ...(source.logs || []).map(normalizeLog)
        ]),
        state: { ...current.state, ...(source.state || {}) },
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(KEY, JSON.stringify(merged));
      return { logCount: merged.logs.length, format: 'canonical' };
    }

    // Old JSON export was often a raw array of log rows.
    if (Array.isArray(source)) {
      const current = load();
      const mergedLogs = dedupeLogs([
        ...(current.logs || []),
        ...source.map(normalizeLog)
      ]);
      save({ logs: mergedLogs, state: current.state });
      return { logCount: mergedLogs.length, format: 'legacy-array' };
    }

    // Some previous tools exported {logs:[...], state:{...}}
    if (source && Array.isArray(source.logs)) {
      const current = load();
      const mergedLogs = dedupeLogs([
        ...(current.logs || []),
        ...source.logs.map(normalizeLog)
      ]);
      save({ logs: mergedLogs, state: { ...current.state, ...(source.state || {}) } });
      return { logCount: mergedLogs.length, format: 'legacy-object' };
    }

    throw new Error('Unsupported CLES backup format');
  }

  return {
    key: KEY,
    schema: SCHEMA,
    schemaVersion: SCHEMA_VERSION,
    load,
    save,
    clearUserData,
    exportBundle,
    importBundle
  };
})();
