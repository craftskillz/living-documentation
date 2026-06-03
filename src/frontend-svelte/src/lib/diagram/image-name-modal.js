// ── Image filename modal ───────────────────────────────────────────────────────
// Returns a Promise<string|null>:
//   string (possibly empty) → user confirmed (empty = use auto name)
//   null                    → user cancelled

const IMAGE_NAME_RE = /^[a-z0-9_-]*$/i;

export function promptImageName() {
  return new Promise((resolve) => {
    const modal   = document.getElementById('imageNameModal');
    const input   = document.getElementById('imageNameInput');
    const error   = document.getElementById('imageNameError');
    const confirm = document.getElementById('imageNameConfirm');
    const cancel  = document.getElementById('imageNameCancel');

    input.value = '';
    error.classList.add('hidden');
    modal.style.display = 'flex';
    setTimeout(() => input.focus(), 50);

    function validate() {
      const val = input.value.trim();
      const ok  = val === '' || IMAGE_NAME_RE.test(val);
      error.classList.toggle('hidden', ok);
      return ok;
    }

    function close(name) {
      modal.style.display = 'none';
      confirm.removeEventListener('click',  onConfirm);
      cancel.removeEventListener('click',   onCancel);
      input.removeEventListener('input',    validate);
      input.removeEventListener('keydown',  onKey);
      resolve(name);
    }
    function onConfirm() { if (validate()) close(input.value.trim()); }
    function onCancel()  { close(null); }
    function onKey(e) {
      if (e.key === 'Enter')  { e.preventDefault(); if (validate()) close(input.value.trim()); }
      if (e.key === 'Escape') { e.preventDefault(); close(null); }
    }

    confirm.addEventListener('click',  onConfirm);
    cancel.addEventListener('click',   onCancel);
    input.addEventListener('input',    validate);
    input.addEventListener('keydown',  onKey);
  });
}
