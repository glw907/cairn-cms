// This port's feature copy, ported from `src/components/blocks/features/FeatureCards.astro`
// (the home page's bento grid), `src/data/json-files/featuresData.json` (the /features listing and
// the pricing page's "included on every plan" band), all oxygenna-themes/foxi-astro-theme, MIT.
import type { Feature } from '$theme/types.js';

/** One home-page bento card: a title, a description, and an `AppMockup` illustration variant
 *  standing in for `FeatureCards.astro`'s product screenshot. `tall` marks the first card, which
 *  spans both rows of the 3-column bento grid. */
export interface BentoFeature {
  title: string;
  description: string;
  image: 'calendar' | 'chat' | 'chart' | 'stats' | 'kanban';
  tall?: boolean;
}

/** The home page's asymmetric bento grid: one tall card beside two stacked pairs. */
export const homeBentoFeatures: BentoFeature[] = [
  {
    title: 'All your data in one place',
    description:
      'Stay on top of your tasks and deadlines with our intuitive project management tool. Visualize progress, assign tasks, and collaborate seamlessly.',
    image: 'calendar',
    tall: true,
  },
  {
    title: 'Organize & manage your projects',
    description: 'Stay on top of your tasks and deadlines with our intuitive project management tool.',
    image: 'stats',
  },
  {
    title: 'Keep your team connected',
    description:
      'With our integrated chat platform share updates, files, and messages in a secure and user-friendly environment.',
    image: 'chat',
  },
  {
    title: 'Manage your customers',
    description: 'Build and nurture customer relationships with our powerful CRM system.',
    image: 'kanban',
  },
  {
    title: 'Simplify your financial operations',
    description: 'Streamline your billing process with our easy-to-use invoicing tool. Create, send, and track invoices effortlessly.',
    image: 'chart',
  },
];

/** The pricing page's "Whats included on all foxi plans" band: the first 8 entries of the
 *  upstream `featuresData.json`, matching `FeatureList.astro`'s own `slice(0, 8)`. */
export const pricingIncludedFeatures: Feature[] = [
  { icon: 'chart-pie', title: 'Real-Time Analytics', description: "Gain valuable insights instantly with Foxi's real-time analytics." },
  {
    icon: 'squares-plus',
    title: 'Customizable Dashboards',
    description: 'Tailor your workspace with personalized dashboards that suit your workflow.',
  },
  {
    icon: 'clipboard-check',
    title: 'Task Management',
    description: "Efficiently manage tasks and projects with Foxi's intuitive task management tools.",
  },
  { icon: 'rocket', title: 'Third-Party Apps', description: 'Connect Foxi with your favorite tools and apps effortlessly.' },
  {
    icon: 'device-phone-mobile',
    title: 'Mobile Accessibility',
    description: "Stay productive on the go with Foxi's mobile app.",
  },
  {
    icon: 'trophy',
    title: 'Dedicated Customer Support',
    description: 'Receive exceptional customer support whenever you need it.',
  },
  {
    icon: 'shield-check',
    title: 'Robust Data Security',
    description: "Rest assured knowing your data is safe with Foxi's robust security measures.",
  },
  { icon: 'arrow-trending-up', title: 'Scalability', description: "Grow your business with confidence using Foxi's scalable platform." },
];

/** The /features listing's five category-grouped grids. `heading` and `text` come from
 *  `features.astro`'s own `<Feature>` blocks; each `heading` pairs with the upstream `data` prop
 *  the astro source passes it, which is itself matched by category name, not by the heading's own
 *  wording (the upstream source's own quirk: "Efficiency Unleashed" renders the Security category,
 *  "Ultimate Data Protection" renders Productivity), reproduced here for fidelity to what the
 *  live theme actually shows. */
