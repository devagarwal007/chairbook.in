export const SORT_OPTIONS = [
  { id: "recent",  label: "Most recent visit" },
  { id: "name",    label: "Name (A → Z)" },
  { id: "visits",  label: "Most visits" },
  { id: "spend",   label: "Highest spend" },
  { id: "lost",    label: "Longest absent" },
];

export const FILTER_TABS = [
  { id: "all",     label: "All" },
  { id: "active",  label: "Active" },
  { id: "cooling", label: "Cooling" },
  { id: "lost",    label: "Lost" },
];

export const MOCK_PROFILE = {
  id: 1,
  name: "Priya Sharma",
  tone: "b",
  phone: "+91 98xxx 12345",
  memberSince: "October 2023",
  prefStylist: "Anjali",
  birthday: "14 Nov",
  engagement: "active",
  visits: 12,
  spend: 12400,
  fav: "Hair Color",
  upcoming: { date: "Saturday, 24 May", time: "4:00 PM", service: "Hair Color", stylist: "Anjali" },
  notes: [
    { id: 1, date: "12 Apr 2026", author: "Anjali", text: "Prefers shorter on the sides. Loves a deep side parting." },
    { id: 2, date: "03 Feb 2026", author: "Ravi",   text: "Allergic to certain ammonia-based color brands — use the ammonia-free range." },
  ],
  visitHistory: [
    { id: "v12", date: "13 May 2026", services: [{ name: "Hair Color", amt: 1800 }, { name: "Hair Spa", amt: 900 }], stylist: "Anjali", amount: 2700, payment: "UPI · GPay" },
    { id: "v11", date: "12 Apr 2026", services: [{ name: "Haircut", amt: 300 }, { name: "Blow-dry", amt: 450 }], stylist: "Anjali", amount: 750, payment: "UPI · PhonePe" },
    { id: "v10", date: "08 Mar 2026", services: [{ name: "Facial — Gold", amt: 1400 }], stylist: "Pooja", amount: 1400, payment: "Cash" },
    { id: "v9",  date: "14 Feb 2026", services: [{ name: "Hair Color", amt: 1800 }, { name: "Threading", amt: 80 }], stylist: "Anjali", amount: 1880, payment: "UPI · GPay" },
    { id: "v8",  date: "03 Feb 2026", services: [{ name: "Haircut", amt: 300 }], stylist: "Anjali", amount: 300, payment: "Cash" },
    { id: "v7",  date: "15 Jan 2026", services: [{ name: "Hair Spa", amt: 900 }, { name: "Manicure", amt: 350 }], stylist: "Pooja", amount: 1250, payment: "UPI · GPay" },
    { id: "v6",  date: "22 Dec 2025", services: [{ name: "Hair Color", amt: 1800 }], stylist: "Anjali", amount: 1800, payment: "Card" },
    { id: "v5",  date: "04 Dec 2025", services: [{ name: "Haircut", amt: 300 }, { name: "Threading", amt: 80 }], stylist: "Anjali", amount: 380, payment: "UPI · GPay" },
  ],
};

export const TEMPLATES = [
  { id: "thanks",  title: "Thank-you note",         body: "Hi Priya 🙏 Thanks for visiting Glow Salon last week. Hope you loved the new color! Reply HI if you need anything." },
  { id: "reb",     title: "Rebook reminder",        body: "Hi Priya! It's been a while since your last visit. Your roots might be ready for a touch-up — shall I block a slot this Saturday?" },
  { id: "offer",   title: "Birthday / occasion",    body: "Hi Priya 🎉 Your birthday is coming up — here's a 20% off voucher on any service this month. Reply YES to book." },
  { id: "custom",  title: "Write your own",         body: "" },
];
