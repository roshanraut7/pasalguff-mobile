import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { Button } from 'heroui-native';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#0F172A', dark: '#020617' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
          contentFit="contain"
        />
      }
    >
      {/* HERO SECTION */}
      <ThemedView style={styles.heroContainer}>
        <HelloWave />

        <ThemedText style={styles.title}>
          Welcome to PasalGuff
        </ThemedText>

        <ThemedText style={styles.subtitle}>
          Discover, connect, and explore local businesses effortlessly.
        </ThemedText>

        <Button
          className="bg-blue-500"
          onPress={() => {
            alert('Get Started!');
          }}
        >
          Get Started
        </Button>
      </ThemedView>

      {/* FEATURES */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Why PasalGuff?</ThemedText>

        <ThemedText style={styles.featureText}>
          • Browse trending local shops 🛍️
        </ThemedText>
        <ThemedText style={styles.featureText}>
          • Connect with sellers instantly 💬
        </ThemedText>
        <ThemedText style={styles.featureText}>
          • Discover hidden gems near you 📍
        </ThemedText>
      </ThemedView>

      {/* NAVIGATION */}
      <ThemedView style={styles.section}>
        <Link href="/modal">
          <ThemedText style={styles.linkText}>
            Explore More →
          </ThemedText>
        </Link>
      </ThemedView>

      {/* FOOTER */}
      <ThemedView style={styles.footer}>
        <ThemedText style={styles.footerText}>
          Built with ❤️ using Expo
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
    gap: 10,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  featureText: {
    fontSize: 15,
    opacity: 0.8,
  },
  linkText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 13,
    opacity: 0.5,
  },
  reactLogo: {
    height: 160,
    width: 260,
    alignSelf: 'center',
    marginTop: 20,
  },
});