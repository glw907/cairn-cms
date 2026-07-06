// This port's changelog data, values ported from `src/data/json-files/changelogData.json`
// (oxygenna-themes/foxi-astro-theme, MIT).
import type { ChangelogEntry } from '$theme/types.js';

export const changelogEntries: ChangelogEntry[] = [
  {
    date: '2024-07-01',
    title: 'v1.0.6: Enhanced Security Features',
    text: "We've implemented new security protocols to safeguard your data. Enjoy peace of mind with improved encryption and multi-factor authentication.",
    items: ['2FA enabled by default', 'HubSpot integration', 'Zoho CRM integration'],
    image: 'chat',
  },
  {
    date: '2024-06-15',
    title: 'v1.0.5: User Interface Improvements',
    text: 'Our latest update brings a revamped user interface for a more intuitive and visually appealing experience. Navigation and usability have been greatly enhanced.',
    items: ['Updated dashboard layout', 'Improved accessibility features', 'Streamlined navigation menus'],
    image: 'stats',
  },
  {
    date: '2024-05-20',
    title: 'v1.0.4: New In-App Messaging',
    text: 'Introducing in-app messaging! Communicate directly within the app to keep conversations organized and accessible without switching between tools.',
  },
  {
    date: '2024-04-10',
    title: 'v1.0.3: Performance Enhancements',
    text: "We've optimized the app to run faster and smoother. Experience improved load times and overall performance.",
    image: 'calendar',
  },
  {
    date: '2024-03-25',
    title: 'v1.0.2: CRM Integration',
    text: 'Connect your app with popular CRM systems to streamline customer management. Synchronize data and improve customer relationship processes.',
    items: ['Salesforce integration', 'HubSpot integration', 'Zoho CRM integration'],
  },
  {
    date: '2024-02-15',
    title: 'v1.0.1: Third-Party API Support',
    text: 'Seamlessly integrate with third-party APIs to extend the functionality of your app. Enjoy smooth data exchange and enhanced performance.',
    image: 'chart',
  },
];
