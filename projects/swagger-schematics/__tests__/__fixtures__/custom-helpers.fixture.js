/**
 * Custom template helpers fixture for testing templateHelpersPath feature
 */
module.exports = {
    // Custom constant
    API_VERSION: 'v2',
    
    // Custom function
    formatEndpointName: (name) => `custom_${name}`,
    
    // Custom function using template item
    buildCustomComment: (item) => `// Custom endpoint: ${item.apiMethodName}`,
};
