import fs from 'fs-extra';
import {Configuration} from './configuration';

/*
 * Load the desktop configuration file
 */
export class ConfigurationLoader {

    /*
     * We download user info from the API so that we can get any data we need
     */
    public static load(configFilePath: string): Configuration {

        const configurationJson = fs.readFileSync(configFilePath, 'utf8');
        return JSON.parse(configurationJson) as Configuration;
    }
}
