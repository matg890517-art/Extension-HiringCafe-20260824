export const getTab = async ():Promise<any> => {
  const [tab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (!tab?.id) {
    return "Error no opening page";
  }
  return tab;
};
