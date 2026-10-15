const config = window.BLUEBERRY_SUPABASE_CONFIG;
const notice = document.querySelector("#notice");
const authPanel = document.querySelector("#auth-panel");
const accountPanel = document.querySelector("#account-panel");
const authForm = document.querySelector("#auth-form");
const signinTab = document.querySelector("#signin-tab");
const signupTab = document.querySelector("#signup-tab");
const displayNameField = document.querySelector("#display-name-field");
const authSubmit = document.querySelector("#auth-submit");
const setupGuide = document.querySelector("#setup-guide");
const profileForm = document.querySelector("#profile-form");
const historyEnabledInput = document.querySelector("#history-enabled");
const historyStatus = document.querySelector("#history-status");
const historyList = document.querySelector("#history-list");

let client;
let mode = "signin";
let currentUser;
const historyPreferenceKey = "blueberryub.history-enabled";

function showNotice(message, kind = "info") {
  notice.textContent = message;
  notice.dataset.kind = kind;
  notice.hidden = !message;
}

function setMode(nextMode) {
  mode = nextMode;
  const signingUp = mode === "signup";
  signinTab.classList.toggle("is-active", !signingUp);
  signupTab.classList.toggle("is-active", signingUp);
  signinTab.setAttribute("aria-selected", String(!signingUp));
  signupTab.setAttribute("aria-selected", String(signingUp));
  displayNameField.hidden = !signingUp;
  document.querySelector("#password").autocomplete = signingUp ? "new-password" : "current-password";
  authSubmit.textContent = signingUp ? "Create account" : "Sign in";
  showNotice("");
}

function setBusy(busy) {
  for (const button of authForm.querySelectorAll("button")) button.disabled = busy;
}

function isMissingProfilesTable(error) {
  return error?.code === "PGRST205" || error?.code === "42P01" ||
    (error?.message || "").includes("public.profiles") && (error?.message || "").includes("schema cache");
}

function historyTableMissing(error) {
  return error?.code === "PGRST205" || error?.code === "42P01" ||
    (error?.message || "").includes("browser_history") && (error?.message || "").includes("schema cache");
}

async function loadHistory(userId) {
  historyStatus.textContent = "Loading history…";
  const { data, error } = await client
    .from("browser_history")
    .select("id, url, title, visited_at")
    .eq("user_id", userId)
    .order("visited_at", { ascending: false })
    .limit(100);

  historyList.replaceChildren();
  if (error) {
    historyStatus.textContent = historyTableMissing(error)
      ? "Run the history migration from Supabase SQL Editor to enable browsing history."
      : "Could not load browsing history.";
    return;
  }

  if (!data?.length) {
    historyStatus.textContent = "No saved visits yet.";
    return;
  }

  historyStatus.textContent = `${data.length} recent visits`;
  for (const visit of data) {
    const item = document.createElement("a");
    item.className = "history-item";
    item.href = `/browser.html?goto=${encodeURIComponent(visit.url)}`;
    const details = document.createElement("span");
    details.className = "history-item-details";
    const title = document.createElement("strong");
    title.textContent = visit.title || new URL(visit.url).hostname;
    const url = document.createElement("span");
    url.textContent = visit.url;
    details.append(title, url);
    const time = document.createElement("time");
    time.dateTime = visit.visited_at;
    time.textContent = new Date(visit.visited_at).toLocaleString();
    item.append(details, time);
    historyList.append(item);
  }
}

async function renderAccount(user) {
  currentUser = user;
  authPanel.hidden = true;
  accountPanel.hidden = false;
  document.querySelector("#account-email").textContent = user.email || "";

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("display_name, history_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    if (isMissingProfilesTable(profileError)) {
      setupGuide.hidden = false;
      profileForm.hidden = true;
      showNotice("Your account signed in, but the BlueberryUB tables have not been created yet.", "error");
      return;
    }
    showNotice(profileError.message || "Could not load your profile.", "error");
    return;
  }

  setupGuide.hidden = true;
  profileForm.hidden = false;

  const name = profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Blueberry member";
  document.querySelector("#account-name").textContent = name;
  document.querySelector("#profile-display-name").value = profile?.display_name || "";
  historyEnabledInput.checked = profile?.history_enabled !== false;
  localStorage.setItem(historyPreferenceKey, String(historyEnabledInput.checked));
  await loadHistory(user.id);
}

