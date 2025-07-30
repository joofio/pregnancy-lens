# pregnancy-lens

This module enhances information for women who are pregnant, breastfeeding, or of childbearing age, with support for multiple languages. It processes FHIR-based ePI and IPS data and annotates HTML content to highlight or collapse relevant sections.

## Features
- Detects pregnancy, breastfeeding, and childbearing age status from FHIR IPS data
- Annotates HTML sections related to pregnancy and breastfeeding
- Constructs user-facing sentences in multiple languages (English, Spanish, Portuguese, Danish)
- Clean, modular, and well-commented code for easy maintenance and extension

## Multilingual Support
All user-facing messages are constructed using a language dictionary. Supported languages:
- English (`en`)
- Spanish (`es`)
- Portuguese (`pt`)
- Danish (`da`)

To add a new language, extend the `languageDict` in `pregnancy-lens.js` with the appropriate translations.

## Usage

```js
const lens = require('./pregnancy-lens.js');

// Enhance HTML and get annotated content (default: English)
lens.enhance('en').then(html => {
    // html contains annotated HTML
});

// Get explanation in Spanish
lens.explanation('es').then(info => {
    // info.status: pregnancy status object
    // info.message: user-facing message in Spanish
});

// Get report sentence in Portuguese
lens.report('pt').then(msg => {
    // msg: user-facing message in Portuguese
});
```

## Extending
- To support more languages, add entries to the `languageDict` in the main JS file.
- To add new categories or codes, update the `listOfCategoriesToSearch` array.

## Testing
Run the included tests in the `test/` folder to verify functionality and language output.