export const featureGroups: { heading: string; text: string; features: Feature[] }[] = [
  {
    heading: 'Insightful Analytics',
    text: 'Delve into your data with precision and uncover actionable insights.',
    features: [
      { icon: 'chart-pie', title: 'Real-Time Analytics', description: "Gain valuable insights instantly with Foxi's real-time analytics. Track performance metrics, user behavior, and campaign effectiveness effortlessly." },
      { icon: 'squares-plus', title: 'Customizable Dashboards', description: 'Tailor your workspace with personalized dashboards that suit your workflow. Stay organized and focused on what matters most to your business.' },
      { icon: 'clipboard-list', title: 'Advanced Reporting', description: 'Generate detailed reports with advanced analytics features. Customize reports to track key performance indicators and gain deeper insights.' },
      { icon: 'paint-brush', title: 'Custom Themes', description: "Customize the look and feel of your workspace with custom themes. Choose from various design options to match your brand's style." },
      { icon: 'arrow-trending-up', title: 'Performance Tracking', description: 'Monitor and track performance metrics to ensure optimal efficiency. Use performance data to make informed decisions and improvements.' },
      { icon: 'squares-plus', title: 'Custom Widgets', description: 'Enhance your dashboard with custom widgets. Add and configure widgets to display the most relevant information for your needs.' },
      { icon: 'eye', title: 'Data Visualization', description: 'Visualize your data with advanced charting and graphing tools. Create insightful visual representations to better understand your metrics.' },
    ],
  },
  {
    heading: 'Efficiency Unleashed',
    text: 'Streamline tasks and focus on what matters with tools designed to boost your productivity.',
    features: [
      { icon: 'shield-check', title: 'Robust Data Security', description: "Rest assured knowing your data is safe with Foxi's robust security measures. We employ industry-standard protocols to protect your information." },
      { icon: 'arrow-trending-up', title: 'Scalability', description: "Grow your business with confidence using Foxi's scalable platform. Whether you're a startup or a large enterprise, our solution adapts to your needs." },
      { icon: 'bell-alert', title: 'Real-Time Notifications', description: 'Stay updated with real-time notifications for important events and updates. Never miss out on critical information with instant alerts.' },
      { icon: 'user', title: 'User Role Management', description: 'Manage user roles and permissions with ease. Control access levels and ensure the right people have the right permissions for your project.' },
      { icon: 'circle-stack', title: 'Data Backup', description: 'Protect your data with regular backups. Ensure that your information is safe and recoverable in case of unexpected issues or data loss.' },
      { icon: 'eye-slash', title: 'Accessibility Features', description: 'Explore features designed to enhance accessibility. Ensure your tools and workspace are usable for all team members, including those with disabilities.' },
      { icon: 'mobile', title: 'Enhanced Mobile Access', description: 'Benefit from enhanced mobile access features. Use our app to stay connected and productive with improved functionality on mobile devices.' },
    ],
  },
  {
    heading: 'Ultimate Data Protection',
    text: 'Keep your data safe with top-notch security measures and real-time threat detection.',
    features: [
      { icon: 'clipboard-check', title: 'Task Management', description: "Efficiently manage tasks and projects with Foxi's intuitive task management tools. Assign, track progress, and collaborate seamlessly." },
      { icon: 'rocket', title: 'Third-Party Apps', description: 'Connect Foxi with your favorite tools and apps effortlessly. Streamline workflows and enhance productivity with seamless integrations.' },
      { icon: 'user-group', title: 'Team Collaboration Tools', description: 'Enhance team collaboration with tools designed for effective communication and project management. Share updates, files, and feedback seamlessly.' },
      { icon: 'cursor-arrow-ripple', title: 'Customizable Workspaces', description: 'Personalize your workspace layout to fit your needs. Adjust and configure your workspace for maximum efficiency and comfort.' },
      { icon: 'rectangle-stack', title: 'Task Automation', description: 'Automate routine tasks to improve efficiency and reduce manual work. Set up automated processes to streamline your workflow.' },
      { icon: 'bug-ant', title: 'Advanced Bug Tracking', description: 'Track tasks and projects with advanced tracking features. Monitor progress, set milestones, and manage your projects more effectively.' },
      { icon: 'identification', title: 'User Identity Verification', description: 'Analyze productivity metrics to optimize performance. Gain insights into team and individual productivity to drive improvements.' },
    ],
  },
  {
    heading: 'Seamless Connectivity',
    text: 'Effortlessly connect your favorite apps and automate workflows for a smoother workday.',
    features: [
      { icon: 'chat-bubble-left-right', title: 'In-App Messaging', description: 'Communicate directly within the app using in-app messaging. Keep conversations organized and accessible without switching between tools.' },
      { icon: 'arrow-path', title: 'API Integrations', description: 'Integrate with other systems and services using our flexible API. Expand functionality and connect with external tools effortlessly.' },
      { icon: 'shopping-cart', title: 'Integration Marketplace', description: 'Explore our marketplace for additional integrations and plugins. Extend the functionality of your platform with third-party solutions.' },
      { icon: 'credit-card', title: 'Payment Integrations', description: 'Communicate directly within the app using in-app messaging. Keep conversations organized and accessible without switching between tools.' },
      { icon: 'cube-transparent', title: 'Transparent API', description: 'Seamlessly integrate with third-party APIs to extend the functionality of your app. Enjoy smooth data exchange and enhanced performance.' },
      { icon: 'light-bulb', title: 'Clever CRM Integration', description: 'Connect your app with popular CRM systems to streamline customer management. Synchronize data and improve customer relationship processes.' },
      { icon: 'key', title: 'API key Integration', description: 'Integrate multiple payment gateways to offer diverse payment options. Ensure secure transactions and smooth payment processing for users.' },
    ],
  },
  {
    heading: '24/7 Expert Help',
    text: 'Our friendly support team is always here to assist you with any questions or issues.',
    features: [
      { icon: 'device-phone-mobile', title: 'Mobile Accessibility', description: "Stay productive on the go with Foxi's mobile app. Access key features, collaborate with your team, and manage tasks anytime, anywhere." },
      { icon: 'trophy', title: 'Dedicated Customer Support', description: 'Receive exceptional customer support whenever you need it. Our dedicated team is here 24/7 to assist you with any questions or issues.' },
      { icon: 'computer-desktop', title: 'Multi-Device Sync', description: 'Ensure seamless access to your data across all devices. Sync your information in real-time, so you can work from anywhere with consistency.' },
      { icon: 'bell', title: 'Customizable Alerts', description: 'Set up customizable alerts to notify you of important events and changes. Tailor notifications to your needs for better management and response.' },
      { icon: 'document-chart-bar', title: 'Interactive Tutorials', description: 'Access interactive tutorials to get the most out of our features. Learn new skills and improve your proficiency with guided, hands-on experiences.' },
      { icon: 'user', title: 'Onboarding Assistance', description: 'Get personalized onboarding assistance to help you set up and start using our platform effectively. Benefit from expert guidance to ensure a smooth start.' },
      { icon: 'document-text', title: 'Knowledge Base', description: 'Access a comprehensive knowledge base with articles, guides, and FAQs. Find answers to common questions and learn how to make the most of our features.' },
      { icon: 'chat-bubble-left-ellipsis', title: 'Live Chat Support', description: 'Connect with our support team via live chat for immediate assistance. Get answers to your questions and resolve issues in real time.' },
      { icon: 'scale', title: 'Comprehensive Balancer', description: 'Access comprehensive support resources to assist users at all levels. From troubleshooting to advanced tips, get the help you need.' },
      { icon: 'microphone', title: 'Voice Recordings', description: 'Receive real-time updates on accessibility features and improvements. Stay informed about changes that impact your mobile and web access.' },
    ],
  },
];
