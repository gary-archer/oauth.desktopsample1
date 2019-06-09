import {Logger} from 'winston';

/*
 * An interface that allows business logic to access logging objects
 */
export interface ILoggerFactory {

    // Used to log startup messages
    getStartupMessageLogger(name: string): Logger;

    // Handle exceptions starting the API
    logStartupError(exception: any): void;

    // Get the production logger, which outputs structured data
    getProductionLogger(): Logger;

    // Get a debug text logger for a developer PC
    getDevelopmentLogger(className: string): Logger;
}
