# Social Media Kit

A comprehensive social media management tool designed to help you create, format, and post content across multiple platforms including LinkedIn, Twitter/X, and Bluesky. Features advanced styling, emoji support, OAuth authentication, and cross-platform posting capabilities.

## 🚀 Features

### 🌐 **Multi-Platform Support**
- **LinkedIn**: Full OAuth 2.0 integration with direct posting (3,000 character limit)
- **Twitter/X**: OAuth 2.0 authentication with automatic thread creation (280 character limit)
- **Bluesky**: App password authentication with native posting (300 character limit)
- **Platform Switching**: Easy platform selection with visual authentication status indicators
- **Smart Chunking**: Automatic text splitting based on platform-specific character limits

### ✨ **Advanced Text Formatting**
- **Bold Text**: Use `**text**` to create Unicode bold formatting (𝗯𝗼𝗹𝗱)
- **Italic Text**: Use `_text_` to create Unicode italic formatting (𝘪𝘵𝘢𝘭𝘪𝘤)
- **Cross-Platform Compatible**: Unicode characters work across all supported platforms
- **Live Preview**: Real-time preview of formatted text as you type
- **Intelligent Text Breaking**: Smart chunking at sentence and paragraph boundaries

### 🔐 **OAuth & Authentication**
- **Settings UI**: Built-in OAuth configuration panel with step-by-step instructions
- **LinkedIn OAuth**: OAuth 2.0 with `w_member_social` scope for posting
- **Twitter OAuth**: OAuth 2.0 with `tweet.read`, `tweet.write`, `users.read` scopes
- **Bluesky Authentication**: Secure app password system
- **Token Management**: Automatic token storage, persistence, and refresh handling
- **Visual Status**: Green checkmarks (✓) show authentication status for each platform

### 😊 **Comprehensive Emoji Picker**
- **6 Categories**: 
  - Smileys & People (100+ emojis)
  - Animals & Nature (100+ emojis)
  - Food & Drink (100+ emojis)
  - Activities (100+ emojis)
  - Travel & Places (100+ emojis)
  - Objects (150+ emojis)
  - Symbols (200+ emojis)
- **Easy Insertion**: Click any emoji to insert at cursor position
- **Grid Layout**: Organized 8-column grid for easy browsing

### 📝 **Post Management System**
- **Create & Edit**: Multiple posts with custom titles and content
- **Save & Load**: Export/import posts to/from JSON files
- **Post Switching**: Easy navigation between saved posts
- **Auto-Save**: Drafts automatically saved to localStorage
- **Post Counter**: Visual indicator of total saved posts

### ⏰ **Scheduling & Reminders**
- **Date/Time Picker**: Set reminders for when to post
- **32+ Timezone Support**: Global timezone selection including:
  - US timezones (Eastern, Central, Mountain, Pacific, Alaska, Hawaii)
  - European timezones (London, Paris, Berlin, Rome, etc.)
  - Asian timezones (Tokyo, Shanghai, Singapore, etc.)
  - And many more worldwide locations
- **Browser Notifications**: Get notified when it's time to post
- **Timezone Display**: Shows scheduled time in selected timezone

### 🎨 **User Experience**
- **Dark Mode**: Toggle between light and dark themes with persistence
- **Responsive Design**: Works on desktop and mobile devices
- **Visual Feedback**: Loading states, success/error messages, and status indicators
- **Character Counting**: Real-time word and character count with limit warnings
- **Multiple Copy Methods**: Clipboard API with fallbacks for different browsers

### 📱 **Direct Posting Capabilities**
- **One-Click Posting**: Post directly to authenticated platforms
- **Multi-Part Posts**: Automatic thread creation for long content
- **Posting Status**: Real-time feedback during posting process
- **Error Handling**: Clear error messages and retry options
- **Sequential Posting**: Automatic delays between multi-part posts

## 🛠️ Tech Stack

- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for responsive styling
- **Marked** for markdown parsing
- **DOMPurify** for safe HTML sanitization
- **localStorage** for data persistence

## 📦 Installation

### Prerequisites
- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd social-media-kit
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

### **1. Setting Up Authentication**
1. Click the **⚙️ Settings** button in the top header
2. Follow the platform-specific setup instructions:
   - **LinkedIn**: Get Client ID from LinkedIn Developer Portal
   - **Twitter**: Get Client ID from Twitter Developer Portal  
   - **Bluesky**: Generate app password in Bluesky settings
3. Paste your credentials and they'll be automatically saved

