#!/bin/bash

# ====================================================================================
# Bash Script to Bulk Download PDF Reports via cURL
#
# Description:
# This script reads a list of transaction IDs from a CSV file, then uses cURL
# to download a PDF report for each ID. It includes error checking to
# ensure that only valid PDFs are saved.
#
# Prerequisites:
# 1. A CSV file named 'transactions.csv' in the same directory as this script.
#    The first line must be a header (e.g., "transactionId").
# 2. `curl` must be installed on your system
#
# How to run:
# 1. Save this file as `download_reports.sh`.
# 2. Open Terminal.
# 3. Make the script executable by running: chmod +x download_reports.sh
# 4. Execute the script: ./download_reports.sh
# ====================================================================================

# --- Configuration ---

# The CSV file containing the transaction IDs.
CSV_FILE="transactions.csv"

# The directory where the downloaded PDFs will be saved.
OUTPUT_DIR="Trulioo_Reports"

# Your API authentication token (e.g., Bearer Token).
# IMPORTANT: Replace "YOUR_API_KEY_HERE" with your actual API key or token.
AUTH_TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6Ijk0NTMwN0NDNzk1REZBOTI3MEYzRjlDM0JENTczODIzIiwidHlwIjoiSldUIn0.eyJpc3MiOiJodHRwczovL2lkZW50aXR5LnRydWxpb28uY29tLyIsIm5iZiI6MTc1MzMzMzk1NywiaWF0IjoxNzUzMzMzOTU3LCJleHAiOjE3NTMzMzU3NTcsImF1ZCI6WyJ1cm46dHJ1bGlvby1jb206ZW5yb2xsbWVudC5hcGkucHJvZCIsInVybjp0cnVsaW9vLWNvbTpuYXBpLmFwaS5wcm9kIiwidXJuOnRydWxpb28tY29tOndvcmtmbG93LXN0dWRpby5hcGkucHJvZCJdLCJzY29wZSI6WyJlbnJvbGxtZW50LmFwaSIsIm5hcGkuYXBpIiwid29ya2Zsb3cuc3R1ZGlvLmFwaSJdLCJjbGllbnRfaWQiOiIxNDkxNWUyNmFhZGM4cTQyZDlBOTg3ZnNhMjdiM2ViNTBmNjIiLCJzdWIiOiJjZjEzNDBhZS01MmVlLTRlOTMtYWFjNC0wN2Q2MzJkYTA1ZjkiLCJhdXRoX3RpbWUiOjE3NTMzMzM5NTcsImlkcCI6Imh0dHBzOi8vaWRlbnRpdHkudHJ1bGlvby5jb20vIiwiYXBpX2NyZWRlbnRpYWxfaWRlbnRpZmllciI6ImMzNjcxMjZjLWJjMGEtNDRiNi04NTJmLWYzYjM2MjI4ZTdjMCIsInByb2R1Y3RfcGFja2FnZXMiOlsiYWxsIl0sInJvbGVzIjpbIlJ1blRyYW5zYWN0aW9uIiwiRW50aXR5TWFuYWdlciJdLCJ0cmFuc2FjdGlvbl90eXBlcyI6WyJMaXZlIiwiRGVtbyJdLCJhY2NvdW50X2lkZW50aWZpZXIiOiJjODgwNmI5Ni1jNGM0LTQ4MzItOTA4NC02ZGNmZWY1MGZlODkiLCJ2ZXJzaW9uIjoiYXBpLmNyZWRlbnRpYWwudjIiLCJ1c2VyX25hbWUiOiJQREQtVGVzdC1BY2NvdW50LVNlcnZpY2UtV29ya2VyLTE3NTMyMzQzNjMiLCJzb3VyY2UiOiJuYXBpIiwianRpIjoiMEVFMTlBREVBNjg5MUEzQ0U2QTczNDkwOTc4QUZBNUMiLCJjbGllbnRfbmFtZSI6IkJhdGNoLiBUZXN0In0.Hn2vTgiOwdUTkfBmX-jHPwDA5SJHHL4rOOUZm2xhQWbNWC05UgLTjD9KMFvAdeG6uVoRIS3zWUzcZ7Fs64AN7WEFgqGyB2WN8j_-6oc7eegA3-tmXgKmCng0IlOgh51UgJ4bsgPPD_V7dmcZg3wEBaOeKXVyuY4-_1RwFl1_C2xysmtmzRu5qSNgSY5Oe2YRPbO262473D6LhXv5UTmAQqgMM3iVj7VvpyVfOqoLI2X-52w8mstMdFBX0c3-2wCDIMKS41G2ygJEH2JEXVtvMAjylhqLS_ZdTv3MVJFwzsTBNQIlcjtENm40PqBjFDCq8UuGCBW5xgF804AyQw4lhw"

# --- Script Logic ---

# Check if the CSV file exists
if [ ! -f "$CSV_FILE" ]; then
    echo "Error: CSV file not found at '$CSV_FILE'"
    exit 1
fi

# Create the output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"
echo "PDFs will be saved in the '$OUTPUT_DIR' directory."

# Create a temporary file to store the download before validation
TEMP_FILE=$(mktemp)
# Ensure the temporary file is removed when the script exits
trap 'rm -f "$TEMP_FILE"' EXIT

# Read the CSV file, skipping the header line with `tail -n +2`
tail -n +2 "$CSV_FILE" | while IFS=, read -r transactionId || [ -n "$transactionId" ]; do
    # Trim potential whitespace or hidden characters from the transactionId
    cleanTransactionId=$(echo "$transactionId" | tr -d '[:space:]')

    # Skip empty lines
    if [ -z "$cleanTransactionId" ]; then
        continue
    fi

    # Construct the full API URL
    API_URL="https://api.trulioo.com/v3/business/report/$cleanTransactionId"
    OUTPUT_FILE="$OUTPUT_DIR/$cleanTransactionId.pdf"

    echo "--------------------------------------------------"
    echo "Processing Transaction ID: $cleanTransactionId"

    # Use cURL to download the file and capture the HTTP status code
    # --write-out '%{http_code}' prints the status code after the transfer
    # --silent hides the progress meter
    # --output writes the response body to our temporary file
    http_status=$(curl --silent --write-out '%{http_code}' -L \
                     --output "$TEMP_FILE" \
                     -H "Authorization: Bearer $AUTH_TOKEN" \
                     "$API_URL")

    # Check if the HTTP status code is 200 (OK)
    if [ "$http_status" -eq 200 ]; then
        echo "SUCCESS (HTTP 200): File is a valid PDF."
        # Move the temporary file to its final destination
        mv "$TEMP_FILE" "$OUTPUT_FILE"
        echo "Saved to $OUTPUT_FILE"
    else
        # If not 200, the API returned an error. Display the error from the temp file.
        echo "FAILURE: Server responded with HTTP status $http_status."
        echo "API Error Response:"
        # Print the contents of the temp file, which contains the error message
        cat "$TEMP_FILE"
        echo ""
        # The temporary file will be automatically cleaned up, not moved.
    fi

    # Add a delay to avoid rate limits
    echo "Waiting 1 second before next request..."
    sleep 1

done

echo "--------------------------------------------------"
echo "All downloads complete."

