<!-- @component
A "Get in Touch" contact form card, styled after `src/components/blocks/contact/BasicForm.astro`
(oxygenna-themes/foxi-astro-theme, MIT). DaisyUI v5 fields (bordered by default, no
`form-control`/`label-text`/`-bordered` modifiers) grouped in a `<fieldset>`/`<legend>`, inside
the chassis's own `.cairn-card` recipe. This form is presentational only (out of scope for a
license and layout fidelity port): submitting it is the developer's own domain, per cairn's
seam boundary, not a feature this port wires up.
-->
<script lang="ts"></script>

<div class="cairn-card mx-auto max-w-md shadow-[var(--cairn-shadow)]">
  <fieldset class="flex flex-col gap-s">
    <legend class="mb-2xs text-step-2 font-bold text-base-content">Get in Touch</legend>

    <div class="grid grid-cols-2 gap-s">
      <input type="text" placeholder="First Name" class="input w-full" aria-label="First name" />
      <input type="text" placeholder="Last Name" class="input w-full" aria-label="Last name" />
    </div>

    <label class="flex flex-col gap-1">
      <span class="text-step--1 text-muted">Email <span class="text-error">*</span></span>
      <input type="email" placeholder="name@youremail.com" required class="input w-full" />
    </label>

    <input type="tel" placeholder="Phone number" class="input w-full" aria-label="Phone number" />

    <textarea placeholder="Your Message" rows="4" class="textarea w-full" aria-label="Your message"></textarea>

    <button type="submit" class="btn btn-primary w-fit">Submit</button>
  </fieldset>
</div>
