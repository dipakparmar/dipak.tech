const title = 'Dipak Parmar ↠ Open Source Developer.';
const description = 'Open Source Developer from Kamloops, BC 🇨🇦';

const SEO = {
  title,
  description,
  canonical: 'https://dipak.tech',
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    url: 'https://dipak.tech',
    title,
    description,
    images: [
      {
        url: 'https://dipak.tech/static/images/banner.jpg',
        alt: title,
        width: 1280,
        height: 720
      }
    ]
  },
  twitter: {
    handle: '@dipakparmar65',
    site: '@dipakparmar65',
    cardType: 'summary_large_image'
  }
};

export default SEO;
