// This port's FAQ data, values ported from `src/data/json-files/faqData.json`
// (oxygenna-themes/foxi-astro-theme, MIT), grouped by the upstream `category` field.
import type { FaqItem } from '$theme/types.js';

export const pricingFaq: FaqItem[] = [
  {
    question: 'What is the cost of the basic plan?',
    reply:
      'The basic plan is $9.99 per month, which includes access to core features and limited integrations. This plan is perfect for individuals or small teams looking to improve their productivity without a large investment.',
  },
  {
    question: 'Are there any discounts for annual subscriptions?',
    reply:
      'Yes, we offer a 20% discount on annual subscriptions for all our plans. By choosing an annual subscription, you can save money and ensure uninterrupted access to all Foxi features for the entire year.',
  },
  {
    question: 'Can I change my subscription plan at any time?',
    reply:
      'Yes, you can upgrade or downgrade your subscription plan at any time from your account settings. This flexibility allows you to adjust your plan based on your changing needs and usage.',
  },
  {
    question: 'Is there a free trial available?',
    reply:
      'Yes, we offer a 14-day free trial for all new users. During the trial, you can explore all the features of Foxi without any commitment, allowing you to see how it fits into your workflow.',
  },
  {
    question: 'Do you offer refunds?',
    reply:
      "We offer a 30-day money-back guarantee if you are not satisfied with our service. Simply contact our support team within 30 days of your purchase, and we'll process your refund.",
  },
  {
    question: 'How do I cancel my subscription?',
    reply:
      'You can cancel your subscription from your account settings at any time. After cancellation, you will still have access to your account until the end of the billing cycle.',
  },
];

export const integrationsFaq: FaqItem[] = [
  {
    question: 'Can I use Foxi with Google Calendar?',
    reply:
      'Yes, Foxi integrates seamlessly with Google Calendar for easy scheduling and task management. This integration helps you keep track of your events and tasks in one place.',
  },
  {
    question: 'Does Foxi work with Slack?',
    reply:
      'Yes, you can integrate Foxi with Slack to receive notifications and updates directly in your channels. This allows you to stay informed about your projects without leaving Slack.',
  },
  {
    question: 'How do I connect Foxi with Trello?',
    reply:
      'To connect Foxi with Trello, go to the integrations page in your settings and follow the instructions to link your accounts. This integration helps you manage your Trello boards and Foxi projects together.',
  },
  {
    question: 'Is there an API for custom integrations?',
    reply:
      'Yes, we provide an API that allows you to create custom integrations with Foxi. Our API documentation provides detailed instructions and examples to help you get started.',
  },
  {
    question: 'Does Foxi support Zapier?',
    reply:
      'Yes, Foxi integrates with Zapier, allowing you to connect with over 2,000 apps and automate your workflows. This integration helps you streamline your processes and improve efficiency.',
  },
  {
    question: 'Can I sync Foxi with my email?',
    reply:
      "Currently, we do not support email integration, but this feature is on our roadmap for future releases. Stay tuned for updates as we continue to enhance Foxi's capabilities.",
  },
];
