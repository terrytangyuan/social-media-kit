import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

function App() {
  const [text, setText] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [scheduleTime, setScheduleTime] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [notificationScheduled, setNotificationScheduled] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [timezone, setTimezone] = useState(() => {
    const saved = localStorage.getItem("timezone");
    return saved || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [notificationStatus, setNotificationStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown');
  const [posts, setPosts] = useState<Array<{
    id: string;
    title: string;
    content: string;
    scheduleTime: string;
    timezone: string;
    createdAt: string;
  }>>([]);
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [showPostManager, setShowPostManager] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'linkedin' | 'twitter' | 'bluesky'>('linkedin');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const PLATFORM_LIMITS = {
    linkedin: 3000, // LinkedIn doesn't have strict limit, but 3000 is good practice
    twitter: 280,
    bluesky: 300
  };

  useEffect(() => {
    const saved = localStorage.getItem("linkedinDraft");
    const dark = localStorage.getItem("darkMode");
    const schedule = localStorage.getItem("scheduleTime");
    const savedTimezone = localStorage.getItem("timezone");
    const savedPosts = localStorage.getItem("linkedinPosts");
    
    if (savedPosts) {
      const parsedPosts = JSON.parse(savedPosts);
      setPosts(parsedPosts);
      // If no current post and we have saved posts, use the first one
      if (parsedPosts.length > 0 && !saved) {
        const firstPost = parsedPosts[0];
        setCurrentPostId(firstPost.id);
        setText(firstPost.content);
        setScheduleTime(firstPost.scheduleTime);
        setTimezone(firstPost.timezone);
      }
    }
    
    if (saved) setText(saved);
    if (dark === "true") setDarkMode(true);
    if (schedule) setScheduleTime(schedule);
    if (savedTimezone) setTimezone(savedTimezone);
  }, []);

  useEffect(() => {
    localStorage.setItem("linkedinDraft", text);
  }, [text]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("scheduleTime", scheduleTime);
  }, [scheduleTime]);

  useEffect(() => {
    localStorage.setItem("timezone", timezone);
  }, [timezone]);

  useEffect(() => {
    localStorage.setItem("linkedinPosts", JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    // Check notification status on mount
    const checkNotificationStatus = () => {
      if (!("Notification" in window)) {
        setNotificationStatus('unsupported');
        return;
      }
      
      if (Notification.permission === 'granted') {
        setNotificationStatus('granted');
      } else if (Notification.permission === 'denied') {
        setNotificationStatus('denied');
      } else {
        setNotificationStatus('unknown');
      }
    };

    checkNotificationStatus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && !(event.target as Element).closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const getMarkdownPreview = () => {
    const html = marked(text, { breaks: true });
    return DOMPurify.sanitize(html);
  };

  const applyMarkdown = (wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    const wrapped = `${wrapper}${selected}${wrapper}`;
    setText(before + wrapped + after);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + wrapper.length, end + wrapper.length);
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = text.substring(0, start);
    const after = text.substring(end);

    setText(before + emoji + after);
    setShowEmojiPicker(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const commonTimezones = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Phoenix", label: "Arizona Time (MST)" },
    { value: "America/Anchorage", label: "Alaska Time (AKST)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
    { value: "Europe/Rome", label: "Rome (CET/CEST)" },
    { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
    { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)" },
    { value: "Europe/Stockholm", label: "Stockholm (CET/CEST)" },
    { value: "Europe/Moscow", label: "Moscow (MSK)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Asia/Seoul", label: "Seoul (KST)" },
    { value: "Asia/Kolkata", label: "India (IST)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
    { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)" },
    { value: "Australia/Perth", label: "Perth (AWST)" },
    { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
    { value: "America/Toronto", label: "Toronto (ET)" },
    { value: "America/Vancouver", label: "Vancouver (PT)" },
    { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
    { value: "America/Mexico_City", label: "Mexico City (CST)" },
    { value: "Africa/Cairo", label: "Cairo (EET)" },
    { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" }
  ];

  const getCurrentDateTimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatTimezoneTime = (datetime: string, tz: string) => {
    if (!datetime) return "";
    try {
      const date = new Date(datetime);
      return date.toLocaleString("en-US", {
        timeZone: tz,
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short"
      });
    } catch {
      return datetime;
    }
  };

  const createNewPost = () => {
    const currentTime = getCurrentDateTimeString();
    const newPost = {
      id: Date.now().toString(),
      title: `Post ${posts.length + 1}`,
      content: "",
      scheduleTime: currentTime,
      timezone: timezone,
      createdAt: new Date().toISOString()
    };
    setPosts(prev => [...prev, newPost]);
    setCurrentPostId(newPost.id);
    setText("");
    setScheduleTime(currentTime);
  };

  const saveToDraft = () => {
    if (!currentPostId) {
      // Create new post with current content
      const currentTime = getCurrentDateTimeString();
      const newPost = {
        id: Date.now().toString(),
        title: `Post ${posts.length + 1}`,
        content: text,
        scheduleTime: currentTime,
        timezone: timezone,
        createdAt: new Date().toISOString()
      };
      setPosts(prev => [...prev, newPost]);
      setCurrentPostId(newPost.id);
      setScheduleTime(currentTime);
      return;
    }
    
    // Update existing post with current content
    setPosts(prev => prev.map(post => 
      post.id === currentPostId 
        ? { ...post, content: text, scheduleTime, timezone }
        : post
    ));
  };

  const saveCurrentPost = () => {
    if (!currentPostId) {
      createNewPost();
      return;
    }
    
    setPosts(prev => prev.map(post => 
      post.id === currentPostId 
        ? { ...post, content: text, scheduleTime, timezone }
        : post
    ));
  };

  const switchToPost = (postId: string) => {
    // Save current changes first
    if (currentPostId) {
      saveCurrentPost();
    }
    
    const post = posts.find(p => p.id === postId);
    if (post) {
      setCurrentPostId(postId);
      setText(post.content);
      setScheduleTime(post.scheduleTime);
      setTimezone(post.timezone);
    }
  };

  const deletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (currentPostId === postId) {
      const remainingPosts = posts.filter(p => p.id !== postId);
      if (remainingPosts.length > 0) {
        switchToPost(remainingPosts[0].id);
      } else {
        setCurrentPostId(null);
        setText("");
        setScheduleTime("");
      }
    }
  };

  const updatePostTitle = (postId: string, title: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, title } : post
    ));
  };

  const savePostsToDisk = () => {
    const dataToSave = {
      posts: posts,
      exportedAt: new Date().toISOString(),
      appVersion: "1.0.0"
    };
    
    const dataStr = JSON.stringify(dataToSave, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `linkedin-posts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const loadPostsFromDisk = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // Validate the data structure
          if (!data.posts || !Array.isArray(data.posts)) {
            alert('❌ Invalid file format. Please select a valid posts backup file.');
            return;
          }
          
          // Validate each post has required fields
          const validPosts = data.posts.filter((post: any) => 
            post.id && post.title !== undefined && post.content !== undefined
          );
          
          if (validPosts.length === 0) {
            alert('❌ No valid posts found in the file.');
            return;
          }
          
          // Load the posts
          setPosts(validPosts);
          
          // If there are posts, switch to the first one
          if (validPosts.length > 0) {
            const firstPost = validPosts[0];
            setCurrentPostId(firstPost.id);
            setText(firstPost.content);
            setScheduleTime(firstPost.scheduleTime || getCurrentDateTimeString());
            setTimezone(firstPost.timezone || timezone);
          }
          
          alert(`✅ Successfully loaded ${validPosts.length} posts!`);
        } catch (error) {
          console.error('Error parsing file:', error);
          alert('❌ Error reading file. Please make sure it\'s a valid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    
    fileInput.click();
  };

  const emojiCategories = {
    "Smileys & People": ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"],
    "Animals & Nature": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀", "🐿️"],
    "Food & Drink": ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯"],
    "Activities": ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️‍♀️", "🏋️", "🏋️‍♂️", "🤼‍♀️", "🤼", "🤼‍♂️", "🤸‍♀️", "🤸", "🤸‍♂️", "⛹️‍♀️", "⛹️", "⛹️‍♂️", "🤺", "🤾‍♀️", "🤾", "🤾‍♂️", "🏌️‍♀️", "🏌️", "🏌️‍♂️", "🏇", "🧘‍♀️", "🧘", "🧘‍♂️", "🏄‍♀️", "🏄", "🏄‍♂️", "🏊‍♀️", "🏊", "🏊‍♂️", "🤽‍♀️", "🤽", "🤽‍♂️", "🚣‍♀️", "🚣", "🚣‍♂️", "🧗‍♀️", "🧗", "🧗‍♂️", "🚵‍♀️", "🚵", "🚵‍♂️", "🚴‍♀️", "🚴", "🚴‍♂️", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🏵️", "🎗️", "🎫", "🎟️", "🎪", "🤹‍♀️", "🤹", "🤹‍♂️", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🪕", "🎻", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🧩"],
    "Travel & Places": ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍️", "🛵", "🚲", "🛴", "🛹", "🛼", "🚁", "🛸", "✈️", "🛩️", "🛫", "🛬", "🪂", "💺", "🚀", "🛰️", "🚉", "🚊", "🚝", "🚞", "🚋", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "🚁", "🚟", "🚠", "🚡", "🛺", "🚖", "🚘", "🚍", "🚔", "🚨", "🚥", "🚦", "🛑", "🚧", "⚓", "⛵", "🛶", "🚤", "🛳️", "⛴️", "🛥️", "🚢", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠", "⛲", "⛱️", "🏖️", "🏝️", "🏜️", "🌋", "⛰️", "🏔️", "🗻", "🏕️", "⛺", "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🏭", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "🏛️", "⛪", "🕌", "🕍", "🛕", "🕋", "⛩️", "🛤️", "🛣️", "🗾", "🎑", "🏞️", "🌅", "🌄", "🌠", "🎇", "🎆", "🌇", "🌆", "🏙️", "🌃", "🌌", "🌉", "🌁"],
    "Objects": ["⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "⚖️", "🧰", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🔩", "⚙️", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️", "🛡️", "🚬", "⚰️", "⚱️", "🏺", "🔮", "📿", "🧿", "💈", "⚗️", "🔭", "🔬", "🕳️", "🩹", "🩺", "💊", "💉", "🩸", "🧬", "🦠", "🧫", "🧪", "🌡️", "🧹", "🧺", "🧻", "🚽", "🚰", "🚿", "🛁", "🛀", "🧴", "🧷", "🧸", "🧵", "🧶", "🪡", "🪢", "🧮", "🎀", "🎁", "🎗️", "🎟️", "🎫", "🔑", "🗝️", "🔨", "🪓", "⛏️", "⚒️", "🛠️", "🗡️", "⚔️", "🔫", "🏹", "🛡️", "🪃", "🔧", "🔩", "⚙️", "🗜️", "⚖️", "🦯", "🔗", "⛓️", "🪝", "🧰", "🧲", "🪜"],
    "Symbols": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️", "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️", "❎", "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️", "🈳", "🈂️", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "🚻", "🚮", "🎦", "📶", "🈁", "🔣", "ℹ️", "🔤", "🔡", "🔠", "🆖", "🆗", "🆙", "🆒", "🆕", "🆓", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣", "⏏️", "▶️", "⏸️", "⏯️", "⏹️", "⏺️", "⏭️", "⏮️", "⏩", "⏪", "⏫", "⏬", "◀️", "🔼", "🔽", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️", "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁", "🔂", "🔄", "🔃", "🎵", "🎶", "➕", "➖", "➗", "✖️", "♾️", "💲", "💱", "™️", "©️", "®️", "〰️", "➰", "➿", "🔚", "🔙", "🔛", "🔝", "🔜", "✔️", "☑️", "🔘", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️", "◻️", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "⬛", "⬜", "🟫", "🔈", "🔇", "🔉", "🔊", "🔔", "🔕", "📣", "📢", "👁️‍🗨️", "💬", "💭", "🗯️", "♠️", "♣️", "♥️", "♦️", "🃏", "🎴", "🀄", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛", "🕜", "🕝", "🕞", "🕟", "🕠", "🕡", "🕢", "🕣", "🕤", "🕥", "🕦", "🕧"]
  };

  const chunkText = (text: string, platform: 'linkedin' | 'twitter' | 'bluesky'): string[] => {
    const limit = PLATFORM_LIMITS[platform];
    
    if (text.length <= limit) {
      return [text];
    }
    
    const chunks: string[] = [];
    let remainingText = text;
    
    while (remainingText.length > 0) {
      if (remainingText.length <= limit) {
        chunks.push(remainingText);
        break;
      }
      
      // Try to break at natural points
      let breakPoint = limit;
      
      // Look for sentence ending
      const sentenceEnd = remainingText.lastIndexOf('.', limit);
      const questionEnd = remainingText.lastIndexOf('?', limit);
      const exclamationEnd = remainingText.lastIndexOf('!', limit);
      
      const sentenceBreak = Math.max(sentenceEnd, questionEnd, exclamationEnd);
      
      if (sentenceBreak > limit * 0.7) {
        breakPoint = sentenceBreak + 1;
      } else {
        // Look for paragraph break
        const paragraphBreak = remainingText.lastIndexOf('\n\n', limit);
        if (paragraphBreak > limit * 0.5) {
          breakPoint = paragraphBreak;
        } else {
          // Look for single line break
          const lineBreak = remainingText.lastIndexOf('\n', limit);
          if (lineBreak > limit * 0.7) {
            breakPoint = lineBreak;
          } else {
            // Look for word boundary
            const spaceBreak = remainingText.lastIndexOf(' ', limit);
            if (spaceBreak > limit * 0.8) {
              breakPoint = spaceBreak;
            }
          }
        }
      }
      
      chunks.push(remainingText.substring(0, breakPoint).trim());
      remainingText = remainingText.substring(breakPoint).trim();
    }
    
    return chunks;
  };

  const formatForPlatform = (text: string, platform: 'linkedin' | 'twitter' | 'bluesky'): string => {
    // All platforms support Unicode styled text
    return toUnicodeStyle(text);
  };

  const toUnicodeStyle = (text: string): string => {
    let result = text;
    
    // Handle bold text first
    result = result.replace(/\*\*(.*?)\*\*/g, (_, m) => toBold(m));
    
    // Handle italic text - simpler pattern that works reliably
    result = result.replace(/_([^_]+?)_/g, (_, m) => toItalic(m));
    
    return result;
  };

  const toBold = (input: string) => {
    const boldMap = {
      a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶", j: "𝗷",
      k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿", s: "𝘀", t: "𝘁",
      u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇",
      A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜", J: "𝗝",
      K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥", S: "𝗦", T: "𝗧",
      U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭"
    };
    return input.split("").map(c => boldMap[c] || c).join("");
  };

  const toItalic = (input: string) => {
    const italicMap = {
      a: "𝘢", b: "𝘣", c: "𝘤", d: "𝘥", e: "𝘦", f: "𝘧", g: "𝘨", h: "𝘩", i: "𝘪", j: "𝘫",
      k: "𝘬", l: "𝘭", m: "𝘮", n: "𝘯", o: "𝘰", p: "𝘱", q: "𝘲", r: "𝘳", s: "𝘴", t: "𝘵",
      u: "𝘶", v: "𝘷", w: "𝘸", x: "𝘹", y: "𝘺", z: "𝘻",
      A: "𝘈", B: "𝘉", C: "𝘊", D: "𝘋", E: "𝘌", F: "𝘍", G: "𝘎", H: "𝘏", I: "𝘐", J: "𝘑",
      K: "𝘒", L: "𝘓", M: "𝘔", N: "𝘕", O: "𝘖", P: "𝘗", Q: "𝘘", R: "𝘙", S: "𝘚", T: "𝘛",
      U: "𝘜", V: "𝘝", W: "𝘞", X: "𝘟", Y: "𝘠", Z: "𝘡"
    };
    return input.split("").map(c => italicMap[c] || c).join("");
  };

  const handleCopyStyled = async () => {
    try {
      const chunks = chunkText(text, selectedPlatform);
      const formattedChunks = chunks.map((chunk) => {
        return formatForPlatform(chunk, selectedPlatform);
      });
      
      const finalText = formattedChunks.join('\n\n---\n\n');
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(finalText);
        const platform = selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1);
        const message = chunks.length > 1 
          ? `✅ ${platform} thread (${chunks.length} parts) copied to clipboard!`
          : `✅ ${platform} post copied to clipboard!`;
        alert(message);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = finalText;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          const platform = selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1);
          const message = chunks.length > 1 
            ? `✅ ${platform} thread (${chunks.length} parts) copied to clipboard!`
            : `✅ ${platform} post copied to clipboard!`;
          alert(message);
        } else {
          throw new Error("Copy command failed");
        }
      }
    } catch (err) {
      console.error('Copy failed:', err);
      alert("❌ Failed to copy text. Please manually copy the text from the preview below.");
    }
  };

  useEffect(() => {
    // Set up notifications for all scheduled posts
    const timeouts: number[] = [];
    
    const setupNotifications = async () => {
      // Check if notifications are supported
      if (!("Notification" in window)) {
        return;
      }

      // Request permission if not granted
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setNotificationStatus('granted');
        } else {
          setNotificationStatus('denied');
          return;
        }
      }

      const now = new Date();
      
      posts.forEach((post) => {
        if (!post.scheduleTime) return;
        
        const target = new Date(post.scheduleTime);
        const delay = target.getTime() - now.getTime();
        
        if (delay <= 0) return;
        
        console.log(`⏰ Reminder set for "${post.title}" at ${formatTimezoneTime(post.scheduleTime, post.timezone)} (in ${Math.round(delay / 1000)} seconds)`);
        
        const timeout = setTimeout(() => {
          try {
            // Create notification
            const notification = new Notification(`⏰ LinkedIn Post Reminder: ${post.title}`, {
              body: `Time to post "${post.title}" on LinkedIn!\n${formatTimezoneTime(post.scheduleTime, post.timezone)}`,
              icon: "/favicon.ico",
              tag: `linkedin-reminder-${post.id}`,
              requireInteraction: true,
              silent: false
            });

            // Also show browser alert as fallback
            alert(`⏰ REMINDER: Time to post "${post.title}" on LinkedIn!\n\n${formatTimezoneTime(post.scheduleTime, post.timezone)}\n\nClick on "📝 Posts" to switch to this post.`);

            // Auto-close notification after 15 seconds
            setTimeout(() => notification.close(), 15000);
            
            console.log(`✅ Notification triggered for "${post.title}"`);
          } catch (error) {
            console.error("❌ Notification error:", error);
            alert(`⏰ REMINDER: Time to post "${post.title}" on LinkedIn!\n\n${formatTimezoneTime(post.scheduleTime, post.timezone)}`);
          }
        }, delay);
        
        timeouts.push(timeout);
      });
    };

    setupNotifications();
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [posts]);

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"} min-h-screen p-6`}>
      <div className={`max-w-4xl mx-auto p-6 rounded-2xl shadow-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">LinkedIn Post Formatter</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPostManager(!showPostManager)}
              className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
            >
              📝 Posts ({posts.length})
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
            >
              {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>
        </div>

        {showPostManager && (
          <div className={`mb-6 p-4 border rounded-xl ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-300"}`}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">📝 Manage Posts</h2>
              <div className="flex gap-2">
                <button
                  onClick={loadPostsFromDisk}
                  className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                  title="Load posts from file"
                >
                  📁 Load
                </button>
                <button
                  onClick={savePostsToDisk}
                  className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"}`}
                  title="Save posts to file"
                >
                  💾 Save
                </button>
                <button
                  onClick={createNewPost}
                  className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}
                >
                  ➕ New Post
                </button>
              </div>
            </div>
            
            {posts.length === 0 ? (
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                No posts yet. Click "New Post" to create your first post.
              </p>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      currentPostId === post.id 
                        ? (darkMode ? "bg-blue-800 border-blue-600" : "bg-blue-100 border-blue-400")
                        : (darkMode ? "bg-gray-800 border-gray-600 hover:bg-gray-750" : "bg-white border-gray-200 hover:bg-gray-50")
                    }`}
                    onClick={() => switchToPost(post.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={post.title}
                          onChange={(e) => {
                            e.stopPropagation();
                            updatePostTitle(post.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`font-medium text-sm bg-transparent border-none outline-none w-full hover:bg-opacity-50 hover:bg-gray-300 rounded px-1 -mx-1 transition-colors ${darkMode ? "text-white hover:bg-gray-600" : "text-gray-800 hover:bg-gray-100"}`}
                          placeholder="📝 Click to edit title..."
                        />
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {post.content ? `${post.content.substring(0, 60)}${post.content.length > 60 ? '...' : ''}` : 'No content'}
                        </p>
                        {post.scheduleTime && (
                          <p className={`text-xs mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                            📅 {formatTimezoneTime(post.scheduleTime, post.timezone)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        {currentPostId === post.id && (
                          <span className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white"}`}>
                            ✏️ Active
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${post.title}"?`)) {
                              deletePost(post.id);
                            }
                          }}
                          className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {currentPostId && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={saveCurrentPost}
                  className={`text-sm px-3 py-1 rounded-lg ${darkMode ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}
                >
                  💾 Save Current
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <button onClick={() => applyMarkdown("**")} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-sm">Bold</button>
          <button onClick={() => applyMarkdown("_")} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-sm">Italic</button>
          <button 
            onClick={saveToDraft}
            className={`px-3 py-1 rounded-xl text-sm ${darkMode ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}
          >
            💾 Save to Draft
          </button>
          <div className="relative emoji-picker-container">
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-xl text-sm"
            >
              😊 Emojis
            </button>
            {showEmojiPicker && (
              <div className={`absolute top-full left-0 mt-1 w-80 max-h-96 overflow-y-auto border rounded-xl shadow-lg z-10 ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}>
                <div className="p-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>Select Emoji</span>
                    <button 
                      onClick={() => setShowEmojiPicker(false)}
                      className={`text-sm ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      ✕
                    </button>
                  </div>
                  {Object.entries(emojiCategories).map(([category, emojis]) => (
                    <div key={category} className="mb-4">
                      <h4 className={`text-xs font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        {category}
                      </h4>
                      <div className="grid grid-cols-8 gap-1">
                        {emojis.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => insertEmoji(emoji)}
                            className={`w-8 h-8 text-lg hover:bg-gray-100 rounded transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className={`w-full h-40 p-4 border rounded-xl resize-none focus:outline-none focus:ring-2 mb-4 ${
            darkMode 
              ? "bg-gray-700 text-white border-gray-600 focus:ring-blue-500 dark-textarea" 
              : "bg-white text-gray-800 border-gray-300 focus:ring-blue-400 light-textarea"
          }`}
          placeholder="Write your post here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="mb-4">
          <label className={`block mb-2 text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Platform
          </label>
          <div className="flex gap-2 mb-3">
            {[
              { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
              { key: 'twitter', label: 'X/Twitter', icon: '🐦' },
              { key: 'bluesky', label: 'Bluesky', icon: '🦋' }
            ].map((platform) => (
              <button
                key={platform.key}
                onClick={() => setSelectedPlatform(platform.key as any)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedPlatform === platform.key
                    ? (darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white")
                    : (darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
                }`}
              >
                {platform.icon} {platform.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`flex justify-between items-center mb-4 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
          <div className="flex gap-4">
            <span>{text.length} characters</span>
            <span className={`${text.length > PLATFORM_LIMITS[selectedPlatform] ? 'text-red-500' : 'text-green-500'}`}>
              Limit: {PLATFORM_LIMITS[selectedPlatform]}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <label className={`block mb-1 text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Schedule Post Reminder
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${darkMode ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-800"}`}
            />
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${darkMode ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-800"}`}
            >
              <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                🔍 Auto-detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </option>
              {commonTimezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          {scheduleTime && (
            <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              📅 Scheduled for: {formatTimezoneTime(scheduleTime, timezone)}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                🔔 Notifications:
              </span>
              {notificationStatus === 'granted' && (
                <span className="text-xs text-green-600">✅ Enabled</span>
              )}
              {notificationStatus === 'denied' && (
                <span className="text-xs text-red-600">❌ Blocked</span>
              )}
              {notificationStatus === 'unsupported' && (
                <span className="text-xs text-orange-600">⚠️ Unsupported</span>
              )}
              {notificationStatus === 'unknown' && (
                <span className="text-xs text-yellow-600">❓ Unknown</span>
              )}
            </div>
            <button
              onClick={async () => {
                if (!("Notification" in window)) {
                  alert("❌ This browser doesn't support notifications.");
                  return;
                }
                
                if (Notification.permission === 'granted') {
                  new Notification("🧪 Test Notification", {
                    body: "Notifications are working correctly!",
                    icon: "/favicon.ico"
                  });
                  alert("✅ Test notification sent! Check if you received it.");
                } else {
                  const permission = await Notification.requestPermission();
                  if (permission === 'granted') {
                    setNotificationStatus('granted');
                    new Notification("🧪 Test Notification", {
                      body: "Notifications are now enabled!",
                      icon: "/favicon.ico"
                    });
                    alert("✅ Notifications enabled! Test notification sent.");
                  } else {
                    setNotificationStatus('denied');
                    alert("❌ Please enable notifications in your browser settings.");
                  }
                }
              }}
              className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
            >
              🧪 Test
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={handleCopyStyled} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl">
            📋 Copy for {selectedPlatform === 'linkedin' ? 'LinkedIn' : selectedPlatform === 'twitter' ? 'X/Twitter' : 'Bluesky'}
          </button>
          <button 
            onClick={() => {
              const chunks = chunkText(text, selectedPlatform);
              const formattedChunks = chunks.map((chunk) => {
                return formatForPlatform(chunk, selectedPlatform);
              });
              const finalText = formattedChunks.join('\n\n---\n\n');
              
              const tempDiv = document.createElement('div');
              tempDiv.textContent = finalText;
              tempDiv.style.position = 'absolute';
              tempDiv.style.left = '-9999px';
              document.body.appendChild(tempDiv);
              
              const selection = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(tempDiv);
              selection?.removeAllRanges();
              selection?.addRange(range);
              
              setTimeout(() => {
                document.body.removeChild(tempDiv);
              }, 1000);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl"
          >
            🖱️ Select All Text
          </button>
        </div>





        {text.trim() && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">
              {selectedPlatform === 'linkedin' ? 'LinkedIn' : selectedPlatform === 'twitter' ? 'X/Twitter' : 'Bluesky'} Preview
            </h2>
            {(() => {
              const chunks = chunkText(text, selectedPlatform);
              const formattedChunks = chunks.map((chunk) => {
                return formatForPlatform(chunk, selectedPlatform);
              });
              
              return (
                <div className="space-y-4">
                  {chunks.length > 1 && (
                    <div className={`text-sm p-2 rounded-lg ${darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"}`}>
                      📱 This post will be split into {chunks.length} parts due to character limit ({PLATFORM_LIMITS[selectedPlatform]} chars)
                    </div>
                  )}
                  {formattedChunks.map((chunk, index) => (
                    <div key={index} className={`p-4 border rounded-xl ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-800"}`}>
                      <div className="flex justify-between items-start mb-2">
                        {chunks.length > 1 && (
                          <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Part {index + 1} of {chunks.length} • {chunk.length} characters
                          </div>
                        )}
                        {(selectedPlatform === 'twitter' || selectedPlatform === 'bluesky') && chunks.length > 1 && (
                          <button
                            onClick={async () => {
                              try {
                                if (navigator.clipboard && window.isSecureContext) {
                                  await navigator.clipboard.writeText(chunk);
                                } else {
                                  const textArea = document.createElement("textarea");
                                  textArea.value = chunk;
                                  textArea.style.position = "fixed";
                                  textArea.style.left = "-999999px";
                                  textArea.style.top = "-999999px";
                                  document.body.appendChild(textArea);
                                  textArea.focus();
                                  textArea.select();
                                  document.execCommand('copy');
                                  document.body.removeChild(textArea);
                                }
                                alert(`✅ Part ${index + 1} copied to clipboard!`);
                              } catch (err) {
                                console.error('Copy failed:', err);
                                alert('❌ Failed to copy. Please select and copy manually.');
                              }
                            }}
                            className={`text-xs px-2 py-1 rounded ${darkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                          >
                            📋 Copy
                          </button>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{chunk}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
