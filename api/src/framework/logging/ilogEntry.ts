import {IDisposable} from '../utilities/idisposable';
import {IPerformanceBreakdown} from './iperformanceBreakdown';

/*
 * Each API request writes a structured log entry containing fields we will query by
 * These operations are exported and this interface can be injected into business logic
 */
export interface ILogEntry {

    // Business logic must set the operation name, since we cannot derive it generically
    setOperationName(name: string): void;

    // Create a performance breakdown for business logic
    createPerformanceBreakdown(name: string): IPerformanceBreakdown;

    // Add text logging from business logic (not recommended)
    addInfo(info: string): void;

    // Start a child operation (used rarely)
    // Our sample uses it to log authentication separately to the business operation
    startChildOperation(name: string): IDisposable;
}
