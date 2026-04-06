import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useSeo } from "../hooks/useSeo";

const faqData = [
  {
    category: "general",
    q: "Is this app free to use?",
    a: "Yes. You can use this project for learning, portfolio, and personal productivity.",
  },
  {
    category: "account",
    q: "Do I need an account for task access?",
    a: "Yes, protected routes require login before opening your personal task board.",
  },
  {
    category: "security",
    q: "Are APIs still connected after UI change?",
    a: "Yes. Login, register, reset password and feedback endpoints are kept unchanged.",
  },
  {
    category: "project",
    q: "Can I customize this UI further?",
    a: "Yes. The current layout is modular and can be extended page by page.",
  },
  {
    category: "project",
    q: "Does board content support larger task descriptions?",
    a: "Yes. Tasks now support richer metadata and long descriptions for business workflows.",
  },
  {
    category: "security",
    q: "Will dark mode affect text readability?",
    a: "No. Theme tokens are tuned for strong contrast in both light and black dark backgrounds.",
  },
  {
    category: "account",
    q: "Where can I change theme and profile details?",
    a: "Open Profile Settings from the header profile menu to manage theme and account fields.",
  },
  {
    category: "general",
    q: "What is Yono Todolist mainly built for?",
    a: "It is built for structured daily execution with clear pending, completed, and timeline visibility.",
  },
  {
    category: "project",
    q: "Can I use Add page and Task Center separately?",
    a: "Yes. Add page is dedicated for creation and Task Center is dedicated for execution and tracking.",
  },
  {
    category: "security",
    q: "Is task data private per logged-in user?",
    a: "Protected routes ensure unauthorized users cannot access internal workspace pages.",
  },
  {
    category: "account",
    q: "Can I update my profile photo and name?",
    a: "Yes. Open Profile page and update details; header avatar and name sync automatically.",
  },
  {
    category: "project",
    q: "How do I track work done by date?",
    a: "Use Calendar mode and Timeline mode in Task Center for date-based task tracking.",
  },
  {
    category: "general",
    q: "Is this suitable for students and freelancers?",
    a: "Yes. Individuals can use it for assignment, client work, and personal productivity planning.",
  },
];

type ChatRole = "bot" | "user";

type ChatAttachment = {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  isImage: boolean;
};

type ChatMessage = {
  id: number;
  role: ChatRole;
  text: string;
  createdAt: number;
  attachment?: ChatAttachment;
};

const quickPrompts = [
  "Is this app free to use?",
  "How do I reset my password?",
  "How can I update profile photo?",
  "How do I track work by date?",
];

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);

const faqIndex = faqData.map((item) => ({
  ...item,
  tokens: tokenize(`${item.q} ${item.a} ${item.category}`),
}));

const CHAT_STORAGE_KEY = "ask-question-chat-v1";
const MAX_QUESTION_LENGTH = 280;
const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;
const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
});

const sanitizeQuestion = (value: string) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

const sanitizeFileName = (value: string) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File read failed."));
    reader.readAsDataURL(file);
  });

const getWelcomeMessage = (): ChatMessage => ({
  id: Date.now(),
  role: "bot",
  text: "Hello. Main free AI FAQ assistant hoon. Aap jo bhi question poochoge, main best possible answer dunga.",
  createdAt: Date.now(),
});

const readSavedMessages = (): ChatMessage[] => {
  const raw = localStorage.getItem(CHAT_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalized: ChatMessage[] = [];

    parsed.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const role = item.role === "user" ? "user" : item.role === "bot" ? "bot" : null;
      const text = typeof item.text === "string" ? sanitizeQuestion(item.text) : "";
      const createdAt = typeof item.createdAt === "number" ? item.createdAt : Date.now();
      const id = typeof item.id === "number" ? item.id : Date.now();
      let attachment: ChatAttachment | undefined;

      if (item.attachment && typeof item.attachment === "object") {
        const dataUrl =
          typeof (item.attachment as { dataUrl?: unknown }).dataUrl === "string"
            ? (item.attachment as { dataUrl: string }).dataUrl
            : "";
        const name =
          typeof (item.attachment as { name?: unknown }).name === "string"
            ? sanitizeFileName((item.attachment as { name: string }).name)
            : "";
        const mimeType =
          typeof (item.attachment as { mimeType?: unknown }).mimeType === "string"
            ? (item.attachment as { mimeType: string }).mimeType
            : "application/octet-stream";
        const size =
          typeof (item.attachment as { size?: unknown }).size === "number"
            ? (item.attachment as { size: number }).size
            : 0;
        const isImage =
          typeof (item.attachment as { isImage?: unknown }).isImage === "boolean"
            ? (item.attachment as { isImage: boolean }).isImage
            : mimeType.startsWith("image/");

        if (dataUrl && name) {
          attachment = {
            name,
            mimeType,
            size,
            dataUrl,
            isImage,
          };
        }
      }

      if (!role || (!text && !attachment)) return;

      const message: ChatMessage = { id, role, text, createdAt };
      if (attachment) message.attachment = attachment;
      normalized.push(message);
    });

    return normalized;
  } catch {
    return [];
  }
};

