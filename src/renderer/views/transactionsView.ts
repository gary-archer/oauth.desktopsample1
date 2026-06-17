import mustache from 'mustache';
import {ApiClient} from '../api/apiClient';
import {CompanyTransactions} from '../../shared/api/companyTransactions';
import {ErrorCodes} from '../../shared/errors/errorCodes';
import {UIError} from '../../shared/errors/uiError';
import {DomUtils} from './domUtils';

/*
 * The transactions view takes up the entire screen except for the header
 */
export class TransactionsView {

    private readonly apiClient: ApiClient;
    private readonly companyId: string;

    public constructor(apiClient: ApiClient, companyId: string) {
        this.apiClient = apiClient;
        this.companyId = companyId;
    }

    /*
    * Wait for data then render it
    */
    public async load(): Promise<void> {

        try {

            // Try to get data
            const data = await this.apiClient.getCompanyTransactions(this.companyId);

            // Render new content
            this.renderData(data);

        } catch (e: any) {

            const uiError = e as UIError;

            // Handle invalid input due to typing an id into the browser address bar
            if (uiError.getStatusCode() === 404 && uiError.getErrorCode() === ErrorCodes.companyNotFound) {

                // User typed an id value outside of valid company ids
                location.hash = '#';

            } else if (uiError.getStatusCode() === 400 && uiError.getErrorCode() === ErrorCodes.invalidCompanyId) {

                // User typed an invalid id such as 'abc'
                location.hash = '#';

            } else {

                // Clear existing content and rethrow
                DomUtils.text('#main', '');
                throw e;
            }
        }
    }

    /*
     * Render data after receiving it from the API
     */
    private renderData(data: CompanyTransactions): void {

        // Build a view model from the data
        const viewModel = {
            title: `Today's Transactions for ${data.company.name}`,
            transactions: data.transactions.map((transaction) => {
                return {
                    id: transaction.id,
                    investorId: transaction.investorId,
                    formattedAmountUsd: Number(transaction.amountUsd).toLocaleString(),
                };
            }),
        };

        const htmlTemplate =
            `<div class='mt-3'>
                <div class='bg-gray-100 p-3 text-center font-bold'>
                    {{title}}
                </div>
                <div class='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 p-3'>
                    {{#transactions}}
                        <div class='rounded-lg border border-gray-300'>
                            <div class='p-3'>
                                <div class='flex mt-1'>
                                    <div class='w-1/2'>Transaction ID</div>
                                    <div class='w-1/2 text-right font-bold text-blue-700'>{{id}}</div>
                                </div>
                                <div class='flex mt-1'>
                                    <div class='w-1/2'>Investor ID</div>
                                    <div class='w-1/2 text-right font-bold text-blue-700'>{{investorId}}</div>
                                </div>
                                <div class='flex mt-1'>
                                    <div class='w-1/2'>Amount USD</div>
                                    <div class='w-1/2 text-right font-bold text-green-700'>{{formattedAmountUsd}}</div>
                                </div>
                            </div>
                        </div>
                    {{/transactions}}
                </div>
            </div>`;

        // Update the main elemnent's content in a manner that handles dangerous characters correctly
        const html = mustache.render(htmlTemplate, viewModel);
        DomUtils.html('#main', html);
    }
}
