// Communication Action Layer configuration.
// Keep transaction links here so WhatsApp copy and the UI never need to know Quicket's internal URL.

export const communicationConfig = {
  sundayMeal: {
    quicketUrl: '', // Set this to the current Quicket meal event URL before publishing.
    priceLabel: '', // Example: 'R60 per meal'
  },
  reliefDonationUrl: '', // Set when the church chooses the donation destination for a communication.
};
