# KYB Flash
Go from data input to JSON + CSV in minutes

# KYB API Batch Processing Script

The Node.js script automates the process of running a Postman collection for KYB (Know Your Business) verification against a list of businesses in a CSV file. It uses Newman to execute the API requests, then parses the JSON responses to generate a clean, consolidated CSV report. You also get a compiled JSON file containing the actual API response from the KYB endpoint.

The shell script allows you to download KYB reports programmatically to share with customers.

## Features

* **Batch Processing**: Runs multiple business verifications from a single CSV data source.
* **Automated Reporting**: Parses complex JSON API responses to extract key data points (e.g., business status, registration numbers, addresses).
* **Data Formatting**: Intelligently formats nested data, such as lists of directors and owners, into a readable, multi-line format within the final CSV.
* **Raw JSON Output**: Returns a JSON file containing the raw API responses for easy inspection, sharing, debugging, and analytics.

## Prerequisites

Before you begin, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (version 14 or higher is recommended)
* [npm](https://www.npmjs.com/) (usually included with Node.js)

You will also need:
1.  A **Postman Collection** file, exported as a `.json` file with Variables in the body and an non-expired Bearer token
2.  An **Input Data** file in `.csv` format, ensure the Headers are the exact same (case-sensitive) as the Variables in your Postman Collection

### How to Export Your Postman Collection

1.  In the Postman application, find your collection in the left sidebar.
2.  Click the three dots (`...`) next to the collection name to open the options menu.
3.  Select **Export** from the dropdown menu.
4.  In the "Export Collection" dialog, choose the recommended format  (`Collection v2.1`).
5.  Click **Export** and save the file with a `.json` extension (e.g., `KYBBatchRun.postman_collection.json`) into your project directory.

## Setup

1.  **Place Files**: Place the `KYB Flash.js` script, your exported Postman collection `.json` file, and your `.csv` data file in the same directory.
2.  **Install Dependencies**: Open a terminal in the project directory and run the following command to install Newman:
    ```sh
    npm install newman
    ```

## Configuration

Before running the script, you must configure the constants at the top of the `KYB Flash.js` file:

* `COLLECTION_FILE`: The filename of your exported Postman collection (e.g., `'KYBBatchRun.postman_collection.json'`).
* `DATA_FILE`: The filename of your input data (e.g., `'Data.csv'`).
* `OUTPUT_FILE`: The desired filename for the final CSV report (e.g., `'Business_Verification_Results.csv'`).
* `INTERMEDIATE_JSON_FILE`: The filename for the raw JSON output, used for debugging (e.g., `'cleaned_api_responses.json'`).
* `NEWMAN_ITERATIONS`: **Crucially**, set this number to match the exact number of data rows in your `DATA_FILE` that you want to process, would recommend starting with a small number to ensure everything works as intended.

### Input File Requirements !!

* **Postman Collection**: Your Postman requests should use variables to represent the data that will come from the CSV file. For example, use `{{BusinessName}}` in your request body or URL where the business name should be inserted.
* **Data CSV File**: The header row of your CSV file is critical. The column headers **must exactly match** the variable names you used in your Postman collection.

    **Example `Data.csv`:**
    ```csv
    BusinessName,CountryCode,RegistrationNumber
    Example Corp,CA,123456789
    Test Inc,US,987654321
    ```

## Usage

Once the setup and configuration are complete, run the script from your terminal:

```sh
node "KYB Flash.js"
```
