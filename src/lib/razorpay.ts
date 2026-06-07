type RazorpayCheckoutInstance = { open: () => void };
export type RazorpayCheckoutConstructor = new (options: Record<string, unknown>) => RazorpayCheckoutInstance;

export function loadRazorpayCheckout(): Promise<RazorpayCheckoutConstructor> {
  return new Promise((resolve, reject) => {
    const existing = (window as Window & { Razorpay?: RazorpayCheckoutConstructor }).Razorpay;
    if (existing) {
      resolve(existing);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      const loaded = (window as Window & { Razorpay?: RazorpayCheckoutConstructor }).Razorpay;
      if (loaded) resolve(loaded);
      else reject(new Error("Razorpay checkout did not load."));
    };
    script.onerror = () => reject(new Error("Razorpay checkout did not load."));
    document.body.appendChild(script);
  });
}
