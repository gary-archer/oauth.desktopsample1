import * as winston from 'winston';
import {FrameworkConfiguration} from '../configuration/frameworkConfiguration';
import {ExceptionHelper} from '../errors/exceptionHelper';
import {ILoggerFactory} from '../logging/iloggerFactory';
import {LogEntry} from './logEntry';
import {LogLevel} from './logLevel';
import {PerformanceThreshold} from './performanceThreshold';

/*
 * A default logging implementation
 */
export class LoggerFactory implements ILoggerFactory {

    // The API name
    private _apiName: string;

    // Log levels
    private _productionLevel: string;
    private _developmentLevel: string;
    private _developmentOverrideLevels: LogLevel[];

    // Performance thresholds
    private _defaultPerformanceThresholdMilliseconds: number;
    private _thresholdOverrides: PerformanceThreshold[];

    // The production logger
    private _productionLogger!: winston.Logger;

    /*
     * Set defaults
     */
    public constructor() {

        this._apiName = '';

        // Set default log levels
        this._productionLevel = 'info';
        this._developmentLevel = 'info';
        this._developmentOverrideLevels = [];

        // Set default performance thresholds
        this._defaultPerformanceThresholdMilliseconds = 1000;
        this._thresholdOverrides = [];

        // Create the production logger with the default log level
        this._productionLogger = this._createProductionLogger();
    }

    /*
     * Configure at application startup from a dynamic object similar to that used in .Net Core
     */
    public configure(configuration: FrameworkConfiguration): void {

        // Initialise behaviour
        this._apiName = configuration.apiName;
        this._setLogLevels(configuration.logging.levels);
        this._setPerformanceThresholds(configuration.logging.performanceThresholdsMilliseconds);

        // Now that we've initialised correctly, recreate the production logger with the correct log level
        this._productionLogger = this._createProductionLogger();
    }

    /*
     * Special handling for startup errors
     */
    public logStartupError(exception: any): void {

        // Get the error into a loggable format
        const error = ExceptionHelper.fromException(exception, this._apiName);

        // Create a log entry and set error details
        const logEntry = new LogEntry(this._apiName);
        logEntry.setPerformanceThresholds(this._defaultPerformanceThresholdMilliseconds, this._thresholdOverrides);
        logEntry.setOperationName('startup');
        logEntry.setError(error);
        logEntry.write(this._productionLogger);
    }

    /*
     * Create a production logger that logs every request as a JSON object
     */
    public getProductionLogger(): winston.Logger {
        return this._productionLogger;
    }

    /*
     * Create an info level text logger
     */
    public getStartupMessageLogger(name: string): winston.Logger {
        return this._createTextLogger(name, 'info');
    }

    /*
     * Create a named logger for debug messages which are only output on a developer PC
     */
    public getDevelopmentLogger(name: string): winston.Logger {

        // Get the configured level for this logger
        let level = this._developmentLevel;
        const found = this._developmentOverrideLevels.find((l) => l.name.toLowerCase() === name.toLowerCase());
        if (found) {
            level = found.level;
        }

        return this._createTextLogger(name, level);
    }

    /*
     * Use the logging configuration to create a log entry
     */
    public createLogEntry(): LogEntry {
        const logEntry = new LogEntry(this._apiName);
        logEntry.setPerformanceThresholds(this._defaultPerformanceThresholdMilliseconds, this._thresholdOverrides);
        return logEntry;
    }

    /*
     * Initialise after configuration has been read
     */
    private _setLogLevels(logLevels: any) {

        // Initialise colours
        winston.addColors({
            error: 'red',
            info: 'white',
            warn: 'yellow',
        });

        // Set default levels
        if (logLevels.production) {
            this._productionLevel = logLevels.production;
        }
        if (logLevels.development) {
            this._developmentLevel = logLevels.development;
        }

        // Support overrides to enable logging per class
        if (logLevels.developmentOverrides) {
            for (const name in logLevels.developmentOverrides) {
                if (name) {
                    const level = logLevels.developmentOverrides[name];
                    const logLevel = {
                        name,
                        level,
                    } as LogLevel;

                    this._developmentOverrideLevels.push(logLevel);
                }
            }
        }
    }

    /*
     * Handle performance thresholds
     */
    private _setPerformanceThresholds(thresholds: any) {

        // Set a default
        if (thresholds.default >= 0) {
            this._defaultPerformanceThresholdMilliseconds = thresholds.default;
        }

        // Support operation specific overrides
        if (thresholds.operationOverrides) {
            for (const name in thresholds.operationOverrides) {
                if (name) {
                    const milliseconds = thresholds.operationOverrides[name];
                    const performanceThreshold = {
                        name,
                        milliseconds,
                    };

                    this._thresholdOverrides.push(performanceThreshold);
                }
            }
        }
    }

    /*
     * Create a production logger that logs every request as a JSON object
     */
    private _createProductionLogger(): winston.Logger {

        // Print a bare JSON object with a property per line
        const jsonFormatter = winston.format.printf((logEntry: any) => {
            return JSON.stringify(logEntry.message, null, 2);
        });

        const consoleOptions = {
            format: winston.format.combine(
                jsonFormatter,
            ),
        };

        // Logging is info level, lightweight and always on
        return winston.createLogger({
            level: this._productionLevel,
            transports: [
                new (winston.transports.Console)(consoleOptions),
            ],
        });
    }

    /*
     * Create a simple text logger
     */
    private _createTextLogger(name: string, level: string): winston.Logger {

        // Use the name as a prefix
        const consoleOptions = {
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.printf((info) => `${info.level}: ${info.timestamp} : ${name} : ${info.message}`),
            ),
        };

        // Create the logger
        return winston.createLogger({
            level,
            transports: [
                new (winston.transports.Console)(consoleOptions),
            ],
        });
    }
}
