<!-- @component The /contact page, styled after `src/pages/contact.astro`
     (oxygenna-themes/foxi-astro-theme, MIT): a page header beside the contact form, a row of
     "reason to reach out" cards, a trust logo row, and a closing CTA. -->
<script lang="ts">
  import ContactForm from '$theme/components/ContactForm.svelte';
  import ContactCards from '$theme/components/ContactCards.svelte';
  import LogoCloud from '$theme/components/LogoCloud.svelte';
  import CTABanner from '$theme/components/CTABanner.svelte';

  const reasons = [
    { icon: 'rocket', title: 'Customer Support', text: "Need help with Foxi? Our support team is available 24/7 to assist you with any issues or questions you might have." },
    { icon: 'document-text', title: 'Sales Inquiries', text: 'Interested in our plans or want a custom solution? Get in touch with our sales team to find the perfect fit.' },
    { icon: 'bolt', title: 'Feature Requests', text: "Have an idea to make Foxi even better? We'd love to hear from you! Share your feature requests and help us improve." },
    { icon: 'chat-bubble-left-ellipsis', title: 'General Feedback', text: 'Your feedback is invaluable to us. Let us know how we are doing and how we can improve.' },
  ];
</script>

<svelte:head>
  <title>Contact | Foxi</title>
</svelte:head>

<div class="cairn-band pb-0">
  <div class="site-wide grid grid-cols-1 items-center gap-l lg:grid-cols-2">
    <div>
      <h1 class="mb-2xs text-step-4 font-bold text-base-content">
        Get Answers to Your <strong class="text-primary">Foxi</strong> Questions.
      </h1>
      <p class="m-0 text-step-0 text-muted">
        Whether you have a question, need support, or just want to share your feedback, we're all ears.
      </p>
    </div>
    <ContactForm />
  </div>
</div>

<div class="site-wide py-2xl">
  <div class="cairn-section flex flex-col gap-2xl">
    <div>
      <div class="mx-auto mb-l max-w-measure text-center">
        <h2 class="mb-2xs text-step-3 font-bold text-base-content">
          Have a Special Request? We're Here to <strong class="text-primary">Help!</strong>
        </h2>
        <p class="m-0 text-step-0 text-muted">
          Choose from one of the options below to get the specific help you need.
        </p>
      </div>
      <ContactCards {reasons} />
    </div>

    <LogoCloud count="50,000+" logos={['Airtable', 'Asana', 'Basecamp', 'Evernote', 'Notion', 'Slack']} />
  </div>
</div>

<div class="site-wide pb-2xl">
  <CTABanner
    title="Join Over 30,000 Satisfied Users!"
    text="Discover why thousands of professionals trust our platform to streamline their workflow and enhance productivity."
    badge="#1 Product of the Year, Product Hunt"
    buttonLabel="Get started now!"
    buttonHref="/pricing"
  />
</div>
