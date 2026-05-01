"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { MessageCircle, X, Plus, ChevronLeft, Send, User } from "lucide-react";
import { io, Socket } from "socket.io-client";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────
interface Msg {
  id: number;
  room_id: number;
  message: string;
  created_at: string;
  sender_id: number;
  sender_name: string;
  sender_role: string;
}

interface Room {
  id: number;
  type: "course" | "homework" | "evaluation" | "direct";
  name?: string;
  last_message?: { message: string; created_at: string };
}

interface Suggestion {
  type: "homework" | "evaluation" | "course";
  id: number;
  label: string;
  sublabel?: string;
  meta?: string;
  lecturer_id?: number;
}

interface Lecturer {
  id: number;
  full_name: string;
  email: string;
}

// ─── Helpers ──────────────────────────────────────────────────
const ROOM_ICON: Record<string, string> = {
  course: "📚",
  homework: "📝",
  evaluation: "📊",
  direct: "👤",
};

const SUGG_ICON: Record<string, string> = {
  homework: "📝",
  evaluation: "📊",
  course: "📚",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString("ka-GE", {
    hour: "2-digit",
    minute: "2-digit",
  });

// ─── Component ────────────────────────────────────────────────
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<
    "rooms" | "suggestions" | "chat" | "lecturers"
  >("rooms");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // unread: room_id → count
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});
  const activeRoomRef = useRef<Room | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") ?? "null");
    } catch {
      return null;
    }
  })();

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  // activeRoom ref sync — socket handler-ს სჭირდება უახლესი მნიშვნელობა
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // ── Socket ────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000",
      { auth: { token }, transports: ["websocket", "polling"] },
    );

    socket.on("new_message", (msg: Msg) => {
      if (activeRoomRef.current?.id === msg.room_id) {
        // აქტიური room — პირდაპირ messages-ში
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
        );
      } else {
        // სხვა room — unread badge გაზარდე
        setUnreadMap((prev) => ({
          ...prev,
          [msg.room_id]: (prev[msg.room_id] ?? 0) + 1,
        }));
      }

      setRooms((prev) =>
        prev.map((r) =>
          r.id === msg.room_id
            ? {
                ...r,
                last_message: {
                  message: msg.message,
                  created_at: msg.created_at,
                },
              }
            : r,
        ),
      );
    });

    socket.on("user_typing", ({ userName }: { userName: string }) => {
      setTypingUsers((prev) =>
        prev.includes(userName) ? prev : [...prev, userName],
      );
    });

    socket.on("user_stop_typing", ({ userName }: { userName: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== userName));
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  // ── Scroll ────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Load rooms + suggestions ──────────────────────────────
  useEffect(() => {
    if (!open) return;
    api
      .get("/chat/rooms")
      .then((r) => setRooms(r.data))
      .catch(() => {});
    api
      .get("/chat/suggestions")
      .then((r) => setSuggestions(r.data))
      .catch(() => {});
  }, [open]);

  // ── Load lecturers ────────────────────────────────────────
  const loadDirectChatUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/chat/direct-users"); // ← /auth/users-ის მაგივრად

      setLecturers(res.data); // state name ისევ lecturers, ან rename გააკეთე → directUsers
      setView("lecturers");
    } catch {
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // ── Select room ───────────────────────────────────────────
  const selectRoom = useCallback(async (room: Room) => {
    setActiveRoom(room);
    setMessages([]);
    setLoading(true);
    setView("chat");

    // ამ room-ის unread გასუფთავება
    setUnreadMap((prev) => {
      const next = { ...prev };
      delete next[room.id];
      return next;
    });

    try {
      const res = await api.get(`/chat/rooms/${room.id}/messages?limit=50`);
      setMessages(res.data);
      socketRef.current?.emit("join_room", { roomId: room.id });
    } catch {
    } finally {
      setLoading(false);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ── Open from suggestion ──────────────────────────────────
  const openSuggestion = useCallback(
    async (s: Suggestion) => {
      setLoading(true);
      try {
        const participantIds = s.lecturer_id ? [s.lecturer_id] : [];
        const res = await api.post("/chat/rooms", {
          type: s.type,
          context_id: s.id,
          participant_ids: currentUser
            ? [...new Set([...participantIds, currentUser.id])]
            : participantIds,
        });
        const room: Room = res.data;
        setRooms((prev) =>
          prev.some((r) => r.id === room.id) ? prev : [room, ...prev],
        );
        await selectRoom(room);
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [currentUser, selectRoom],
  );

  // ── Open direct (1-1) chat with lecturer ─────────────────
  const openDirectChat = useCallback(
    async (lecturer: Lecturer) => {
      setLoading(true);
      try {
        const res = await api.post("/chat/rooms", {
          type: "direct",
          name: lecturer.full_name, // ✅ სხვა მომხმარებლის სახელი
          participant_ids: [currentUser?.id, lecturer.id].filter(Boolean),
        });
        const room: Room = { ...res.data, name: lecturer.full_name }; // ✅ local override
        setRooms((prev) =>
          prev.some((r) => r.id === room.id) ? prev : [room, ...prev],
        );
        await selectRoom(room);
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [currentUser, selectRoom],
  );

  // ── Send ──────────────────────────────────────────────────
  const send = useCallback(() => {
    if (!text.trim() || !activeRoom || !socketRef.current) return;
    socketRef.current.emit("send_message", {
      roomId: activeRoom.id,
      message: text.trim(),
    });
    setText("");
    if (typingTimer.current) clearTimeout(typingTimer.current);
    socketRef.current.emit("stop_typing", { roomId: activeRoom.id });
  }, [text, activeRoom]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (!activeRoom || !socketRef.current) return;
    socketRef.current.emit("typing", { roomId: activeRoom.id });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", { roomId: activeRoom.id });
    }, 1500);
  };

  const headerTitle = () => {
    if (view === "chat") return activeRoom?.name ?? "Chat";
    if (view === "suggestions") return "სწრაფი გახსნა";
    if (view === "lecturers") return "ლექტორები";
    return "Messages";
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 w-[360px] h-[520px] bg-white rounded-[2rem] shadow-2xl shadow-slate-200/80 border border-slate-200 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
            {view !== "rooms" && (
              <button
                onClick={() => setView("rooms")}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <span className="flex-1 font-black text-slate-800 text-sm">
              {headerTitle()}
            </span>

            {view === "rooms" && (
              <div className="flex items-center gap-1.5">
                {/* 👤 Direct chat — მხოლოდ სტუდენტს */}
                {(currentUser?.role === "student" ||
                  currentUser?.role === "teacher") && (
                  <button
                    onClick={loadDirectChatUsers}
                    title={
                      currentUser?.role === "student"
                        ? "ლექტორთან პირდაპირი ჩატი"
                        : "სტუდენტთან პირდაპირი ჩატი"
                    }
                    className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-emerald-100 hover:text-emerald-600 transition-all"
                  >
                    <User size={14} />
                  </button>
                )}
                {/* + Suggestions */}
                <button
                  onClick={() => setView("suggestions")}
                  className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 transition-all"
                >
                  <Plus size={15} />
                </button>
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              className="text-slate-300 hover:text-slate-600 transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Rooms view ── */}
          {view === "rooms" && (
            <div className="flex-1 overflow-y-auto">
              {rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 px-8 text-center">
                  <MessageCircle size={32} className="text-slate-200" />
                  <p className="text-sm font-bold">ჯერ chat არ გაქვს</p>
                  <p className="text-xs leading-relaxed">
                    + ღილაკზე დააჭირე და აირჩიე კურსი, დავალება ან შეფასება
                  </p>
                  <button
                    onClick={() => setView("suggestions")}
                    className="mt-2 bg-indigo-600 text-white text-xs font-black px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all"
                  >
                    დაიწყე Chat
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {rooms.map((room) => {
                    const unread = unreadMap[room.id] ?? 0;
                    return (
                      <button
                        key={room.id}
                        onClick={() => selectRoom(room)}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <span className="text-xl shrink-0">
                          {ROOM_ICON[room.type] ?? "💬"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {room.name ?? `ოთახი #${room.id}`}
                          </p>
                          {room.last_message && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {room.last_message.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {room.last_message && (
                            <span className="text-[10px] text-slate-300 font-bold">
                              {fmt(room.last_message.created_at)}
                            </span>
                          )}
                          {unread > 0 && (
                            <span className="min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Suggestions view ── */}
          {view === "suggestions" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {suggestions.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">
                  მასალა ვერ მოიძებნა
                </p>
              )}
              {suggestions.map((s, i) => (
                <button
                  key={`${s.type}-${s.id}-${i}`}
                  onClick={() => openSuggestion(s)}
                  className="w-full flex items-start gap-3 p-3.5 rounded-2xl hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="text-lg shrink-0 mt-0.5">
                    {SUGG_ICON[s.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {s.label}
                    </p>
                    {s.sublabel && (
                      <p className="text-xs text-slate-400 truncate">
                        {s.sublabel}
                      </p>
                    )}
                    {s.meta && (
                      <p className="text-[11px] text-indigo-400 font-bold mt-0.5 truncate">
                        {s.meta}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Lecturers view (direct 1-1) ── */}
          {view === "lecturers" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {lecturers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">
                  ლექტორი ვერ მოიძებნა
                </p>
              )}
              {lecturers.map((l) => (
                <button
                  key={l.id}
                  onClick={() => openDirectChat(l)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-black shrink-0">
                    {l.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {l.full_name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{l.email}</p>
                  </div>
                  <span className="text-[10px] text-emerald-500 font-black bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                    მიწერა
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── Chat view ── */}
          {view === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {loading && (
                  <div className="flex justify-center py-4">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                    >
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black shrink-0">
                          {msg.sender_name.charAt(0)}
                        </div>
                      )}
                      <div
                        className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-br-sm"
                            : "bg-slate-100 text-slate-800 rounded-bl-sm"
                        }`}
                      >
                        {!isMe && (
                          <p className="text-[10px] font-black text-slate-400 mb-1">
                            {msg.sender_name}
                          </p>
                        )}
                        <p>{msg.message}</p>
                        <p
                          className={`text-[10px] mt-1 ${isMe ? "text-indigo-200" : "text-slate-400"}`}
                        >
                          {fmt(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {typingUsers.length > 0 && (
                  <div className="flex items-end gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-400 shrink-0">
                      {typingUsers[0].charAt(0)}
                    </div>
                    <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-slate-100 flex gap-2 shrink-0">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={handleTyping}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="შეტყობინება..."
                  className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button
                  onClick={send}
                  disabled={!text.trim()}
                  className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all disabled:opacity-30 shrink-0"
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-all z-50
          ${open ? "bg-slate-800 hover:bg-slate-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
      >
        {open ? (
          <X size={22} className="text-white" />
        ) : (
          <div className="relative">
            <MessageCircle size={22} className="text-white" />
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
        )}
      </button>
    </>
  );
}
