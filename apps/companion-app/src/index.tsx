import {createCompanionApp} from '@opapp/framework-companion-runtime';
import {mainCompanionBundleConfig} from './surfaces';

const CompanionApp = createCompanionApp(mainCompanionBundleConfig);

export default CompanionApp;
