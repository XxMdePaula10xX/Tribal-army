import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { GameOverScreen } from '@/screens/GameOverScreen';
import { GameScreen } from '@/screens/GameScreen';
import { MenuScreen } from '@/screens/MenuScreen';
import { SetupScreen } from '@/screens/SetupScreen';
import { useGame } from '@/state/store';

export default function App() {
  const screen = useGame((s) => s.screen);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {screen === 'menu' && <MenuScreen />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'playing' && <GameScreen />}
      {screen === 'gameover' && <GameOverScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a1410' },
});
