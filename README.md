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

## Book File Format

Each book is a Markdown file `books/<slug>.md` with YAML frontmatter and two sections, `## Резюме` (summary) and `## Отзыв` (review):

```markdown
---
title: Оппенгеймер. Альтернатива
original_title: The Oppenheimer Alternative
author: Роберт Сойер
year: 2020
original_language: en
media: аудио
tags: альтернативная история
rating: 8
date_started: 2026-10-22
date_finished: 2026-11-05
---
```

| Field | Meaning |
|---|---|
| `date_started` | When reading started (`YYYY-MM-DD` or `YYYY`) |
| `date_finished` | When reading finished; empty while reading |
| `date_abandoned` | Set instead of `date_finished` when the book was dropped (the “Abandon book” button on a book you are reading). Such books leave the timeline and appear in the collapsed “Abandoned” section at the bottom |
| `abandoned_at` | Optional, only with `date_abandoned`: where you stopped, free text such as `30%` or `chapter 5` |

## Film File Format

Films live next to books in `movies/<director-surname>-<title>.md`, with the same two sections:

```markdown
---
title: Солярис
director: Андрей Тарковский
year: 1972
imdb: https://www.imdb.com/title/tt0069293/
tags: фантастика
rating: 9
date_watched: 2026-10-20
---
```

| Field | Meaning |
|---|---|
| `original_title` | Only when it differs from `title` |
| `imdb` | Link to the film on IMDb; the app also accepts a bare `tt…` id and stores the full link |
| `rating` | 1–10; not set together with `abandoned` |
| `abandoned` | `true` when the film was not watched to the end (“Not finished” checkbox, which clears the rating; picking a rating clears the checkbox); omitted otherwise. The film stays in the timeline on its date |
| `date_watched` | When you watched it (`YYYY-MM-DD` or `YYYY`) |

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
