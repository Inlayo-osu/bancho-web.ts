export type ChatAuthor = "me" | "them" | "system";

export interface ChatMessage {
  id: string;
  author: string;
  sender: ChatAuthor;
  text: string;
  time: string;
  read?: boolean;
}

export interface ChatThread {
  id: string;
  type: "channel" | "dm";
  name: string;
  title: string;
  unread: number;
  messages: ChatMessage[];
}

export const CHAT_THREADS: ChatThread[] = [
  {
    id: "channel-announce",
    type: "channel",
    name: "#announce",
    title: "Announcements",
    unread: 1,
    messages: [
      {
        id: "a1",
        author: "Server",
        sender: "system",
        text: "Server maintenance is scheduled for tonight at 22:00 UTC.",
        time: "09:12",
        read: true,
      },
      {
        id: "a2",
        author: "Server",
        sender: "system",
        text: "New leaderboard season has started. Check the top plays page.",
        time: "09:15",
        read: false,
      },
    ],
  },
  {
    id: "channel-lobby",
    type: "channel",
    name: "#lobby",
    title: "Lobby",
    unread: 3,
    messages: [
      {
        id: "l1",
        author: "Kiro",
        sender: "them",
        text: "Anyone up for a 4v4 mania lobby?",
        time: "08:52",
        read: false,
      },
      {
        id: "l2",
        author: "You",
        sender: "me",
        text: "I’m in. Let’s do a relaxed run first.",
        time: "08:53",
        read: true,
      },
      {
        id: "l3",
        author: "Ari",
        sender: "them",
        text: "I’ll bring the room code after warmup.",
        time: "08:55",
        read: false,
      },
    ],
  },
  {
    id: "channel-osu",
    type: "channel",
    name: "#osu!",
    title: "osu! General",
    unread: 0,
    messages: [
      {
        id: "o1",
        author: "Nia",
        sender: "them",
        text: "The new map pack dropped. Anyone wants to compare scores?",
        time: "Yesterday",
        read: true,
      },
      {
        id: "o2",
        author: "You",
        sender: "me",
        text: "I’ll check the top plays and jump in after lunch.",
        time: "Yesterday",
        read: true,
      },
    ],
  },
  {
    id: "dm-kenji",
    type: "dm",
    name: "Kenji",
    title: "Kenji",
    unread: 2,
    messages: [
      {
        id: "d1",
        author: "Kenji",
        sender: "them",
        text: "Your 98% on there was insane. Did you play it again?",
        time: "08:41",
        read: false,
      },
      {
        id: "d2",
        author: "You",
        sender: "me",
        text: "Yeah, I was testing a new pattern. Check the replay later.",
        time: "08:43",
        read: true,
      },
    ],
  },
  {
    id: "dm-ryu",
    type: "dm",
    name: "Ryu",
    title: "Ryu",
    unread: 0,
    messages: [
      {
        id: "r1",
        author: "Ryu",
        sender: "them",
        text: "The mania challenge is live — let’s queue in an hour.",
        time: "Yesterday",
        read: true,
      },
    ],
  },
];
