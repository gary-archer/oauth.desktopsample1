import mustache from 'mustache';
import {Company} from '../../shared/api/company';
import {ApiClient} from '../api/apiClient';
import {DomUtils} from './domUtils';

/*
 * The companies list view takes up the entire screen except for the header
 */
export class CompaniesView {

    private readonly apiClient: ApiClient;

    public constructor(apiClient: ApiClient) {
        this.apiClient = apiClient;
    }

    /*
     * Wait for data then render it
     */
    public async load(): Promise<void> {

        try {

            // Try to get data
            const data = await this.apiClient.getCompanyList();

            // Render new content
            this.renderData(data);

        } catch (e: any) {

            // Clear previous content on error
            DomUtils.text('#main', '');
            throw e;
        }
    }

    /*
     * Render HTML based on the API response
     */
    private renderData(data: Company[]): void {

        // Build a view model from the API data
        const viewModel = {} as any;
        viewModel.companies = data.map((company: Company) => {
            return {
                id: company.id,
                name: company.name,
                region: company.region,
                formattedTargetUsd: Number(company.targetUsd).toLocaleString(),
                formattedInvestmentUsd: Number(company.investmentUsd).toLocaleString(),
                noInvestors: company.noInvestors,
            };
        });

        // Construct a template
        const htmlTemplate =
            `<div class='mt-3'>
                <div class='grid grid-cols-12 bg-gray-100 p-3'>
                    <div class='col-span-2 font-bold text-center'>Account</div>
                    <div class='col-span-2 font-bold text-center'>Region</div>
                    <div class='col-span-2'></div>
                    <div class='col-span-2 font-bold text-right'>Target USD</div>
                    <div class='col-span-2 font-bold text-right'>Investment USD</div>
                    <div class='col-span-2 font-bold text-right'># Investors</div>
                </div>
                <div>
                    {{#companies}}
                        <div class='grid grid-cols-12 p-3 p-3 mt-5'>
                            <div class='col-span-2 text-center'>
                                {{name}}
                            </div>
                            <div class='col-span-2 text-center'>
                                {{region}}
                            </div>
                            <div class='col-span-2 text-center'>
                                <a href='#company={{id}}' class='text-blue-600 underline'>View Transactions</a>
                            </div>
                            <div class='col-span-2 text-green-700 font-bold text-right'>
                                {{formattedTargetUsd}}
                            </div>
                            <div class='col-span-2 text-green-700 font-bold text-right'>
                                {{formattedInvestmentUsd}}
                            </div>
                            <div class='col-span-2 font-bold text-right'>
                                {{noInvestors}}
                            </div>
                        </div>
                    {{/companies}}
                </div>
            </div>`;

        // Update the main elemnent's content in a manner that handles dangerous characters correctly
        const html = mustache.render(htmlTemplate, viewModel);
        DomUtils.html('#main', html);
    }
}
