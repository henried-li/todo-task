const STATE_KEY = "state";

const DEFAULT_TYPES = [
  { id: "work",     name: "Work",     color: "#3B82F6" },
  { id: "personal", name: "Personal", color: "#10B981" },
  { id: "errand",   name: "Errand",   color: "#F59E0B" }
];

function defaultState() {
  return {
    tasks: [],
    types: DEFAULT_TYPES.slice(),
    settings: { theme: "auto", lastTypeId: "work" }
  };
}

function startOfLocalToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function purgeOldDone(state, cutoffMs = startOfLocalToday()) {
  state.tasks = state.tasks.filter(
    t => !(t.done && t.doneAt && new Date(t.doneAt).getTime() < cutoffMs)
  );
  return state;
}

export async function loadState() {
  const got = await chrome.storage.sync.get(STATE_KEY);
  const raw = got[STATE_KEY];
  const state = raw && typeof raw === "object" ? raw : defaultState();
  if (!state.tasks) state.tasks = [];
  if (!state.types || state.types.length === 0) state.types = DEFAULT_TYPES.slice();
  if (!state.settings) state.settings = { theme: "auto", lastTypeId: state.types[0].id };
  return purgeOldDone(state);
}

export async function saveState(state) {
  await chrome.storage.sync.set({ [STATE_KEY]: state });
}

export function subscribe(cb) {
  const listener = (changes, area) => {
    if (area === "sync" && changes[STATE_KEY]) {
      cb(changes[STATE_KEY].newValue);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