const getFreeBotReply = (question: string) => {
  const lower = question.toLowerCase();

  if (/(hello|hi|hey|namaste)/.test(lower)) {
    return "Hello. Main free FAQ bot hoon, aap account, security, workflow ya project ke sawal pooch sakte ho.";
  }

  if (/(thank|thanks|shukriya)/.test(lower)) {
    return "Welcome. Agar aap chaho to next question pooch sakte ho.";
  }

  const questionTokens = new Set(tokenize(question));
  let bestMatch: (typeof faqIndex)[number] | null = null;
  let bestScore = 0;

  for (const item of faqIndex) {
    const overlapScore = item.tokens.reduce(
      (score, token) => (questionTokens.has(token) ? score + 1 : score),
      0,
    );
    const categoryBoost = lower.includes(item.category) ? 1 : 0;
    const totalScore = overlapScore + categoryBoost;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = item;
    }
  }

  if (bestMatch && bestScore >= 2) {
    return `${bestMatch.a} Related FAQ: ${bestMatch.q}`;
  }

  return "Mujhe exact match nahi mila. Aap account, login, register, password reset, security, profile, calendar, ya timeline se related question pooch kar dekho.";
};

export default function AskQuestion() {
  useSeo({
    title: "Ask Question",
    description: "Ask questions in a separate free chat page and get quick answers from FAQ knowledge.",
    path: "/ask-question",
  });

  const [chatInput, setChatInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [chatNotice, setChatNotice] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = readSavedMessages();
    return saved.length ? saved : [getWelcomeMessage()];
  });
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch {
      // Ignore write failures and keep in-memory conversation active.
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!chatBodyRef.current) return;
    chatBodyRef.current.scrollTo({
      top: chatBodyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };

    window.addEventListener("click", closeOnOutsideClick);
    return () => window.removeEventListener("click", closeOnOutsideClick);
  }, []);

  const validateQuestion = (value: string): string | null => {
    if (!value) return "Please type your question first.";
    if (value.length < 2) return "Question is too short.";
    if (value.length > MAX_QUESTION_LENGTH) {
      return `Question too long. Max ${MAX_QUESTION_LENGTH} characters allowed.`;
    }
    return null;
  };

  const submitQuestion = (rawQuestion: string) => {
    const question = sanitizeQuestion(rawQuestion);
    const error = validateQuestion(question);
    if (error) {
      setInputError(error);
      return;
    }
    setInputError("");
    setChatNotice("");

    setChatMessages((prev) => {
      const now = Date.now();
      const userMsg: ChatMessage = {
        id: now,
        role: "user",
        text: question,
        createdAt: now,
      };
      const botMsg: ChatMessage = {
        id: now + 1,
        role: "bot",
        text: sanitizeQuestion(getFreeBotReply(question)),
        createdAt: now + 1,
      };
      return [...prev, userMsg, botMsg];
    });

    setChatInput("");
  };

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuestion(chatInput);
  };

  const clearConversation = () => {
    setChatMessages([getWelcomeMessage()]);
    setChatInput("");
    setInputError("");
    setChatNotice("Chat cleared.");
    setMenuOpen(false);
  };

  const startFreshChat = () => {
    setChatMessages([getWelcomeMessage()]);
    setChatInput("");
    setInputError("");
    setChatNotice("Started a new chat.");
    setMenuOpen(false);
  };

  const copyLastBotReply = async () => {
    const lastBotMessage = [...chatMessages].reverse().find((msg) => msg.role === "bot");
    if (!lastBotMessage) {
      setChatNotice("No bot reply found.");
      setMenuOpen(false);
      return;
    }

    try {
      await navigator.clipboard.writeText(lastBotMessage.text);
      setChatNotice("Last bot reply copied.");
    } catch {
      setChatNotice("Copy failed. Browser permission required.");
    }
    setMenuOpen(false);
  };

  const exportConversation = () => {
    const formatted = chatMessages
      .map((msg) => {
        const who = msg.role === "user" ? "YOU" : "BOT";
        const time = timeFormatter.format(msg.createdAt);
        return `[${time}] ${who}: ${msg.text}`;
      })
      .join("\n");

    const blob = new Blob([formatted], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `faq-chat-${Date.now()}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    setChatNotice("Chat exported.");
    setMenuOpen(false);
  };

  const scrollToLatest = () => {
    if (!chatBodyRef.current) return;
    chatBodyRef.current.scrollTo({
      top: chatBodyRef.current.scrollHeight,
      behavior: "smooth",
    });
    setChatNotice("Jumped to latest message.");
    setMenuOpen(false);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setInputError(`File too large. Max allowed size is ${formatSize(MAX_ATTACHMENT_SIZE)}.`);
      return;
    }

    setInputError("");
    setChatNotice("");
    setIsAttaching(true);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const cleanName = sanitizeFileName(file.name) || "attachment";
      const attachment: ChatAttachment = {
        name: cleanName,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
        isImage: file.type.startsWith("image/"),
      };

      setChatMessages((prev) => {
        const now = Date.now();
        const userMsg: ChatMessage = {
          id: now,
          role: "user",
          text: attachment.isImage ? "Image attached." : "File attached.",
          createdAt: now,
          attachment,
        };

        const botMsg: ChatMessage = {
          id: now + 1,
          role: "bot",
          text: attachment.isImage
            ? `Image "${attachment.name}" received.`
            : `File "${attachment.name}" received (${formatSize(attachment.size)}).`,
          createdAt: now + 1,
        };
        return [...prev, userMsg, botMsg];
      });

      setChatNotice(`${attachment.isImage ? "Image" : "File"} attached: ${cleanName}`);
    } catch {
      setInputError("Attachment read failed. Please try another file.");
    } finally {
      setIsAttaching(false);
    }
  };

  return (
    <div className="todoist-center-card faq-chat-page">
      <section className="wa-chat-shell" aria-label="WhatsApp style chat">
        <header className="wa-chat-top">
          <div className="wa-chat-profile">
            <span className="wa-chat-avatar">AI</span>
            <div>
              <h1>FAQ Assistant</h1>
              <p>Online | chat auto-saved in local storage</p>
            </div>
          </div>

          <div className="wa-chat-top-actions">
            <Link to="/faq" className="wa-chat-back">
              Back to FAQ
            </Link>
            <div className="wa-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="wa-menu-btn"
                aria-label="Open chat options"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <span />
                <span />
                <span />
              </button>
              {menuOpen && (
                <div className="wa-menu-popover" role="menu">
                  <button type="button" className="wa-menu-item" onClick={clearConversation}>
                    Clear Chat
                  </button>
                  <button type="button" className="wa-menu-item" onClick={startFreshChat}>
                    Start New Chat
                  </button>
                  <button type="button" className="wa-menu-item" onClick={copyLastBotReply}>
                    Copy Last Reply
                  </button>
                  <button type="button" className="wa-menu-item" onClick={exportConversation}>
                    Export Chat
                  </button>
                  <button type="button" className="wa-menu-item" onClick={scrollToLatest}>
                    Scroll to Latest
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="wa-chat-body" role="log" aria-live="polite" ref={chatBodyRef}>
          {chatMessages.map((msg) => (
            <article key={msg.id} className={`wa-msg ${msg.role === "user" ? "is-user" : "is-bot"}`}>
              {msg.attachment ? (
                <div className="wa-attachment">
                  {msg.attachment.isImage ? (
                    <img
                      src={msg.attachment.dataUrl}
                      alt={msg.attachment.name}
                      className="wa-attachment-image"
                      loading="lazy"
                    />
                  ) : (
                    <a
                      href={msg.attachment.dataUrl}
                      download={msg.attachment.name}
                      className="wa-attachment-file"
                    >
                      <strong>{msg.attachment.name}</strong>
                      <span>{formatSize(msg.attachment.size)}</span>
                    </a>
                  )}
                </div>
              ) : null}
              {msg.text ? <p>{msg.text}</p> : null}
              <time dateTime={new Date(msg.createdAt).toISOString()}>
                {timeFormatter.format(msg.createdAt)}
              </time>
            </article>
          ))}
        </div>

        <div className="wa-quick-row">
          {quickPrompts.map((prompt) => (
            <button key={prompt} type="button" className="wa-chip" onClick={() => submitQuestion(prompt)}>
              {prompt}
            </button>
          ))}
        </div>

        {inputError ? <p className="todoist-error wa-input-error">{inputError}</p> : null}
        {chatNotice ? <p className="wa-notice">{chatNotice}</p> : null}

        <form className="wa-chat-form" onSubmit={handleChatSubmit}>
          <button
            type="button"
            className="wa-attach-btn"
            aria-label="Attach image or file"
            onClick={handleAttachClick}
            disabled={isAttaching}
            title="Attach file"
          >
            {isAttaching ? "..." : "+"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="wa-file-input"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          />
          <input
            type="text"
            className="todoist-input wa-chat-input"
            value={chatInput}
            onChange={(e) => {
              setChatInput(e.target.value);
              if (inputError) setInputError("");
              if (chatNotice) setChatNotice("");
            }}
            maxLength={MAX_QUESTION_LENGTH + 80}
            placeholder={isAttaching ? "Processing attachment..." : "Type a message..."}
            aria-label="Ask chat bot"
            disabled={isAttaching}
          />
          <button type="submit" className="wa-send-btn" disabled={isAttaching}>
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
