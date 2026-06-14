import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const privacyPolicy = `Privacy Policy

Last updated: June 2, 2026

OVERVIEW

Bookshelf is a simple, privacy-first book tracking application. Your data is stored entirely in your own GitHub repository — we do not collect, store, or access any of your personal information on our servers.

DATA COLLECTION

We do not collect any data. Bookshelf:
• Does not track your usage
• Does not send data to our servers
• Does not use analytics or advertising
• Does not store your books, ratings, or notes anywhere except your GitHub repository

HOW YOUR DATA IS STORED

All your book data (titles, authors, ratings, notes, reviews) is stored as Markdown files in a GitHub repository that you control. This data is:
• Stored only on GitHub's servers
• Under your complete control
• Accessible only to you and anyone you choose to grant access

GITHUB INTEGRATION

Bookshelf requires a GitHub account to function. When you connect your GitHub account:
• We use standard GitHub OAuth for authentication
• We do not store your GitHub token or credentials on our servers
• We only access your repositories that you explicitly authorize
• Your GitHub usage is subject to GitHub's Terms of Service

YOUR RIGHTS

Since all your data is stored in your own GitHub repository:
• You own your data completely
• You can export it anytime (all files are plain Markdown)
• You can delete it anytime
• You can use it with any tools you want

SECURITY

Your data security depends on:
• GitHub's security measures
• Your GitHub account password and two-factor authentication
• Access permissions you set on your repository

We recommend:
• Using a strong GitHub password
• Enabling two-factor authentication on GitHub
• Keeping your repository private if you don't want to share your book list

CONTACT

If you have questions about this privacy policy or Bookshelf:
• Open an issue on GitHub: github.com/barcodex/bookshelf-app
• Email: anvarzon.zurajev@gmail.com`;

export default function LegalScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.text}>{privacyPolicy}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  text: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333',
    fontFamily: 'Menlo',
  },
});
