chrome.runtime.onInstalled.addListener(async () => {
    console.log('Web Cmd+K is installed');

    // Set default side panel options
    try {
        await chrome.sidePanel.setOptions({
            enabled: true,
            path: 'index.html',
        });
    } catch (error) {
        console.error('Error setting side panel options:', error);
    }

    // Enable side panel on toolbar click
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-side-panel') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (tabId) {
              console.log("Opening side panel on tab:", tabId);
              chrome.sidePanel.open({ tabId });
            } else {
              console.warn("No active tab found");
            }
          });
    }
});