export type FacebookSdk = {
  init: (options: Record<string, unknown>) => void;
  login: (callback: (response: unknown) => void, options: Record<string, unknown>) => void;
};

type FacebookWindow = Window & {
  FB?: FacebookSdk;
  fbAsyncInit?: () => void;
};

export function loadFacebookSdk(appId: string, graphApiVersion: string): Promise<FacebookSdk> {
  const facebookWindow = window as FacebookWindow;
  if (facebookWindow.FB) {
    facebookWindow.FB.init({
      appId,
      autoLogAppEvents: true,
      xfbml: false,
      version: graphApiVersion,
    });
    return Promise.resolve(facebookWindow.FB);
  }

  return new Promise((resolve, reject) => {
    facebookWindow.fbAsyncInit = () => {
      if (!facebookWindow.FB) {
        reject(new Error("Meta SDK did not initialize."));
        return;
      }
      facebookWindow.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: graphApiVersion,
      });
      resolve(facebookWindow.FB);
    };

    if (document.getElementById("facebook-jssdk")) {
      const startedAt = Date.now();
      const poll = window.setInterval(() => {
        if (facebookWindow.FB) {
          window.clearInterval(poll);
          facebookWindow.fbAsyncInit?.();
        } else if (Date.now() - startedAt > 10000) {
          window.clearInterval(poll);
          reject(new Error("Meta SDK did not load."));
        }
      }, 100);
      return;
    }

    const firstScript = document.getElementsByTagName("script")[0];
    const sdkScript = document.createElement("script");
    sdkScript.id = "facebook-jssdk";
    sdkScript.async = true;
    sdkScript.defer = true;
    sdkScript.crossOrigin = "anonymous";
    sdkScript.src = "https://connect.facebook.net/en_US/sdk.js";
    sdkScript.onerror = () => reject(new Error("Could not load Meta SDK."));
    firstScript.parentNode?.insertBefore(sdkScript, firstScript);
  });
}
