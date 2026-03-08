import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = (characterMode, ocName, ocAppearance, ocPersonality) => `
You are the narrator and game master of "Gojo Simulator," an immersive text-based RPG set in the Jujutsu Kaisen universe. You have deep, encyclopedic knowledge of the JJK manga and anime — characters, lore, cursed techniques, sorcerer rankings, missions, relationships, and key story arcs.

**PLAYER CHARACTER:**
${characterMode === "gojo"
  ? `The player IS Satoru Gojo — the strongest sorcerer, holder of the Six Eyes and Limitless technique. They experience his life: his youth at Tokyo Jujutsu High, his friendship with Suguru Geto, the Star Plasma Vessel mission (Haibara, Nanami era), the moment he awakened to Infinity during the Time Vessel Association attack, becoming a teacher, his relationships with his students (Itadori, Megumi, Nobara), his rivalry with Toji Fushiguro, and the ongoing battle against cursed spirits and the higher-ups.`
  : `The player is an original character named **${ocName || "Unknown"}** who holds the same powers as Satoru Gojo — the Six Eyes and the Limitless cursed technique (Infinity, Red, Blue, Purple). They live Gojo's story and go through the same events and arcs, but they are NOT Gojo — they have their own appearance (${ocAppearance || "unspecified"}) and their own personality (${ocPersonality || "unspecified"}). Refer to them by their name, not as Gojo. Other characters in the story react to them as a separate person who simply wields the same overwhelming power. Their personality and appearance should subtly color how scenes are described and how NPCs interact with them.`}

**YOUR ROLE:**
- Narrate the story in vivid, atmospheric prose — like a manga brought to life
- Present the player with **2-4 numbered choices** at key decision points
- Honor canon events but allow the player's choices to create branching outcomes
- React to player decisions with consequences that feel real and weighty
- Write Gojo's dialogue in his signature voice: cocky, playful, genius-level confident, but with surprising depth and loyalty
- Include sensory detail — the feeling of cursed energy, the visual spectacle of Limitless, the weight of sorcerer life
- Keep a sense of story momentum — always push toward the next scene or choice
- Use dramatic manga-style scene transitions occasionally (e.g., "— Three days later —")
- Track story context: remember what choices the player has made in this session

