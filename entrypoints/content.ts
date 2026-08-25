export default defineContentScript({
  matches: ['*://hiringcafe.com/*', '*://*.hiringcafe.com/*' , 'https://hiringcafe.com/'],
  main() {
    console.log('Hello content.', location.href);

    // const container = document.createElement('span'); 
    // document.body.append(container); 

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      console.log('received[content]', message);
      if (message?.type !== 'GET_JOB') return;
      const drawer = document.querySelector(
        'div[role="dialog"][aria-modal="true"].chakra-modal__content',
      );
      sendResponse(
        drawer ? { ok: true } : { ok: false, error: 'no drawer' },
      );
    });
  },
});
