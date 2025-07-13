# LinkedIn Post Formatter

A powerful web application designed to help you create, format, and optimize your LinkedIn posts with advanced styling, emoji support, and convenient features.

## 🚀 Features

### ✨ **Text Formatting**
- **Bold Text**: Use `**text**` to create bold formatting with Unicode characters
- **Italic Text**: Use `_text_` to create italic formatting with Unicode characters
- **LinkedIn-Compatible**: All formatting uses Unicode characters that work perfectly on LinkedIn

### 😊 **Comprehensive Emoji Picker**
- **6 Categories**: Smileys & People, Animals & Nature, Food & Drink, Activities, Travel & Places, Objects, Symbols
- **Hundreds of Emojis**: Extensive collection organized by category
- **Easy Selection**: Click any emoji to insert it at your cursor position
- **Search-Friendly**: Well-organized categories for quick access

### 🎨 **User Experience**
- **Dark Mode**: Toggle between light and dark themes
- **Live Preview**: Real-time markdown preview as you type
- **Word/Character Count**: Track your post length
- **Auto-Save**: Your drafts are automatically saved in local storage

### 📋 **Copy & Paste**
- **Stylized Copy**: Copy text with Unicode formatting for LinkedIn
- **Fallback Options**: Multiple copy methods for different browsers
- **Manual Selection**: Select formatted text manually if needed

### ⏰ **Scheduling**
- **Post Reminders**: Set datetime reminders for when to post
- **Browser Notifications**: Get notified when it's time to post
- **Persistent Settings**: Reminder settings saved across sessions

## 🛠️ Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Marked** for markdown parsing
- **DOMPurify** for safe HTML sanitization

## 📦 Installation

### Prerequisites
- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd linkedin-post-formatter-with-x
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to `http://localhost:5173` (or the port shown in terminal)
   - The app will automatically reload when you make changes

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## 🎯 How to Use

### **1. Writing Your Post**
- Type your content in the main text area
- Use `**text**` for bold formatting
- Use `_text_` for italic formatting
- Watch the live preview update as you type

### **2. Adding Emojis**
- Click the "😊 Emojis" button
- Browse through organized categories
- Click any emoji to insert it at your cursor position
- The picker will close automatically after selection

### **3. Formatting Options**
- **Bold Button**: Select text and click "Bold" to wrap with `**`
- **Italic Button**: Select text and click "Italic" to wrap with `_`
- **Manual Typing**: Type markdown syntax directly

### **4. Copying for LinkedIn**
- Click "📋 Copy Stylized for LinkedIn" to copy formatted text
- If that doesn't work, click "🖱️ Select All Styled Text" then Ctrl+C/Cmd+C
- Paste directly into LinkedIn - formatting will be preserved

### **5. Setting Reminders**
- Use the "Schedule Post Reminder" datetime picker
- Set when you want to be reminded to post
- Browser notifications will alert you at the scheduled time

### **6. Dark Mode**
- Click the "🌙 Dark Mode" toggle in the top-right
- All elements will switch to dark theme
- Your preference is saved for future sessions

## 🔧 Features in Detail

### **Unicode Text Formatting**
The app converts markdown syntax to Unicode characters that LinkedIn supports:
- `**bold**` → 𝗯𝗼𝗹𝗱
- `_italic_` → 𝘪𝘵𝘢𝘭𝘪𝘤

### **Smart Emoji Categories**
- **Smileys & People**: All face expressions, gestures, and people
- **Animals & Nature**: Animals, plants, weather, and nature
- **Food & Drink**: Food, fruits, vegetables, and beverages
- **Activities**: Sports, games, and recreational activities
- **Travel & Places**: Transportation, buildings, and locations
- **Objects**: Technology, tools, and everyday items
- **Symbols**: Hearts, arrows, signs, and special symbols

### **Persistent Storage**
- Draft content is auto-saved to localStorage
- Dark mode preference is remembered
- Schedule reminders persist across sessions

## 🌟 Tips for Best Results

1. **Use Bold Sparingly**: Bold text draws attention - use it for key points
2. **Emojis Add Personality**: Use relevant emojis to make posts more engaging
3. **Check Live Preview**: Always review the formatted preview before copying
4. **Test on LinkedIn**: Paste and check how it looks on LinkedIn before posting
5. **Schedule Wisely**: Set reminders for optimal posting times

## 🐛 Troubleshooting

### **Copy Function Not Working**
- Try the "Select All Styled Text" button for manual copy
- Ensure you're using a modern browser
- Check that clipboard permissions are enabled

### **Emojis Not Displaying**
- Update your browser to the latest version
- Some older systems may not support all Unicode emojis
- The app includes fallback options for better compatibility

### **Dark Mode Issues**
- Refresh the page if dark mode doesn't apply completely
- Clear localStorage if theme switching becomes inconsistent

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## 📧 Support

If you encounter any issues or have questions, please create an issue in the repository.

---

**Made with ❤️ for better LinkedIn posting experience**
