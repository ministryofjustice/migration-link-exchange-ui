document.addEventListener('DOMContentLoaded', () => {
  const checkbox = document.getElementById('options');
  const linkInput = document.getElementById('link');

  // Utility: Get cookie value by name
  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  // Sets or removes the auto-resolve cookie
  function setAutoResolveCookie(enabled) {
    if (enabled) {
      document.cookie = "autoResolve=true; path=/;";
    } else {
      document.cookie = "autoResolve=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
  }

  // Regex pattern to validate Google Drive (or Docs) links
  const googleDriveLinkRegex = /^https?:\/\/(?:docs\.google|drive\.google)\.com\/(?:file\/)?(?:d|folders)\/[a-zA-Z0-9_-]+/;

  // Checks if the link input contains a valid Google Drive link and auto-submits the form,
  // but only if no file list items are present.
  function autoSubmitIfDriveLink() {
    if (linkInput && googleDriveLinkRegex.test(linkInput.value)) {
      // If file list items exist, skip auto-submission to avoid a loop.
      const fileList = document.querySelector('.file-list');
      if (fileList && fileList.querySelector('.file-list__item')) {
        console.log('File list already present, not auto-submitting.');
        return;
      }
      const form = linkInput.closest('form');
      if (form) {
        form.submit();
      } else {
        // Fallback: simulate a click on the submit button if form isn't found
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.click();
        }
      }
    }
  }

  // Reads clipboard and pastes the Google Drive link if it matches the expected pattern,
  // then auto-submits if a valid drive link is present and no file list items exist.
  async function autoPasteClipboardIfDriveLink() {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'clipboard-read' });
      if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
        const clipboardText = await navigator.clipboard.readText();
        if (googleDriveLinkRegex.test(clipboardText) && linkInput) {
          linkInput.value = clipboardText;
          // Auto-submit the form if the clipboard text is a valid Google Drive link
          autoSubmitIfDriveLink();
        }
      }
    } catch (error) {
      console.error('Error accessing clipboard:', error);
    }
  }

  // Handles auto-resolve functionality: sets the cookie and attempts to paste clipboard text
  async function handleAutoResolve() {
    setAutoResolveCookie(true);
    await autoPasteClipboardIfDriveLink();
  }

  // Initializes the checkbox listener to trigger auto-resolve when checked
  function initCheckboxListener() {
    if (!checkbox) return;

    // Recheck the box if the cookie indicates auto-resolve was previously enabled
    if (getCookie("autoResolve") === "true") {
      checkbox.checked = true;
      handleAutoResolve();
    }

    checkbox.addEventListener('change', (event) => {
      if (event.target.checked) {
        handleAutoResolve();
      } else {
        setAutoResolveCookie(false);
      }
    });
  }

  // Checks if exactly one file is in the file list and auto-clicks its link
  function handleFileListAutoClick() {
    const fileItems = document.querySelectorAll('.file-list__item');
    if (fileItems.length === 1) {
      const fileLink = fileItems[0].querySelector('a');
      if (fileLink) {
        // Delay the click slightly to allow for any rendering
        setTimeout(() => {
          fileLink.click();
        }, 100);
      }
    }
  }

  // Initialize all functionality
  initCheckboxListener();
  handleFileListAutoClick();
});