### **2. Writing Your Post**
- Type your content in the main text area
- Use `**text**` for bold formatting
- Use `_text_` for italic formatting
- Watch the character count and platform limits

### **3. Adding Emojis**
- Click the **😊 Emojis** button (positioned with Bold/Italic buttons)
- Browse through 6 organized categories
- Click any emoji to insert it at your cursor position
- The picker closes automatically after selection

### **4. Platform Selection & Posting**
- **Select Platform**: Choose from LinkedIn (💼), Twitter/X (🐦), or Bluesky (🦋)
- **Authentication**: Click "Login" if you see a not-connected status
- **Direct Posting**: Click "Post to [Platform]" to publish directly
- **Copy Option**: Use "📋 Copy for [Platform]" if you prefer manual posting
- **Thread Handling**: Long posts are automatically split into threads

### **5. Managing Multiple Posts**
- Click **📝 Posts** to access the post manager
- **Create**: Use "➕ New Post" to create additional posts
- **Switch**: Click any post to switch to editing it
- **Export/Import**: Use "💾 Save" and "📁 Load" to backup/restore posts
- **Organize**: Edit post titles by clicking on them

### **6. Scheduling Reminders**
- Use the "Schedule Post Reminder" datetime picker
- Select your timezone from 32+ global options
- Browser notifications will alert you at the scheduled time
- Reminders persist across browser sessions

### **7. Dark Mode**
- Click the **🌙 Dark Mode** / **🌞 Light Mode** toggle
- All interface elements adapt to your chosen theme
- Your preference is automatically saved

## 🔧 Features in Detail

### **Unicode Text Formatting**
The app converts markdown syntax to Unicode characters that work across all platforms:
- `**bold text**` → **𝗯𝗼𝗹𝗱 𝘁𝗲𝘅𝘁**
- `_italic text_` → _𝘪𝘵𝘢𝘭𝘪𝘤 𝘵𝘦𝘹𝘵_

### **Smart Text Chunking**
Automatically splits long content based on platform limits:
- **LinkedIn**: 3,000 characters (generous limit for long-form content)
- **Twitter/X**: 280 characters (creates automatic threads)
- **Bluesky**: 300 characters (creates post series)

Chunking intelligently breaks at:
1. Sentence endings (., !, ?)
2. Paragraph breaks (\n\n)
3. Line breaks (\n)
4. Word boundaries (spaces)

### **Persistent Storage**
- **Drafts**: Auto-saved to localStorage as you type
- **Posts**: All posts saved locally with export/import capability
- **Settings**: OAuth configurations and preferences persist
- **Authentication**: Tokens securely stored locally
- **Theme**: Dark mode preference remembered

### **Platform Character Limits**
- **LinkedIn**: 3,000 characters (professional long-form posts)
- **Twitter/X**: 280 characters (concise microblogging)
- **Bluesky**: 300 characters (short-form social content)

## 🌟 Tips for Best Results

1. **Authentication First**: Set up your OAuth credentials in Settings before posting
2. **Use Formatting Wisely**: Bold text draws attention - use sparingly for key points
3. **Emoji Enhancement**: Use relevant emojis to make posts more engaging and visual
4. **Platform Optimization**: Tailor content length and style to each platform's audience
5. **Test Posting**: Verify authentication and test with short posts first
6. **Schedule Strategically**: Set reminders for optimal posting times for your audience
7. **Backup Posts**: Regularly export your posts to avoid losing content
8. **Preview Before Posting**: Always review the formatted preview before publishing

## 🐛 Troubleshooting

### **Authentication Issues**
- **"CLIENT ID NOT CONFIGURED"**: Open ⚙️ Settings and enter your platform credentials
- **OAuth redirect fails**: Verify redirect URLs match exactly in developer portals
- **Token expired**: Re-authenticate by clicking "Login" again

### **Posting Problems**
- **API errors**: Check your API permissions and rate limits in developer portals
- **Network issues**: Verify internet connection and try again
- **Platform downtime**: Check if the social media platform is experiencing issues

### **Browser Compatibility**
- **Copy function not working**: Try the "🖱️ Select All Text" button for manual copy
- **Notifications not working**: Check browser notification permissions
- **Dark mode issues**: Refresh the page if theme doesn't apply completely

### **Development vs Production**
- **Local development**: Uses `http://localhost:5173` redirect URIs
- **Production deployment**: Update redirect URIs to your production domain
- **CORS issues**: Ensure your app is running on the correct domain

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

---

**Made with ❤️ for better social media content creation and cross-platform posting**
