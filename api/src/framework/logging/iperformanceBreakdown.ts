import {IDisposable} from '../utilities/idisposable';

/*
 * Represents a time measurement within an API operation
 * These operations are exported and this interface can be used from business logic via the ILogEntry
 */
export interface IPerformanceBreakdown extends IDisposable {

    // Set details to associate with the performance breakdown
    // One use case would be to log SQL with input parameters
    setDetails(value: string): void;
}
