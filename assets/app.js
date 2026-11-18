'use strict';

const form = document.querySelector('#signup-form');
const alertBox = document.querySelector('#form-alert');
const button = document.querySelector('#submit-btn');
const submitLabel = document.querySelector('#submit-label');
const inputs = {
  fullName: document.querySelector('#fullName'),
  email: document.querySelector('#email'),
  phone: document.querySelector('#phone'),
  consent: document.querySelector('#consent'),
};

document.querySelector('#year').textContent = new Date().getFullYear();

function fieldError(key, message) {
  const errorEl = document.querySelector(`#${key}-error`);
  errorEl.textContent = message || '';
  const input = key === 'name' ? inputs.fullName : inputs[key];
  if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function clearErrors() {
  ['name', 'email', 'phone', 'consent'].forEach(key => fieldError(key, ''));
  alertBox.hidden = true;
  alertBox.textContent = '';
}

function validate() {
  clearErrors();
  let ok = true;
  const name = inputs.fullName.value.trim();
  const email = inputs.email.value.trim();
  const phone = inputs.phone.value.trim();
  const digits = phone.replace(/\D/g, '');
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (name.length < 2 || name.length > 80) {
    fieldError('name', 'Entre ton nom complet (2 à 80 caractères).'); ok = false;
  }
  if (email.length > 254 || !emailPattern.test(email)) {
    fieldError('email', 'Entre une adresse e-mail valide.'); ok = false;
  }
  if (digits.length < 8 || digits.length > 15 || !/^\+?[0-9\s().-]+$/.test(phone)) {
    fieldError('phone', 'Entre un numéro valide, par ex. +216 XX XXX XXX.'); ok = false;
  }
  if (!inputs.consent.checked) {
    fieldError('consent', 'Ton accord est nécessaire pour recevoir les informations.'); ok = false;
  }
  if (!ok) document.querySelector('[aria-invalid="true"]')?.focus();
  return ok;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!validate()) return;

  button.disabled = true;
  button.classList.add('is-loading');
  submitLabel.textContent = 'ENVOI EN COURS…';

  const payload = {
    full_name: inputs.fullName.value.trim(),
    email: inputs.email.value.trim().toLowerCase(),
    phone: inputs.phone.value.trim(),
    consent: inputs.consent.checked,
    website: document.querySelector('#website').value,
  };

  try {
    const response = await fetch('/api/preregister', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let result = {};
    try { result = await response.json(); } catch (_) { /* fallback below */ }
    if (!response.ok || result.ok !== true) {
      throw new Error(result.error || 'Impossible d’enregistrer maintenant. Réessaie dans un instant.');
    }
    const success = document.querySelector('#success-panel');
    const firstName = payload.full_name.split(/\s+/)[0];
    document.querySelector('#form-main').hidden = true;
    success.hidden = false;
    document.querySelector('#success-message').textContent = result.already_registered
      ? `${firstName}, cet e-mail figure déjà sur la liste. Tu recevras les informations prioritaires sur cette adresse.`
      : `${firstName}, ta pré-inscription a bien été reçue. Surveille ta boîte e-mail : on te préviendra avant l'ouverture publique.`;
    success.focus();
  } catch (error) {
    alertBox.hidden = false;
    alertBox.textContent = error.message || 'Une erreur est survenue. Réessaie.';
  } finally {
    button.disabled = false;
    button.classList.remove('is-loading');
    submitLabel.textContent = 'JE ME PRÉ-INSCRIS';
  }
});
