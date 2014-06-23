var chrome;

chrome.app = {
  runtime: {
    onLaunched: {
      addListener: function(callback) {
        console.log('[mock]','chrome.app.runtime.onLaunched.addListener');
        callback.apply(this);
      }
    }
  }
};

export default chrome;