**TONE:** Dark, thrilling, emotionally resonant, occasionally humorous (Gojo's influence). Balance action with character moments. This is shonen at its peak.

**FORMATTING:**
- Use **bold** for character names and technique names
- Use *italics* for inner thoughts or atmosphere
- End each message with numbered choices OR a prompt for the player's action
- Keep responses focused and punchy — 150-300 words per response is ideal

Begin the story when prompted. Set the scene dramatically.
`;

const OPENING_SCENE = (characterMode, ocName, ocAppearance, ocPersonality) => ({
  role: "user",
  content: characterMode === "gojo"
    ? "Start the story. I am Satoru Gojo. Begin at Tokyo Jujutsu High — my first year as a student."
    : `Start the story. I am ${ocName || "an unnamed sorcerer"} — I have the Six Eyes and the Limitless, just like Gojo would have, but I am my own person. My appearance: ${ocAppearance || "unspecified"}. My personality: ${ocPersonality || "unspecified"}. Begin at Tokyo Jujutsu High — my first year as a student.`
});

const PROVIDERS = {
  artifact: {
    label: "Claude",
    sublabel: "No key needed",
    note: "Only works inside claude.ai",
    icon: "◆",
    color: "#d4a96a",
    free: true,
    needsKey: false,
  },
  claude: {
    label: "Claude API",
    sublabel: "Best quality",
    note: "Get key at console.anthropic.com",
    placeholder: "sk-ant-...",
    icon: "◆",
    color: "#d4a96a",
    free: false,
    needsKey: true,
  },
  geminiFlash: {
    label: "Gemini 2.5 Flash",
    sublabel: "Free · Great quality",
    note: "Get key at aistudio.google.com",
    placeholder: "AIza...",
    icon: "✦",
    color: "#4285f4",
    free: true,
    needsKey: true,
    model: "gemini-2.5-flash",
    dailyLimit: 250,
  },
  geminiPro: {
    label: "Gemini 2.5 Pro",
    sublabel: "Free · Best quality",
    note: "Get key at aistudio.google.com",
    placeholder: "AIza...",
    icon: "✦",
    color: "#a78bfa",
    free: true,
    needsKey: true,
    model: "gemini-2.5-pro",
    dailyLimit: 100,
  },
  groq: {
    label: "Groq · Llama 3.3",
    sublabel: "Free · Very fast",
    note: "Get key at console.groq.com",
    placeholder: "gsk_...",
    icon: "⚡",
    color: "#f97316",
    free: true,
    needsKey: true,
  },
};

const STAGES = {
  PROVIDER_SELECT: "provider_select",
  API_KEY: "api_key",
  SETUP: "setup",
  CHARACTER_SELECT: "character_select",
  OC_CREATION: "oc_creation",
  PLAYING: "playing",
};

export default function GojoSimulator() {
  const [stage, setStage] = useState(STAGES.PROVIDER_SELECT);
  const [provider, setProvider] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [characterMode, setCharacterMode] = useState(null);
  const [ocName, setOcName] = useState("");
  const [ocAppearance, setOcAppearance] = useState("");
  const [ocPersonality, setOcPersonality] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [geminiRequestCounts, setGeminiRequestCounts] = useState({ geminiFlash: 0, geminiPro: 0 });
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const exportChat = () => {
    const saveData = {
      version: 1,
      provider,
      characterMode,
      ocName, ocAppearance, ocPersonality,
      messages,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const charLabel = characterMode === "gojo" ? "gojo" : (ocName || "oc").toLowerCase().replace(/\s+/g, "-");
    a.href = url;
    a.download = `gojo-sim-${charLabel}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importChat = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.messages || !data.characterMode) throw new Error("Invalid save file.");
        setCharacterMode(data.characterMode);
        setOcName(data.ocName || "");
        setOcAppearance(data.ocAppearance || "");
        setOcPersonality(data.ocPersonality || "");
        setMessages(data.messages);
        setStage(STAGES.PLAYING);
      } catch {
        alert("Couldn't load that file — it may be corrupted or from a different app.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleProviderSelect = (p) => {
    setProvider(p);
    setApiKey("");
    setApiKeyInput("");
    setApiKeyError("");
    if (!PROVIDERS[p].needsKey) {
      setStage(STAGES.SETUP);
    } else {
      setStage(STAGES.API_KEY);
    }
  };

  const validateApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    setApiKeyLoading(true);
    setApiKeyError("");
    try {
      let res;
      if (provider === "claude") {
        res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKeyInput.trim(), "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 10, messages: [{ role: "user", content: "hi" }] }),
        });
      } else if (provider === "geminiFlash" || provider === "geminiPro") {
        const modelName = PROVIDERS[provider].model;
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyInput.trim()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] }),
        });
      } else if (provider === "groq") {
        res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKeyInput.trim()}` },
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 10, messages: [{ role: "user", content: "hi" }] }),
        });
      }
      if (res.status === 400 || res.status === 200) {
        setApiKey(apiKeyInput.trim());
        setStage(STAGES.SETUP);
      } else if (res.status === 401 || res.status === 403) {
        setApiKeyError("Invalid API key. Double-check and try again.");
      } else {
        setApiKey(apiKeyInput.trim());
        setStage(STAGES.SETUP);
      }
    } catch {
      setApiKeyError("Couldn't connect. Check your internet and try again.");
    } finally {
      setApiKeyLoading(false);
    }
  };

  const startGame = async () => {
    setStage(STAGES.PLAYING);
    setLoading(true);
    const openingMsg = OPENING_SCENE(characterMode, ocName, ocAppearance, ocPersonality);
    await sendToAPI([openingMsg], []);
  };

  const sendToAPI = async (newMessages, existingMessages) => {
    const allMessages = [...existingMessages, ...newMessages];
    setLoading(true);
    const systemPrompt = SYSTEM_PROMPT(characterMode, ocName, ocAppearance, ocPersonality);

    // Check client-side Gemini limit before even calling
    if ((provider === "geminiFlash" || provider === "geminiPro") && geminiRequestCounts[provider] >= PROVIDERS[provider].dailyLimit) {
      setMessages([...allMessages, { role: "assistant", content: `*The Six Eyes flicker and dim.* You've hit the daily request limit for ${PROVIDERS[provider].label} (${PROVIDERS[provider].dailyLimit}/day). It resets at midnight Pacific time. Try switching to a different model.` }]);
      setLoading(false);
      return;
    }

    try {
      let reply = "";

      if (provider === "artifact") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: systemPrompt, messages: allMessages }),
        });
        const data = await res.json();
        reply = data.content?.map(b => b.text || "").join("") || "The cursed energy fluctuates... something went wrong.";

      } else if (provider === "claude") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: systemPrompt, messages: allMessages }),
        });
        const data = await res.json();
        reply = data.content?.map(b => b.text || "").join("") || "The cursed energy fluctuates... something went wrong.";

      } else if (provider === "geminiFlash" || provider === "geminiPro") {
        const modelName = PROVIDERS[provider].model;
        const geminiContents = allMessages.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: geminiContents,
            generationConfig: { maxOutputTokens: 1000 },
          }),
        });
        if (res.status === 429) {
          reply = `*The Six Eyes flicker and dim.* You've hit the daily request limit for ${PROVIDERS[provider].label} (${PROVIDERS[provider].dailyLimit}/day). It resets at midnight Pacific time. Try switching to a different model.`;
        } else {
          const data = await res.json();
          reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "The cursed energy fluctuates... something went wrong.";
          // Only increment on success
          setGeminiRequestCounts(prev => ({ ...prev, [provider]: prev[provider] + 1 }));
        }

      } else if (provider === "groq") {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 1000,
            messages: [{ role: "system", content: systemPrompt }, ...allMessages],
          }),
        });
        const data = await res.json();
        reply = data.choices?.[0]?.message?.content || "The cursed energy fluctuates... something went wrong.";
      }

      setMessages([...allMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...allMessages, { role: "assistant", content: "*The veil between worlds flickers.* An error disrupted the cursed energy flow. Try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setInput("");
    await sendToAPI([userMsg], messages);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const renderMarkdown = (text) =>
    text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/\n/g, "<br/>");

  const fullReset = () => {
    setStage(STAGES.PROVIDER_SELECT);
    setProvider(null);
    setApiKey(""); setApiKeyInput(""); setApiKeyError("");
    setMessages([]); setCharacterMode(null);
    setOcName(""); setOcAppearance(""); setOcPersonality("");
    setGeminiRequestCounts({ geminiFlash: 0, geminiPro: 0 });
  };

  const providerInfo = provider ? PROVIDERS[provider] : null;

  // ── PROVIDER SELECT ──
  if (stage === STAGES.PROVIDER_SELECT) {
    return (
      <div style={styles.root}>
        <div style={styles.particles}>
          {[...Array(20)].map((_, i) => <div key={i} style={{ ...styles.particle, ...getParticleStyle(i) }} />)}
        </div>
        <div style={styles.setupContainer}>
          <div style={styles.eyeGlow} />
          <div style={styles.logoArea}>
            <div style={styles.logoEye}>∞</div>
            <h1 style={styles.logoTitle}>GOJO SIMULATOR</h1>
            <p style={styles.logoSub}>A Jujutsu Kaisen RPG Experience</p>
          </div>
          <h2 style={{ ...styles.sectionTitle, fontSize: "16px", marginBottom: "8px" }}>CHOOSE YOUR AI</h2>
          <p style={styles.setupDesc}>Each option uses a different model. Free options just need a free account signup.</p>
          <div style={styles.providerGrid}>
            {Object.entries(PROVIDERS).map(([key, p]) => (
              <button key={key} style={styles.providerCard} onClick={() => handleProviderSelect(key)}>
                <div style={{ ...styles.providerIcon, color: p.color }}>{p.icon}</div>
                <div style={styles.providerName}>{p.label}</div>
                <div style={styles.providerSub}>{p.sublabel}</div>
                <div style={{ ...styles.providerBadge, background: p.free ? "rgba(40,120,60,0.3)" : "rgba(120,80,20,0.3)", borderColor: p.free ? "#2a6a3a" : "#8a5a1a", color: p.free ? "#6ad48a" : "#d4a96a" }}>
                  {p.free ? "FREE" : "PAID"}
                </div>
                {p.dailyLimit && (
                  <div style={styles.dailyLimitNote}>
                    {p.dailyLimit} requests/day · resets daily
                  </div>
                )}
              </button>
            ))}
          </div>
          <div style={styles.importRow}>
            <span style={styles.importLabel}>Have a saved run?</span>
            <button style={styles.ghostBtn} onClick={() => importRef.current?.click()}>
              LOAD SAVE →
            </button>
            <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={importChat} />
          </div>
        </div>
      </div>
    );
  }

  // ── API KEY SCREEN ──
  if (stage === STAGES.API_KEY && providerInfo) {
    return (
      <div style={styles.root}>
        <div style={styles.setupContainer}>
          <div style={{ ...styles.logoEye, fontSize: "40px", marginBottom: "8px", color: providerInfo.color }}>{providerInfo.icon}</div>
          <h2 style={styles.sectionTitle}>{providerInfo.label.toUpperCase()}</h2>
          <p style={styles.setupDesc}>Enter your API key to continue. It stays in your browser only.</p>
          <div style={styles.formGroup}>
            <label style={styles.label}>API KEY</label>
            <input
              style={styles.textInput}
              type="password"
              placeholder={providerInfo.placeholder}
              value={apiKeyInput}
              onChange={e => { setApiKeyInput(e.target.value); setApiKeyError(""); }}
              onKeyDown={e => e.key === "Enter" && validateApiKey()}
              autoFocus
            />
            {apiKeyError && <div style={styles.apiKeyError}>{apiKeyError}</div>}
          </div>
          <p style={styles.apiKeyHint}>{providerInfo.note}</p>
          <div style={styles.btnRow}>
            <button style={styles.ghostBtn} onClick={() => setStage(STAGES.PROVIDER_SELECT)}>← Back</button>
            <button
              style={{ ...styles.primaryBtn, opacity: (!apiKeyInput.trim() || apiKeyLoading) ? 0.5 : 1 }}
              onClick={validateApiKey}
              disabled={!apiKeyInput.trim() || apiKeyLoading}
            >
              {apiKeyLoading ? "VERIFYING..." : "CONFIRM →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SETUP SCREEN ──
  if (stage === STAGES.SETUP) {
    return (
      <div style={styles.root}>
        <div style={styles.particles}>
          {[...Array(20)].map((_, i) => <div key={i} style={{ ...styles.particle, ...getParticleStyle(i) }} />)}
        </div>
        <div style={styles.setupContainer}>
          <div style={styles.eyeGlow} />
          <div style={styles.logoArea}>
            <div style={styles.logoEye}>∞</div>
            <h1 style={styles.logoTitle}>GOJO SIMULATOR</h1>
            <p style={styles.logoSub}>A Jujutsu Kaisen RPG Experience</p>
          </div>
          <p style={styles.setupDesc}>
            Step into the world of Jujutsu sorcery. Relive the life of the strongest — or carve your own path beside him.
          </p>
          <div style={styles.activeProviderBadge}>
            <span style={{ color: providerInfo?.color }}>{providerInfo?.icon}</span> {providerInfo?.label}
            <button style={styles.switchBtn} onClick={() => setStage(STAGES.PROVIDER_SELECT)}>switch</button>
          </div>
          <button style={styles.primaryBtn} onClick={() => setStage(STAGES.CHARACTER_SELECT)}>
            BEGIN YOUR CURSED FATE
          </button>
        </div>
      </div>
    );
  }

  // ── CHARACTER SELECT ──
  if (stage === STAGES.CHARACTER_SELECT) {
    return (
      <div style={styles.root}>
        <div style={styles.setupContainer}>
          <h2 style={styles.sectionTitle}>WHO ARE YOU?</h2>
          <p style={styles.setupDesc}>Choose how you'll experience this story.</p>
          <div style={styles.cardRow}>
            <button style={{ ...styles.charCard, ...(characterMode === "gojo" ? styles.charCardActive : {}) }} onClick={() => setCharacterMode("gojo")}>
              <div style={styles.cardIcon}>👁️</div>
              <div style={styles.cardName}>SATORU GOJO</div>
              <div style={styles.cardDesc}>Play as the strongest. Wield the Six Eyes and Infinity. Experience his life from within.</div>
            </button>
            <button style={{ ...styles.charCard, ...(characterMode === "oc" ? styles.charCardActive : {}) }} onClick={() => setCharacterMode("oc")}>
              <div style={styles.cardIcon}>⚡</div>
              <div style={styles.cardName}>ORIGINAL CHARACTER</div>
              <div style={styles.cardDesc}>Create your own sorcerer with Gojo's powers — the Six Eyes, Limitless, Infinity. Your name, your face, your personality. Same strength, different soul.</div>
            </button>
          </div>
          <div style={styles.btnRow}>
            <button style={styles.ghostBtn} onClick={() => setStage(STAGES.SETUP)}>← Back</button>
            {characterMode && (
              <button style={styles.primaryBtn} onClick={() => characterMode === "oc" ? setStage(STAGES.OC_CREATION) : startGame()}>
                {characterMode === "oc" ? "CREATE CHARACTER →" : "BEGIN AS GOJO →"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── OC CREATION ──
  if (stage === STAGES.OC_CREATION) {
    return (
      <div style={styles.root}>
        <div style={styles.setupContainer}>
          <h2 style={styles.sectionTitle}>YOUR SORCERER</h2>
          <p style={styles.setupDesc}>Define who you are in the jujutsu world.</p>
          <div style={styles.formGroup}>
            <label style={styles.label}>SORCERER NAME</label>
            <input style={styles.textInput} placeholder="e.g. Kenji Mori" value={ocName} onChange={e => setOcName(e.target.value)} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>APPEARANCE</label>
            <input style={styles.textInput} placeholder="e.g. tall, silver hair, sharp green eyes, always wears black..." value={ocAppearance} onChange={e => setOcAppearance(e.target.value)} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>PERSONALITY</label>
            <input style={styles.textInput} placeholder="e.g. quiet and calculating, dry humor, fiercely protective..." value={ocPersonality} onChange={e => setOcPersonality(e.target.value)} />
          </div>
          <div style={styles.btnRow}>
            <button style={styles.ghostBtn} onClick={() => setStage(STAGES.CHARACTER_SELECT)}>← Back</button>
            <button
              style={{ ...styles.primaryBtn, opacity: (!ocName || !ocAppearance || !ocPersonality) ? 0.5 : 1 }}
              onClick={startGame}
              disabled={!ocName || !ocAppearance || !ocPersonality}
            >
              ENTER THE STORY →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ──
  const gameMessages = messages.filter(m => m.role === "assistant" || m.role === "user");

  return (
    <div style={styles.gameRoot}>
      <div style={styles.gameHeader}>
        <div style={styles.headerLeft}>
          <span style={styles.headerSymbol}>∞</span>
          <span style={styles.headerTitle}>GOJO SIMULATOR</span>
        </div>
        <div style={styles.headerRight}>
          <span style={{ ...styles.headerChar, color: providerInfo?.color, opacity: 0.8 }}>
            {providerInfo?.icon} {providerInfo?.label}
            {providerInfo?.dailyLimit && (
              <span style={{ color: geminiRequestCounts[provider] >= providerInfo.dailyLimit ? "#e05a5a" : "#4a6a80", marginLeft: "6px" }}>
                ({providerInfo.dailyLimit - geminiRequestCounts[provider]}/{providerInfo.dailyLimit} left)
              </span>
            )}
          </span>
          <span style={styles.headerChar}>
            {characterMode === "gojo" ? "👁️ SATORU GOJO" : `⚡ ${ocName.toUpperCase()}`}
          </span>
          <button style={styles.resetBtn} onClick={exportChat}>EXPORT</button>
          <button style={styles.resetBtn} onClick={() => importRef.current?.click()}>IMPORT</button>
          <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={importChat} />
          <button style={styles.resetBtn} onClick={fullReset}>RESET</button>
        </div>
      </div>

      <div style={styles.chatArea}>
        {gameMessages.length === 0 && loading && (
          <div style={styles.loadingScene}>
            <div style={styles.loadingSymbol}>∞</div>
            <p style={styles.loadingText}>Summoning the cursed world...</p>
          </div>
        )}
        {gameMessages.map((msg, i) => (
          <div key={i} style={msg.role === "user" ? styles.userBubble : styles.aiBubble}>
            {msg.role === "assistant" && <div style={styles.narratorLabel}>◆ NARRATOR</div>}
            {msg.role === "user" && <div style={styles.playerLabel}>YOU</div>}
            <div
              style={msg.role === "assistant" ? styles.aiBubbleText : styles.userBubbleText}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
            />
          </div>
        ))}
        {loading && gameMessages.length > 0 && (
          <div style={styles.aiBubble}>
            <div style={styles.narratorLabel}>◆ NARRATOR</div>
            <div style={styles.typingDots}>
              <span style={styles.dot1}>●</span><span style={styles.dot2}>●</span><span style={styles.dot3}>●</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div style={styles.inputArea}>
        <textarea
          ref={inputRef}
          style={styles.chatInput}
          placeholder={loading ? "Waiting for the narrator..." : 'Type your action or choice (e.g. "1", "I attack", "I ask Gojo about Infinity")...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          disabled={loading}
        />
        <button
          style={{ ...styles.sendBtn, opacity: (loading || !input.trim()) ? 0.4 : 1 }}
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >↑</button>
      </div>
    </div>
  );
}

function getParticleStyle(i) {
  return {
    left: `${(i * 37 + 11) % 100}%`,
    top: `${(i * 53 + 7) % 100}%`,
    width: `${1 + (i % 3)}px`,
    height: `${1 + (i % 3)}px`,
    animationDelay: `${(i * 0.3) % 4}s`,
    animationDuration: `${3 + (i % 4)}s`,
  };
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020408 0%, #050d1a 50%, #020408 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    position: "relative", overflow: "hidden", padding: "20px",
  },
  particles: { position: "absolute", inset: 0, pointerEvents: "none" },
  particle: {
    position: "absolute", borderRadius: "50%", background: "#3b9eff",
    opacity: 0.15, animation: "float 4s ease-in-out infinite alternate",
  },
  setupContainer: { maxWidth: "580px", width: "100%", textAlign: "center", position: "relative", zIndex: 1 },
  eyeGlow: {
    position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)",
    width: "300px", height: "300px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59,158,255,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  logoArea: { marginBottom: "28px" },
  logoEye: {
    fontSize: "64px", color: "#3b9eff", lineHeight: 1, marginBottom: "12px",
    textShadow: "0 0 40px rgba(59,158,255,0.8), 0 0 80px rgba(59,158,255,0.3)",
    animation: "pulse 3s ease-in-out infinite",
  },
  logoTitle: {
    fontSize: "clamp(28px, 6vw, 44px)", fontWeight: "700", color: "#e8f4ff",
    letterSpacing: "0.2em", margin: "0 0 8px 0",
    fontFamily: "'Georgia', serif", textShadow: "0 0 20px rgba(59,158,255,0.3)",
  },
  logoSub: { color: "#4a7fa8", fontSize: "13px", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 },
  setupDesc: { color: "#7bacc8", fontSize: "14px", lineHeight: 1.7, marginBottom: "24px", fontStyle: "italic" },
  activeProviderBadge: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    background: "rgba(10,25,45,0.8)", border: "1px solid #1a3a5c",
    borderRadius: "20px", padding: "6px 14px", fontSize: "12px",
    color: "#7bacc8", marginBottom: "20px", letterSpacing: "0.08em",
  },
  switchBtn: {
    background: "transparent", border: "none", color: "#3b9eff",
    fontSize: "11px", cursor: "pointer", padding: "0", fontFamily: "'Georgia', serif",
    textDecoration: "underline",
  },
  providerGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px",
    marginBottom: "24px",
  },
  providerCard: {
    background: "rgba(10,25,45,0.8)", border: "1px solid #1a3a5c",
    borderRadius: "6px", padding: "20px 14px", cursor: "pointer",
    transition: "all 0.2s", textAlign: "center", color: "#7bacc8",
    fontFamily: "'Georgia', serif", position: "relative",
  },
  providerIcon: { fontSize: "28px", marginBottom: "8px" },
  providerName: { fontSize: "13px", fontWeight: "700", letterSpacing: "0.08em", color: "#e8f4ff", marginBottom: "4px" },
  providerSub: { fontSize: "11px", opacity: 0.7, marginBottom: "10px" },
  providerBadge: {
    display: "inline-block", fontSize: "10px", letterSpacing: "0.1em",
    border: "1px solid", borderRadius: "10px", padding: "2px 8px",
  },
  dailyLimitNote: {
    marginTop: "8px",
    fontSize: "10px",
    color: "#4a6a80",
    fontStyle: "italic",
    lineHeight: 1.4,
  },
  importRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginTop: "16px",
    paddingTop: "16px",
    borderTop: "1px solid #0d2a4a",
  },
  importLabel: {
    color: "#3a5a70",
    fontSize: "12px",
    fontStyle: "italic",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #1a6bbf, #0d4a8c)", color: "#e8f4ff",
    border: "1px solid #3b9eff", padding: "14px 36px", fontSize: "13px",
    fontFamily: "'Georgia', serif", letterSpacing: "0.15em", cursor: "pointer",
    borderRadius: "2px", boxShadow: "0 0 20px rgba(59,158,255,0.2)",
    transition: "all 0.2s", textTransform: "uppercase",
  },
  ghostBtn: {
    background: "transparent", color: "#4a7fa8", border: "1px solid #1a3a5c",
    padding: "12px 24px", fontSize: "12px", fontFamily: "'Georgia', serif",
    letterSpacing: "0.12em", cursor: "pointer", borderRadius: "2px",
    transition: "all 0.2s", textTransform: "uppercase",
  },
  sectionTitle: {
    color: "#e8f4ff", fontSize: "24px", letterSpacing: "0.25em",
    marginBottom: "12px", fontFamily: "'Georgia', serif", textTransform: "uppercase",
  },
  cardRow: { display: "flex", gap: "16px", marginBottom: "28px", flexWrap: "wrap", justifyContent: "center" },
  charCard: {
    flex: "1 1 200px", maxWidth: "240px", background: "rgba(10,25,45,0.8)",
    border: "1px solid #1a3a5c", borderRadius: "4px", padding: "24px 16px",
    cursor: "pointer", transition: "all 0.2s", textAlign: "center",
    color: "#7bacc8", fontFamily: "'Georgia', serif",
  },
  charCardActive: {
    border: "1px solid #3b9eff", background: "rgba(20,50,90,0.8)",
    boxShadow: "0 0 20px rgba(59,158,255,0.15)", color: "#e8f4ff",
  },
  cardIcon: { fontSize: "36px", marginBottom: "12px" },
  cardName: { fontSize: "14px", fontWeight: "700", letterSpacing: "0.1em", marginBottom: "8px", textTransform: "uppercase" },
  cardDesc: { fontSize: "12px", lineHeight: 1.6, opacity: 0.8 },
  btnRow: { display: "flex", gap: "12px", justifyContent: "center", alignItems: "center" },
  formGroup: { marginBottom: "20px", textAlign: "left" },
  label: { display: "block", color: "#4a7fa8", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" },
  textInput: {
    width: "100%", background: "rgba(10,25,45,0.8)", border: "1px solid #1a3a5c",
    borderRadius: "2px", color: "#e8f4ff", fontSize: "15px", padding: "12px 14px",
    fontFamily: "'Georgia', serif", outline: "none", boxSizing: "border-box",
  },
  apiKeyError: { color: "#e05a5a", fontSize: "12px", marginTop: "8px" },
  apiKeyHint: { color: "#3a5a70", fontSize: "12px", marginBottom: "20px", fontStyle: "italic" },
  gameRoot: {
    height: "100vh", display: "flex", flexDirection: "column",
    background: "#020408", fontFamily: "'Georgia', 'Times New Roman', serif", overflow: "hidden",
  },
  gameHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 20px", background: "rgba(5,15,30,0.95)",
    borderBottom: "1px solid #0d2a4a", flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  headerSymbol: { color: "#3b9eff", fontSize: "22px", textShadow: "0 0 10px rgba(59,158,255,0.8)" },
  headerTitle: { color: "#e8f4ff", fontSize: "14px", letterSpacing: "0.2em", fontWeight: "700" },
  headerRight: { display: "flex", alignItems: "center", gap: "14px" },
  headerChar: { color: "#4a7fa8", fontSize: "12px", letterSpacing: "0.1em" },
  resetBtn: {
    background: "transparent", border: "1px solid #1a3a5c", color: "#3a6080",
    fontSize: "10px", letterSpacing: "0.12em", padding: "5px 10px",
    cursor: "pointer", borderRadius: "2px", fontFamily: "'Georgia', serif",
  },
  chatArea: {
    flex: 1, overflowY: "auto", padding: "24px 20px",
    display: "flex", flexDirection: "column", gap: "20px",
    scrollbarWidth: "thin", scrollbarColor: "#0d2a4a transparent",
  },
  loadingScene: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", flex: 1, gap: "16px", paddingTop: "60px",
  },
  loadingSymbol: {
    fontSize: "56px", color: "#3b9eff",
    textShadow: "0 0 30px rgba(59,158,255,0.8)", animation: "pulse 2s ease-in-out infinite",
  },
  loadingText: { color: "#4a7fa8", fontSize: "14px", letterSpacing: "0.15em", fontStyle: "italic" },
  aiBubble: { maxWidth: "760px", width: "100%", alignSelf: "flex-start" },
  userBubble: { maxWidth: "500px", alignSelf: "flex-end", textAlign: "right" },
  narratorLabel: { color: "#3b9eff", fontSize: "10px", letterSpacing: "0.2em", marginBottom: "8px", fontWeight: "700" },
  playerLabel: { color: "#5a8a6a", fontSize: "10px", letterSpacing: "0.2em", marginBottom: "6px", fontWeight: "700" },
  aiBubbleText: {
    background: "rgba(8,20,40,0.7)", border: "1px solid #0d2a4a",
    borderLeft: "3px solid #1a5fa0", borderRadius: "0 4px 4px 0",
    color: "#c8dff0", fontSize: "15px", lineHeight: "1.8", padding: "16px 18px",
  },
  userBubbleText: {
    background: "rgba(15,35,15,0.7)", border: "1px solid #1a3a1a",
    borderRight: "3px solid #2a6a3a", borderRadius: "4px 0 0 4px",
    color: "#a8d4b0", fontSize: "14px", lineHeight: "1.6",
    padding: "12px 16px", display: "inline-block",
  },
  typingDots: {
    background: "rgba(8,20,40,0.7)", border: "1px solid #0d2a4a",
    borderLeft: "3px solid #1a5fa0", borderRadius: "0 4px 4px 0",
    padding: "16px 18px", display: "flex", gap: "6px", alignItems: "center",
  },
  dot1: { color: "#3b9eff", fontSize: "8px", animation: "blink 1.2s infinite" },
  dot2: { color: "#3b9eff", fontSize: "8px", animation: "blink 1.2s 0.4s infinite" },
  dot3: { color: "#3b9eff", fontSize: "8px", animation: "blink 1.2s 0.8s infinite" },
  inputArea: {
    display: "flex", gap: "10px", padding: "14px 20px",
    background: "rgba(5,15,30,0.95)", borderTop: "1px solid #0d2a4a", flexShrink: 0,
  },
  chatInput: {
    flex: 1, background: "rgba(8,20,40,0.8)", border: "1px solid #1a3a5c",
    borderRadius: "3px", color: "#c8dff0", fontSize: "14px",
    padding: "10px 14px", fontFamily: "'Georgia', serif",
    outline: "none", resize: "none", lineHeight: "1.5",
  },
  sendBtn: {
    background: "linear-gradient(135deg, #1a6bbf, #0d4a8c)", border: "1px solid #3b9eff",
    color: "#e8f4ff", width: "44px", height: "44px", fontSize: "20px",
    cursor: "pointer", borderRadius: "3px", flexShrink: 0,
    alignSelf: "flex-end", boxShadow: "0 0 10px rgba(59,158,255,0.2)",
  },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
  @keyframes float { 0% { transform: translateY(0px); opacity: 0.1; } 100% { transform: translateY(-20px); opacity: 0.25; } }
  @keyframes blink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
  textarea::placeholder { color: #2a4a6a; }
  input::placeholder { color: #2a4a6a; }
  button:hover { filter: brightness(1.15); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #0d2a4a; border-radius: 2px; }
`;
document.head.appendChild(styleSheet);
