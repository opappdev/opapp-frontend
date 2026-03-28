import {AppRegistry} from 'react-native';
import CompanionApp from './src/entries/main';
import {name as appName} from './app.json';

const hostAppNames = [appName, 'OpappWindowsHost'];

for (const registeredName of hostAppNames) {
  AppRegistry.registerComponent(registeredName, () => CompanionApp);
}
