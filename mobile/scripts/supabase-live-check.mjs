/**
 * Exercises every Supabase function this app depends on, against the live
 * project, and prints what happened.
 *
 * Why this exists: the sandbox this repo is usually worked on from cannot
 * reach pmtgeydtqypwrypshhsx.supabase.co — the egress gateway answers 403 to
 * CONNECT for it, the same as it does for google.com. So the contracts could
 * be checked against the migrations and the function sources, but never
 * against the running project. This closes that gap by running somewhere with
 * open network: a GitHub Actions runner, triggered from a phone.
 *
 * It uses the anon key, which is a public client key already shipped inside
 * the APK and the web bundle. No secret is needed and none should be added.
 *
 * WHAT IT WRITES. To test the write paths honestly it has to write, so it
 * signs in anonymously — exactly what the app does on a fresh install — and
 * leaves behind one anonymous auth user and one profile row, the same
 * footprint as somebody installing the app and never opening it again. Every
 * question it marks done is marked undone again before it finishes, and the
 * question id is prefixed so it can be recognised. Nothing existing is
 * touched.
 *
 *   node scripts/supabase-live-check.mjs           # RPCs, RLS, ask-gemini
 *   node scripts/supabase-live-check.mjs --notes   # also the notes function
 *                                                  # (slow, spends AI quota)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pmtgeydtqypwrypshhsx.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtdGdleWR0cXlwd3J5cHNoaHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODI2NzksImV4cCI6MjA1NjQ1ODY3OX0.wp6Ydx7oMy-_sMWd6YcxMaTtnyFBg15sH_3TMPw803U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const TEST_QUESTION = `ci-check-${Date.now()} — Orbit live check, safe to delete`;
const results = [];
let failed = 0;

async function check(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push(['PASS', name, `${Date.now() - started}ms`, detail ?? '']);
  } catch (error) {
    failed += 1;
    results.push(['FAIL', name, `${Date.now() - started}ms`, String(error.message).slice(0, 160)]);
  }
}

/** Throws with the Postgres/Edge message, which is the useful part. */
function must(result, what) {
  if (result.error) {
    throw new Error(`${what}: ${result.error.message}`);
  }
  return result.data;
}

// ---- reachability ----------------------------------------------------------

await check('project reachable', async () => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  if (!response.ok) {
    throw new Error(`REST root returned ${response.status}`);
  }
  return `HTTP ${response.status}`;
});

// ---- auth ------------------------------------------------------------------

let userId = null;

await check('anonymous sign-in enabled', async () => {
  const data = must(await supabase.auth.signInAnonymously(), 'signInAnonymously');
  userId = data.user?.id ?? null;
  if (!userId) {
    throw new Error('signed in but no user id came back');
  }
  return userId;
});

// Everything below needs that session. Report clearly rather than cascading.
const signedIn = () => {
  if (!userId) {
    throw new Error('skipped — no session');
  }
};

// ---- profile ---------------------------------------------------------------

await check('claim_or_merge_profile', async () => {
  signedIn();
  const data = must(
    await supabase.rpc('claim_or_merge_profile', {
      _device_id: `ci-${userId.slice(0, 8)}`,
      _display_name: 'CI Check',
      _year: 'second',
    }),
    'claim_or_merge_profile',
  );
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) {
    throw new Error('returned no profile row');
  }
  return `year=${row.year} xp=${row.xp ?? 0}`;
});

await check('profiles: own row readable (RLS)', async () => {
  signedIn();
  const data = must(
    await supabase
      .from('profiles')
      .select('id, display_name, year, xp, streak')
      .eq('id', userId)
      .maybeSingle(),
    'select profiles',
  );
  if (!data) {
    throw new Error('own profile row not visible');
  }
  return `display_name=${data.display_name} year=${data.year}`;
});

await check('register_open (daily streak)', async () => {
  signedIn();
  const data = must(await supabase.rpc('register_open'), 'register_open');
  const row = Array.isArray(data) ? data[0] : data;
  if (typeof row?.streak !== 'number') {
    throw new Error(`expected a streak number, got ${JSON.stringify(row)}`);
  }
  return `streak=${row.streak} last_active=${row.last_active_date}`;
});

// ---- progress --------------------------------------------------------------

await check('record_question_done', async () => {
  signedIn();
  must(
    await supabase.rpc('record_question_done', { _question_id: TEST_QUESTION }),
    'record_question_done',
  );
  const rows = must(
    await supabase
      .from('question_progress')
      .select('question_id')
      .eq('user_id', userId)
      .eq('question_id', TEST_QUESTION),
    'select question_progress',
  );
  if (!rows?.length) {
    throw new Error('the row was not written — this is the silent no-op case');
  }
  return 'row written and readable';
});

await check('record_questions_done (bulk)', async () => {
  signedIn();
  const ids = [`${TEST_QUESTION}-a`, `${TEST_QUESTION}-b`];
  const added = must(
    await supabase.rpc('record_questions_done', { _question_ids: ids }),
    'record_questions_done',
  );
  // 0 with no error is the failure mode this app actually had: the RPC returns
  // 0 when the caller has no profile year, and reports nothing.
  if (added !== 2) {
    throw new Error(`expected 2 rows added, got ${added} — check profiles.year exists`);
  }
  return `added=${added}`;
});

await check('record_question_undone (cleanup)', async () => {
  signedIn();
  for (const id of [TEST_QUESTION, `${TEST_QUESTION}-a`, `${TEST_QUESTION}-b`]) {
    must(await supabase.rpc('record_question_undone', { _question_id: id }), 'undone');
  }
  const rows = must(
    await supabase
      .from('question_progress')
      .select('question_id')
      .eq('user_id', userId)
      .like('question_id', 'ci-check-%'),
    'select after cleanup',
  );
  if (rows?.length) {
    throw new Error(`${rows.length} test rows left behind`);
  }
  return 'all test rows removed';
});

