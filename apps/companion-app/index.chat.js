import {AppRegistry} from 'react-native';
import CompanionChatApp from './src/entries/chat';
import {name as appName} from './app.json';

const hostAppNames = [appName, 'OpappWindowsHost'];

for (const registeredName of hostAppNames) {
  AppRegistry.registerComponent(registeredName, () => CompanionChatApp);
}
