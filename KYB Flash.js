const newman = require('newman');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// All file paths should be relative to where you run the script.
const COLLECTION_FILE = 'KYBBatchRun.postman_collection.json'; //postman_collection.json with variables 
const DATA_FILE = 'Data.csv'; // csv header should match the variable in postman_collection
const OUTPUT_FILE = 'Business_Verification_Results.csv';
const INTERMEDIATE_JSON_FILE = 'cleaned_api_responses.json'; // For raw json output
const NEWMAN_ITERATIONS = 50; // Set number according to number of records to run

/**
 * =============================================================================
 * STEP 1: RUN THE NEWMAN COLLECTION
 * =============================================================================
 * This section executes the Postman/Newman collection programmatically.
 */
console.log('Starting Newman batch run...');

newman.run({
    collection: require(path.join(__dirname, COLLECTION_FILE)),
    iterationData: path.join(__dirname, DATA_FILE),
    iterationCount: NEWMAN_ITERATIONS,
    reporters: 'cli'
}, (err, summary) => {
    if (err) {
        console.error('Newman run failed!', err);
        throw err;
    }

    console.log('Newman run complete.');

    try {
        // Pass the summary object to the next step.
        const cleanedResponses = cleanNewmanResults(summary);

        // --- TROUBLESHOOTING STEP ADDED ---
        // Save the cleaned JSON data to a file so we can inspect it.
        console.log(`Saving intermediate JSON file to: ${INTERMEDIATE_JSON_FILE}`);
        fs.writeFileSync(INTERMEDIATE_JSON_FILE, JSON.stringify(cleanedResponses, null, 2), 'utf8');
        // ------------------------------------
        
        const csvContent = convertJsonToCsv(cleanedResponses);
        
        fs.writeFileSync(OUTPUT_FILE, csvContent, 'utf8');
        console.log(`✅ Success! Report saved to: ${OUTPUT_FILE}`);

    } catch (processingError) {
        console.error('❌ Error processing Newman results:', processingError.message);
    }
});


/**
 * =============================================================================
 * STEP 2: CLEAN THE RAW NEWMAN OUTPUT
 * =============================================================================
 * @param {object} newmanSummary - The summary object from the newman.run callback.
 * @returns {object[]} An array of cleaned response objects.
 */
function cleanNewmanResults(newmanSummary) {
    console.log('Cleaning API responses...');
    return newmanSummary.run.executions.map(execution => {
        // Handle cases where a request might have failed and has no response.
        if (!execution.response) {
            return {
                requestName: execution.item.name,
                statusCode: null,
                responseBody: { error: 'No response received for this request.' }
            };
        }

        const response = execution.response;
        let responseBody = null;

        if (response.stream) {
            try {
                const bodyAsString = response.stream.toString();
                responseBody = JSON.parse(bodyAsString);
            } catch (e) {
                responseBody = { error: `Error parsing JSON response: ${e.message}` };
            }
        }

        return {
            requestName: execution.item.name,
            statusCode: response.code,
            responseBody: responseBody
        };
    });
}


/**
 * =============================================================================
 * STEP 3: CONVERT CLEANED JSON TO CSV
 * =============================================================================
 */
function convertJsonToCsv(cleanedData) {
    console.log('Converting JSON data to CSV format...');

    const findFieldData = (appendedFields, fieldName, defaultValue = '') => {
        if (!Array.isArray(appendedFields)) return defaultValue;
        const field = appendedFields.find(f => f.FieldName === fieldName);
        return field ? field.Data : defaultValue;
    };

    const formatDirectors = (directorsJsonStr) => {
        if (!directorsJsonStr) return "";
        try {
            // The data might already be an object if it was parsed correctly upstream.
            const directorsData = typeof directorsJsonStr === 'string' ? JSON.parse(directorsJsonStr) : directorsJsonStr;
            const directorsList = directorsData.StandardizedDirectorsOfficers || [];
            return directorsList.map(dir => `${dir.FullName || 'N/A'} (${dir.Position || 'N/A'})`).join("\n");
        } catch (e) { return "Invalid JSON for Directors"; }
    };

    const formatOwnership = (ownershipJsonStr) => {
        if (!ownershipJsonStr) return "";
        try {
            // The data might already be an object.
            const ownershipData = typeof ownershipJsonStr === 'string' ? JSON.parse(ownershipJsonStr) : ownershipJsonStr;
            const owners = (ownershipData.Ownerships || []).filter(o => o.DegreeOfSeparation > 0);
            return owners.map(owner => `${owner.FullName || 'N/A'} (${owner.BeneficiaryType || 'N/A'})`).join("\n");
        } catch (e) { return "Invalid JSON for Ownership"; }
    };
    
    const processedData = cleanedData.map(entry => {
        const record = entry.responseBody?.Record || {};
        if (!record || entry.responseBody.error) return null;

        const datasources = record.DatasourceResults || [];
        let sourceData = datasources.find(ds => ds.DatasourceName === 'Comprehensive View' && ds.AppendedFields);
        if (!sourceData) {
            sourceData = datasources.find(ds => ds.DatasourceName?.includes('Business Insights') && ds.AppendedFields);
        }
        
        const appendedFields = sourceData?.AppendedFields || [];

        const year = findFieldData(appendedFields, 'YearOfIncorporation');
        const month = findFieldData(appendedFields, 'MonthOfIncorporation');
        const day = findFieldData(appendedFields, 'DayOfIncorporation');
        const incorporationDate = (year && month && day) ? `${year}-${month}-${day}` : "";

        return {
            'Transaction ID': entry.responseBody?.TransactionID || '',
            'Overall Status': record.RecordStatus || '',
            'Country': entry.responseBody?.CountryCode || '',
            'Business Name': findFieldData(appendedFields, 'BusinessName'),
            'Business Registration Number': findFieldData(appendedFields, 'BusinessRegistrationNumber'),
            'Tax ID Number': findFieldData(appendedFields, 'TaxIDNumber'),
            'Business Status': findFieldData(appendedFields, 'BusinessStatus'),
            'Legal Form': findFieldData(appendedFields, 'BusinessLegalForm'),
            'Full Address': findFieldData(appendedFields, 'Address1'),
            'Incorporation Date': incorporationDate,
            'Directors & Officers': formatDirectors(findFieldData(appendedFields, 'StandardizedDirectorsOfficers')),
            'Ownership': formatOwnership(findFieldData(appendedFields, 'StandardizedCompanyOwnershipHierarchy'))
        };
    }).filter(Boolean); // Filter out any null entries from failed responses

    if (processedData.length === 0) {
        console.log("No data processed. The output file will be empty.");
        return "";
    }

    // --- CSV file generation ---

    const fieldnames = [
        'Transaction ID', 'Overall Status', 'Country', 'Business Name',
        'Business Registration Number', 'Tax ID Number', 'Business Status',
        'Legal Form', 'Full Address', 'Incorporation Date',
        'Directors & Officers', 'Ownership'
    ];
    
    const escapeCsvCell = (cell) => {
        const cellStr = (cell === null || cell === undefined) ? '' : String(cell);
        // If the cell contains a comma, newline, or double quote, wrap it in double quotes.
        if (/[",\n]/.test(cellStr)) {
            // Also, double up any existing double quotes.
            return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
    };

    const header = fieldnames.join(',');
    const rows = processedData.map(row => {
        return fieldnames.map(fieldName => escapeCsvCell(row[fieldName])).join(',');
    });
    
    return [header, ...rows].join('\n');
}

