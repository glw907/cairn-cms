// This port's feature copy, ported from `src/components/blocks/features/FeatureCards.astro`
// (the home page's compact 5-card set) and `src/data/json-files/featuresData.json` (the
// /features page's fuller, category-grouped listing), both oxygenna-themes/foxi-astro-theme, MIT.
import type { Feature } from '$theme/types.js';

/** The home page's compact feature grid. */
export const homeFeatures: Feature[] = [
  {
    title: 'All your data in one place',
    description:
      'Stay on top of your tasks and deadlines with our intuitive project management tool. Visualize progress, assign tasks, and collaborate seamlessly.',
  },
  {
    title: 'Organize & manage your projects',
    description: 'Stay on top of your tasks and deadlines with our intuitive project management tool.',
  },
  {
    title: 'Keep your team connected',
    description:
      'With our integrated chat platform share updates, files, and messages in a secure and user-friendly environment.',
  },
  {
    title: 'Manage your customers',
    description: 'Build and nurture customer relationships with our powerful CRM system.',
  },
  {
    title: 'Simplify your financial operations',
    description: 'Streamline your billing process with our easy-to-use invoicing tool. Create, send, and track invoices effortlessly.',
  },
];

/** The /features page's fuller listing, grouped under its own section headings. */
export const featureGroups: { heading: string; features: Feature[] }[] = [
  {
    heading: 'Insightful Analytics',
    features: [
      { title: 'Real-Time Analytics', description: "Gain valuable insights instantly with Foxi's real-time analytics." },
      { title: 'Customizable Dashboards', description: 'Tailor your workspace with personalized dashboards that suit your workflow.' },
      { title: 'Advanced Reporting', description: 'Generate detailed reports with advanced analytics features.' },
      { title: 'Data Visualization', description: 'Visualize your data with advanced charting and graphing tools.' },
    ],
  },
  {
    heading: 'Efficiency Unleashed',
    features: [
      { title: 'Task Management', description: "Efficiently manage tasks and projects with Foxi's intuitive task management tools." },
      { title: 'Third-Party Apps', description: 'Connect Foxi with your favorite tools and apps effortlessly.' },
      { title: 'Team Collaboration Tools', description: 'Enhance team collaboration with tools designed for effective communication.' },
      { title: 'Task Automation', description: 'Automate routine tasks to improve efficiency and reduce manual work.' },
    ],
  },
  {
    heading: 'Ultimate Data Protection',
    features: [
      { title: 'Robust Data Security', description: "Rest assured knowing your data is safe with Foxi's robust security measures." },
      { title: 'Scalability', description: "Grow your business with confidence using Foxi's scalable platform." },
      { title: 'Data Backup', description: 'Protect your data with regular backups.' },
      { title: 'User Role Management', description: 'Manage user roles and permissions with ease.' },
    ],
  },
  {
    heading: 'Seamless Connectivity',
    features: [
      { title: 'In-App Messaging', description: 'Communicate directly within the app using in-app messaging.' },
      { title: 'API Integrations', description: 'Integrate with other systems and services using our flexible API.' },
      { title: 'Integration Marketplace', description: 'Explore our marketplace for additional integrations and plugins.' },
      { title: 'Clever CRM Integration', description: 'Connect your app with popular CRM systems to streamline customer management.' },
    ],
  },
  {
    heading: '24/7 Expert Help',
    features: [
      { title: 'Mobile Accessibility', description: "Stay productive on the go with Foxi's mobile app." },
      { title: 'Dedicated Customer Support', description: 'Receive exceptional customer support whenever you need it.' },
      { title: 'Live Chat Support', description: 'Connect with our support team via live chat for immediate assistance.' },
      { title: 'Knowledge Base', description: 'Access a comprehensive knowledge base with articles, guides, and FAQs.' },
    ],
  },
];
