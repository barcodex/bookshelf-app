# Bookshelf

A simple, privacy-first book tracking application for iOS and Android. Your data stays in your own GitHub repository — nothing is stored on our servers.

## Features

- 📱 Native iOS and Android app built with React Native
- 🔐 Complete data privacy — all data stored in your GitHub repo
- 🔄 Offline-first with automatic GitHub synchronization
- 🏷️ Powerful search and filtering by title, author, rating, tags, format
- 📊 Organized by year with media type breakdown
- 🎨 Lightweight and minimal design

## How It Works

1. Connect your GitHub account
2. Create a repository for your book data
3. Add books through the app (stored as Markdown files)
4. Sync changes across your devices via GitHub
5. Your data is always yours — export anytime

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g eas-cli`

### Installation

```bash
git clone https://github.com/barcodex/bookshelf-app.git
cd bookshelf-app
npm install
```

### Development

```bash
npm start
```

### Building

**With EAS (recommended):**
```bash
eas build --platform ios
eas build --platform android
```

**Locally:**
```bash
eas build --local --platform android
```

## Privacy

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for details. TL;DR: We don't collect any data. Your books are stored only in your GitHub repository.

## Support

If you find Bookshelf useful, consider supporting development:

[![Sponsor](https://img.shields.io/badge/GitHub-Sponsors-blue)](https://github.com/sponsors/barcodex)

Your support helps keep the project open source and privacy-focused.

## License

MIT License — see LICENSE file for details

## Contributing

Contributions welcome! Feel free to open issues or submit pull requests.

---

Made with ☕ by a book lover who values privacy
