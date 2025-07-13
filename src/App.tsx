import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

function App() {
  const [text, setText] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [notificationScheduled, setNotificationScheduled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("linkedinDraft");
    const dark = localStorage.getItem("darkMode");
    const schedule = localStorage.getItem("scheduleTime");
    if (saved) setText(saved);
    if (dark === "true") setDarkMode(true);
    if (schedule) setScheduleTime(schedule);
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
      const unicodeText = toUnicodeStyle(text);
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(unicodeText);
        alert("✅ Stylized text copied to clipboard! You can now paste it into LinkedIn.");
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = unicodeText;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          alert("✅ Stylized text copied to clipboard! You can now paste it into LinkedIn.");
        } else {
          throw new Error("Copy command failed");
        }
      }
    } catch (err) {
      console.error('Copy failed:', err);
      alert("❌ Failed to copy stylized text. Please manually copy the text from the preview below.");
    }
  };

  useEffect(() => {
    if (!scheduleTime || notificationScheduled) return;

    const now = new Date();
    const target = new Date(scheduleTime);
    const delay = target.getTime() - now.getTime();

    if (delay <= 0) return;

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const timeout = setTimeout(() => {
      new Notification("⏰ Reminder", {
        body: "Time to post your content on LinkedIn!",
      });
      setNotificationScheduled(false);
    }, delay);

    setNotificationScheduled(true);
    return () => clearTimeout(timeout);
  }, [scheduleTime, notificationScheduled]);

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"} min-h-screen p-6`}>
      <div className={`max-w-4xl mx-auto p-6 rounded-2xl shadow-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">LinkedIn Post Formatter</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>

        <div className="flex gap-2 mb-2">
          <button onClick={() => applyMarkdown("**")} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-sm">Bold</button>
          <button onClick={() => applyMarkdown("_")} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-sm">Italic</button>
          <button onClick={() => applyMarkdown("🎉 ")} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-xl text-sm">🎉 Emoji</button>
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

        <div className={`flex justify-between items-center mb-4 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
          <span>{text.length} characters</span>
        </div>

        <div className="mb-4">
          <label className={`block mb-1 text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Schedule Post Reminder
          </label>
          <input
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${darkMode ? "bg-gray-700 text-white border-gray-600" : "bg-white text-gray-800"}`}
          />
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={handleCopyStyled} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl">
            📋 Copy Stylized for LinkedIn
          </button>
          <button 
            onClick={() => {
              const styledText = toUnicodeStyle(text);
              const tempDiv = document.createElement('div');
              tempDiv.textContent = styledText;
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
            🖱️ Select All Styled Text
          </button>
        </div>



        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Live Preview</h2>
          <div className={`prose max-w-none p-4 border rounded-xl ${darkMode ? "prose-invert bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-800"}`}
            dangerouslySetInnerHTML={{ __html: getMarkdownPreview() }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
