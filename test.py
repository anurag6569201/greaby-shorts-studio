import requests
import os

#Construct URL
endpoint = "https://anurag6569201-1049-resource.cognitiveservices.azure.com/"
path = "/translator/document:translate"
url = endpoint + path

headers = {
    "Ocp-Apim-Subscription-Key": "3nAAKinE05tgRZvERq269CAjmRiwpYW7PMnelaXK8jckvXCkFWcjJQQJ99BGACHYHv6XJ3w3AAAAACOGvn9H"
}

# Define the parameters 
# Get list of supported languages and code here: https://aka.ms/TranslatorLanguageCodes 
params = {
    "sourceLanguage": "<source language code>",
    "targetLanguage": "<target language code>",
    "api-version": "2023-11-01-preview"
}

# Include full path, file name and extension
input_file = "<full path to source file>"
output_file = "<full path to translated file>"

# Open the input file in binary mode
with open(input_file, "rb") as document:
    # Define the data to be sent
    # Find list of supported content types here: https://aka.ms/dtsync-content-type
    data = {
        "document": (os.path.basename(input_file), document, "<Your file content type>")
    }

    # Send the POST request
    response = requests.post(url, headers=headers, files=data, params=params)

# Write the response content to a file
with open(output_file, "wb") as output_document:
    output_document.write(response.content)