// ---- leaderboards ----------------------------------------------------------

for (const rpc of ['get_weekly_leaderboard', 'get_year_leaderboard']) {
  await check(rpc, async () => {
    const data = must(await supabase.rpc(rpc, { _year: 'second', _limit: 5 }), rpc);
    if (!Array.isArray(data)) {
      throw new Error('did not return rows');
    }
    // The client reads these by name; a rename would break the screen silently.
    const wanted = rpc.startsWith('get_weekly')
      ? ['id', 'display_name', 'year', 'weekly_xp', 'streak']
      : ['id', 'display_name', 'year', 'year_xp', 'streak'];
    if (data.length > 0) {
      const missing = wanted.filter(key => !(key in data[0]));
      if (missing.length) {
        throw new Error(`missing columns the app reads: ${missing.join(', ')}`);
      }
    }
    return `${data.length} rows${data.length ? '' : ' (empty is fine)'}`;
  });
}

// ---- premium ---------------------------------------------------------------

await check('premium_subscriptions: own rows readable (RLS)', async () => {
  signedIn();
  must(
    await supabase
      .from('premium_subscriptions')
      .select('expires_at')
      .eq('user_id', userId)
      .eq('plan', 'adfree_monthly')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'select premium_subscriptions',
  );
  return 'query allowed (no row expected for a new user)';
});

// ---- edge functions --------------------------------------------------------

await check('ask-gemini: plain question', async () => {
  const { data, error } = await supabase.functions.invoke('ask-gemini', {
    body: { prompt: 'In one sentence, what is jaundice?', conversationHistory: [] },
  });
  if (error) {
    throw new Error(error.message);
  }
  if (data?.error) {
    throw new Error(`${data.error}${data.isRateLimit ? ' (rate limited)' : ''}`);
  }
  if (typeof data?.response !== 'string' || !data.response.trim()) {
    throw new Error(`no response field: ${JSON.stringify(data).slice(0, 120)}`);
  }
  return `${data.response.length} chars back`;
});

await check('ask-gemini: MCQ branch returns parseable JSON', async () => {
  const { data, error } = await supabase.functions.invoke('ask-gemini', {
    body: {
      prompt:
        'Generate exactly 3 high-yield NEET PG style MCQs on jaundice.\n\nRESPOND WITH ONLY A VALID JSON ARRAY (no prose, no markdown fences) of objects with keys: topic, question, options {A,B,C,D}, correct, explanation.',
      conversationHistory: [],
      isMCQRequest: true,
      isDoubleTap: true,
    },
  });
  if (error) {
    throw new Error(error.message);
  }
  if (data?.error) {
    throw new Error(`${data.error}${data.isRateLimit ? ' (rate limited)' : ''}`);
  }
  const text = String(data?.response ?? '');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) {
    throw new Error(`no JSON array in the reply: ${text.slice(0, 120)}`);
  }
  const items = JSON.parse(text.slice(start, end + 1));
  const usable = items.filter(
    item =>
      item?.options &&
      ['A', 'B', 'C', 'D'].every(k => typeof item.options[k] === 'string') &&
      ['A', 'B', 'C', 'D'].includes(String(item.correct).toUpperCase()),
  );
  if (usable.length === 0) {
    throw new Error(`${items.length} items back, none renderable as cards`);
  }
  return `${usable.length}/${items.length} items renderable`;
});

if (process.argv.includes('--notes')) {
  await check('generate-handwritten-notes (first batch)', async () => {
    const { data, error } = await supabase.functions.invoke('generate-handwritten-notes', {
      body: {
        subtopicKey: 'ci-check::liver',
        year: 'Second Year',
        subject: 'Pathology',
        subtopicName: 'Jaundice',
        questions: ['Discuss the aetiology and classification of jaundice.'],
        batchIndex: 0,
        batchSize: 1,
        regenerate: true,
      },
    });
    if (error) {
      // The function answers a schema violation with a 400, and the message is
      // in the body rather than the error.
      let detail = error.message;
      try {
        detail = JSON.stringify(await error.context?.json?.());
      } catch {
        // keep the original
      }
      throw new Error(String(detail).slice(0, 200));
    }
    if (data?.error) {
      throw new Error(JSON.stringify(data.error).slice(0, 200));
    }
    const sections = data?.content?.sections;
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new Error(`no sections came back: ${JSON.stringify(data).slice(0, 140)}`);
    }
    return `${sections.length} sections, types: ${[...new Set(sections.map(s => s.type))].join(', ')}`;
  });
} else {
  results.push(['SKIP', 'generate-handwritten-notes', '', 'pass --notes to include (slow, uses AI quota)']);
}

// ---- report ----------------------------------------------------------------

const width = Math.max(...results.map(r => r[1].length));
process.stdout.write('\nSupabase live check — ' + SUPABASE_URL + '\n\n');
for (const [status, name, ms, detail] of results) {
  process.stdout.write(`${status.padEnd(5)} ${name.padEnd(width)}  ${ms.padStart(7)}  ${detail}\n`);
}
process.stdout.write(
  `\n${results.filter(r => r[0] === 'PASS').length} passed, ${failed} failed, ` +
    `${results.filter(r => r[0] === 'SKIP').length} skipped\n`,
);
if (userId) {
  process.stdout.write(
    `\nLeft behind: one anonymous auth user (${userId}) and its profile row — ` +
      'the same footprint as one fresh install. No progress rows remain.\n',
  );
}
process.exitCode = failed ? 1 : 0;