async function refreshSession() {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (data.session?.user) await renderAccount(data.session.user);
  else {
    currentUser = null;
    accountPanel.hidden = true;
    authPanel.hidden = false;
  }
}

signinTab.addEventListener("click", () => setMode("signin"));
signupTab.addEventListener("click", () => setMode("signup"));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true);
  showNotice("");
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;
  try {
    if (mode === "signup") {
      const displayName = document.querySelector("#display-name").value.trim();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/profile.html`,
        },
      });
      if (error) throw error;
      if (data.session?.user) await renderAccount(data.session.user);
      else showNotice("Check your email to confirm your account, then sign in.", "success");
    } else {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await renderAccount(data.user);
    }
  } catch (error) {
    showNotice(error.message || "Authentication failed.", "error");
  } finally {
    setBusy(false);
  }
});

document.querySelector("#signout-button").addEventListener("click", async () => {
  const { error } = await client.auth.signOut();
  if (error) showNotice(error.message, "error");
  else {
    showNotice("Signed out.", "success");
    await refreshSession();
  }
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;
  const displayName = document.querySelector("#profile-display-name").value.trim();
  const { error } = await client.from("profiles").update({ display_name: displayName }).eq("user_id", currentUser.id);
  showNotice(error ? error.message : "Profile saved.", error ? "error" : "success");
  if (!error) document.querySelector("#account-name").textContent = displayName || currentUser.email?.split("@")[0] || "Blueberry member";
});

document.querySelector("#delete-account-button").addEventListener("click", async () => {
  if (!currentUser || !window.confirm("Permanently delete your BlueberryUB account? This cannot be undone.")) return;
  try {
    const { error } = await client.functions.invoke("delete-account", { body: {} });
    if (error) throw error;
    await client.auth.signOut();
    currentUser = null;
    accountPanel.hidden = true;
    localStorage.removeItem(historyPreferenceKey);
    authPanel.hidden = false;
    showNotice("Your account has been deleted.", "success");
  } catch (error) {
    showNotice(error.message || "Account deletion failed.", "error");
  }
});

historyEnabledInput.addEventListener("change", async () => {
  if (!currentUser) return;
  const enabled = historyEnabledInput.checked;
  const { error } = await client.from("profiles").update({ history_enabled: enabled }).eq("user_id", currentUser.id);
  if (error) {
    historyEnabledInput.checked = !enabled;
    historyStatus.textContent = error.message || "Could not update history setting.";
    return;
  }
  localStorage.setItem(historyPreferenceKey, String(enabled));
  historyStatus.textContent = enabled ? "History saving is on." : "History saving is paused.";
});

document.querySelector("#clear-history-button").addEventListener("click", async () => {
  if (!currentUser || !window.confirm("Clear all browsing history saved to this account?")) return;
  const { error } = await client.from("browser_history").delete().eq("user_id", currentUser.id);
  if (error) {
    historyStatus.textContent = error.message || "Could not clear history.";
    return;
  }
  await loadHistory(currentUser.id);
});

async function initialize() {
  if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) {
    authPanel.hidden = true;
    showNotice("Supabase is not configured. Check the local server environment.", "error");
    return;
  }

  client = window.supabase.createClient(config.url, config.publishableKey);
  try {
    await refreshSession();
    client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (session?.user) void renderAccount(session.user);
        else {
          currentUser = null;
          accountPanel.hidden = true;
          localStorage.removeItem(historyPreferenceKey);
          authPanel.hidden = false;
        }
      }, 0);
    });
  } catch (error) {
    showNotice(error.message || "Could not connect to Supabase.", "error");
  }
}

void initialize();